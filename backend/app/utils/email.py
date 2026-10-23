import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv


def _load_environment() -> None:
    current_dir = os.path.dirname(__file__)
    candidate_paths = [
        os.path.abspath(os.path.join(current_dir, "..", "..", ".env")),  # backend/.env
        os.path.abspath(os.path.join(current_dir, "..", "..", "..", ".env")),  # workspace root .env
        os.path.abspath(os.path.join(os.getcwd(), ".env")),
    ]

    for path in candidate_paths:
        if os.path.exists(path):
            load_dotenv(path, override=False)


_load_environment()

GMAIL_USER = os.environ.get("GMAIL_USER", "").strip()
GMAIL_PASSWORD = (os.environ.get("GMAIL_APP_PASSWORD") or os.environ.get("GMAIL_PASSWORD", "")).replace(" ", "").strip()
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    if not GMAIL_USER or not GMAIL_PASSWORD:
        print("[Email Error] Gmail credentials are not configured.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"SkillOrbit <{GMAIL_USER}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[Email Error] {e}")
        return False


def send_selection_email(to_email: str, full_name: str, plan: str, password: str, domain: str = "") -> bool:
    plan_display = "Career Pro" if plan == "career_pro" else "Pro"
    login_link = f"{FRONTEND_URL}/smart-career-path"

    html_body = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * {{ margin:0; padding:0; box-sizing:border-box; }}
    body {{ font-family:'Segoe UI',Arial,sans-serif; background:#f0f4ff; color:#1e293b; }}
    .wrapper {{ max-width:620px; margin:40px auto; background:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 8px 40px rgba(59,130,246,0.15); }}
    .header {{ background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 50%,#3b82f6 100%); padding:48px 32px 40px; text-align:center; }}
    .header-logo {{ font-size:13px; font-weight:800; color:#93c5fd; letter-spacing:2px; text-transform:uppercase; margin-bottom:16px; }}
    .header h1 {{ color:#ffffff; font-size:30px; font-weight:800; line-height:1.2; margin-bottom:8px; }}
    .header p {{ color:#bfdbfe; font-size:15px; }}
    .badge {{ display:inline-block; background:#fbbf24; color:#78350f; font-size:11px; font-weight:800; padding:5px 16px; border-radius:50px; margin-top:18px; text-transform:uppercase; letter-spacing:1px; }}
    .confetti {{ font-size:40px; margin-bottom:12px; }}
    .body {{ padding:40px 36px; }}
    .greeting {{ font-size:20px; font-weight:700; color:#1e293b; margin-bottom:12px; }}
    .message {{ font-size:15px; color:#475569; line-height:1.8; margin-bottom:28px; }}
    .cred-box {{ background:linear-gradient(135deg,#eff6ff,#dbeafe); border:2px solid #bfdbfe; border-radius:16px; padding:24px 28px; margin-bottom:28px; }}
    .cred-title {{ font-size:12px; font-weight:800; color:#2563eb; text-transform:uppercase; letter-spacing:1.2px; margin-bottom:18px; }}
    .cred-row {{ display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #bfdbfe; }}
    .cred-row:last-child {{ border-bottom:none; }}
    .cred-label {{ font-size:13px; color:#64748b; font-weight:500; }}
    .cred-value {{ font-size:13px; color:#1e293b; font-weight:700; font-family:'Courier New',monospace; background:#fff; padding:5px 12px; border-radius:8px; border:1px solid #bfdbfe; }}
    .steps-box {{ background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:24px 28px; margin-bottom:28px; }}
    .steps-title {{ font-size:12px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:1.2px; margin-bottom:18px; }}
    .step {{ display:flex; gap:14px; align-items:flex-start; margin-bottom:16px; }}
    .step:last-child {{ margin-bottom:0; }}
    .step-num {{ background:#2563eb; color:#fff; font-size:12px; font-weight:800; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }}
    .step-text {{ font-size:14px; color:#334155; line-height:1.6; }}
    .step-text strong {{ color:#1e293b; }}
    .warn-box {{ background:#fffbeb; border:1.5px solid #fcd34d; border-radius:12px; padding:16px 20px; margin-bottom:28px; font-size:13px; color:#92400e; line-height:1.6; }}
    .btn-wrapper {{ text-align:center; margin-bottom:32px; }}
    .btn {{ display:inline-block; background:linear-gradient(135deg,#1d4ed8,#3b82f6); color:#ffffff !important; text-decoration:none; padding:16px 44px; border-radius:12px; font-size:16px; font-weight:700; box-shadow:0 4px 16px rgba(37,99,235,0.35); }}
    .divider {{ height:1px; background:#e2e8f0; margin:0 0 28px; }}
    .founder-box {{ background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:20px 24px; margin-bottom:28px; display:flex; gap:16px; align-items:center; }}
    .founder-avatar {{ width:52px; height:52px; background:linear-gradient(135deg,#1d4ed8,#3b82f6); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:22px; font-weight:800; flex-shrink:0; }}
    .founder-name {{ font-size:15px; font-weight:700; color:#1e293b; margin-bottom:2px; }}
    .founder-role {{ font-size:12px; color:#64748b; margin-bottom:6px; }}
    .founder-contact {{ font-size:13px; color:#2563eb; font-weight:600; }}
    .footer {{ background:#1e293b; padding:28px 32px; text-align:center; }}
    .footer-logo {{ color:#fff; font-weight:800; font-size:16px; margin-bottom:6px; }}
    .footer p {{ font-size:12px; color:#94a3b8; line-height:1.8; }}
    .footer a {{ color:#60a5fa; text-decoration:none; }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">✦ SkillOrbit</div>
      <div class="confetti">🎉</div>
      <h1>Congratulations!<br/>You're Selected!</h1>
      <p>Welcome to the SkillOrbit Beta Program</p>
      <span class="badge">✦ {plan_display} Plan — 6 Months Access</span>
    </div>
    <div class="body">
      <p class="greeting">Hello, {full_name}! 👋</p>
      <p class="message">
        We are thrilled to inform you that your application to <strong>SkillOrbit</strong> has been
        <strong>approved!</strong> Out of many applicants, you have been selected for our
        <strong>{plan_display} Plan</strong> in the <strong>{domain}</strong> domain. Your AI-powered career journey starts now. 🚀
      </p>
      <div class="cred-box">
        <div class="cred-title">🔐 Your Login Credentials</div>
        <div class="cred-row">
          <span class="cred-label">Username (Email)</span>
          <span class="cred-value">{to_email}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Password</span>
          <span class="cred-value">{password}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Plan</span>
          <span class="cred-value">{plan_display}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Domain</span>
          <span class="cred-value">{domain}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Valid Until</span>
          <span class="cred-value">6 Months from today</span>
        </div>
      </div>
      <div class="steps-box">
        <div class="steps-title">📋 How to Login — Step by Step</div>
        <div class="step">
          <div class="step-num">1</div>
          <div class="step-text">Visit <strong>{login_link}</strong> in your browser</div>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <div class="step-text">Click on <strong>"Login to Dashboard"</strong> button</div>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <div class="step-text">Enter your <strong>Email</strong> and the <strong>Password</strong> given above</div>
        </div>
        <div class="step">
          <div class="step-num">4</div>
          <div class="step-text">You will be taken to your <strong>Personal Dashboard</strong> — start your Week 1!</div>
        </div>
        <div class="step">
          <div class="step-num">5</div>
          <div class="step-text">Change your password from <strong>Settings</strong> after first login</div>
        </div>
      </div>
      <div class="warn-box">
        🔒 <strong>Security Notice:</strong> Your password is strictly confidential.
        <strong>Never share it with anyone</strong> — not even with SkillOrbit team members.
        We will <strong>never</strong> ask for your password. If anyone asks, report it immediately.
      </div>
      <div class="btn-wrapper">
        <a href="{login_link}" class="btn">🚀 Go to Dashboard →</a>
      </div>
      <div class="divider"></div>
      <div class="founder-box">
        <div class="founder-avatar">P</div>
        <div>
          <div class="founder-name">Pawan Singh</div>
          <div class="founder-role">Founder & CEO — SkillOrbit</div>
          <div class="founder-contact">📞 +91 7801924560 &nbsp;|&nbsp; 💬 WhatsApp Available</div>
        </div>
      </div>
      <p class="message" style="text-align:center; color:#64748b; font-size:14px;">
        Excited to have you on board! Work hard every week —<br/>
        lectures → quiz → projects → <strong>job ready!</strong> 💪
      </p>
    </div>
    <div class="footer">
      <div class="footer-logo">SkillOrbit</div>
      <p>
        You received this email because you applied to SkillOrbit Beta Program.<br/>
        © 2026 SkillOrbit. All rights reserved.<br/>
        <a href="mailto:pawans1626@gmail.com">pawans1626@gmail.com</a>
      </p>
    </div>
  </div>
</body>
</html>
"""
    return send_email(to_email, "🎉 Congratulations! You are Selected for SkillOrbit", html_body)


def send_rejection_email(to_email: str, full_name: str) -> bool:
    subscription_link = f"{FRONTEND_URL}/#pricing"
    whatsapp_number = os.environ.get("WHATSAPP_NUMBER", "")

    html_body = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * {{ margin:0; padding:0; box-sizing:border-box; }}
    body {{ font-family:'Segoe UI',Arial,sans-serif; background:#f8fafc; color:#1e293b; }}
    .wrapper {{ max-width:620px; margin:40px auto; background:#fff; border-radius:20px; overflow:hidden; box-shadow:0 8px 40px rgba(0,0,0,0.10); }}
    .header {{ background:linear-gradient(135deg,#1e293b 0%,#334155 100%); padding:48px 32px 40px; text-align:center; }}
    .header-logo {{ font-size:13px; font-weight:800; color:#94a3b8; letter-spacing:2px; text-transform:uppercase; margin-bottom:16px; }}
    .header h1 {{ color:#fff; font-size:26px; font-weight:800; margin-bottom:8px; }}
    .header p {{ color:#94a3b8; font-size:14px; }}
    .body {{ padding:40px 36px; }}
    .greeting {{ font-size:20px; font-weight:700; color:#1e293b; margin-bottom:12px; }}
    .message {{ font-size:15px; color:#475569; line-height:1.8; margin-bottom:24px; }}
    .coupon {{ background:linear-gradient(135deg,#eff6ff,#dbeafe); border:2px dashed #3b82f6; border-radius:16px; padding:32px; text-align:center; margin-bottom:28px; }}
    .coupon p {{ font-size:14px; color:#475569; margin-bottom:12px; }}
    .coupon-code {{ font-size:36px; font-weight:900; color:#1d4ed8; letter-spacing:4px; font-family:'Courier New',monospace; }}
    .coupon-label {{ font-size:13px; color:#64748b; margin-top:10px; }}
    .btn-wrapper {{ text-align:center; margin-bottom:32px; }}
    .btn {{ display:inline-block; background:linear-gradient(135deg,#1d4ed8,#3b82f6); color:#ffffff !important; text-decoration:none; padding:16px 44px; border-radius:12px; font-size:16px; font-weight:700; box-shadow:0 4px 16px rgba(37,99,235,0.35); }}
    .divider {{ height:1px; background:#e2e8f0; margin:0 0 28px; }}
    .founder-box {{ background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:20px 24px; margin-bottom:28px; display:flex; gap:16px; align-items:center; }}
    .founder-avatar {{ width:52px; height:52px; background:linear-gradient(135deg,#1d4ed8,#3b82f6); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:22px; font-weight:800; flex-shrink:0; }}
    .founder-name {{ font-size:15px; font-weight:700; color:#1e293b; margin-bottom:2px; }}
    .founder-role {{ font-size:12px; color:#64748b; margin-bottom:6px; }}
    .founder-contact {{ font-size:13px; color:#2563eb; font-weight:600; }}
    .footer {{ background:#1e293b; padding:28px 32px; text-align:center; }}
    .footer-logo {{ color:#fff; font-weight:800; font-size:16px; margin-bottom:6px; }}
    .footer p {{ font-size:12px; color:#94a3b8; line-height:1.8; }}
    .footer a {{ color:#60a5fa; text-decoration:none; }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">✦ SkillOrbit</div>
      <h1>Application Status Update</h1>
      <p>Thank you for applying to SkillOrbit</p>
    </div>
    <div class="body">
      <p class="greeting">Hi {full_name}, 👋</p>
      <p class="message">
        Thank you for applying to the <strong>SkillOrbit Beta Program</strong>.
        We truly appreciate your interest and the effort you put into your application.
      </p>
      <p class="message">
        After carefully reviewing all applications, we regret to inform you that we could not offer
        you a free seat in this cohort. This does <strong>not</strong> reflect your potential —
        the selection was highly competitive and seats were very limited.
      </p>
      <p class="message" style="font-weight:700; color:#1e293b;">
        But your journey doesn't have to stop here! 🚀
      </p>
      <div class="coupon">
        <p>As a thank-you for applying, here is an exclusive offer just for you</p>
        <div class="coupon-code">LAUNCH50</div>
        <p class="coupon-label">🎁 50% OFF on any SkillOrbit paid plan — limited time only</p>
      </div>
      <div class="btn-wrapper">
        <a href="{subscription_link}" class="btn">🔓 Claim 50% Off →</a>
      </div>
      <div class="divider"></div>
      <div class="founder-box">
        <div class="founder-avatar">P</div>
        <div>
          <div class="founder-name">Pawan Singh</div>
          <div class="founder-role">Founder & CEO — SkillOrbit</div>
          <div class="founder-contact">📞 +91 7801924560 &nbsp;|&nbsp; 💬 WhatsApp Available</div>
        </div>
      </div>
      <p class="message" style="text-align:center; color:#64748b; font-size:14px;">
        Use code <strong>LAUNCH50</strong> at checkout.<br/>
        We hope to see you inside SkillOrbit very soon! 💪
      </p>
    </div>
    <div class="footer">
      <div class="footer-logo">SkillOrbit</div>
      <p>
        You received this email because you applied to SkillOrbit Beta Program.<br/>
        © 2026 SkillOrbit. All rights reserved.<br/>
        <a href="mailto:pawans1626@gmail.com">pawans1626@gmail.com</a>
      </p>
    </div>
  </div>
</body>
</html>
"""
    return send_email(to_email, "SkillOrbit — Application Status Update", html_body)