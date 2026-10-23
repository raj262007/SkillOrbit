"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";

interface Phase {
  phase_number: number;
  phase_title: string;
  weeks_covered: string;
  status: "locked" | "unlocked" | "completed";
  lecture_watched: boolean;
  quiz_attempts: number;
  quiz_score: number | null;
  quiz_passed: boolean;
  project_1_submitted: boolean;
  project_2_submitted: boolean;
  projects_submitted_count?: number;
}

interface UserProfile {
  id?: string;
  full_name: string;
  email: string;
  domain: string;
  subscription_type?: string | null;
  enrollment_no?: string | null;
  branch?: string | null;
  year?: string | null;
  photo_url?: string | null;
  whatsapp?: string | null;
  status?: string | null;
  created_at?: string | null;
  is_preview_account?: boolean;
}

interface DashboardData {
  user: UserProfile;
  is_preview?: boolean;
  available_domains?: string[];
  total_phases: number;
  completed_phases: number;
  phases: Phase[];
}

interface Analytics {
  current_streak: number;
  longest_streak: number;
  total_quizzes_taken: number;
  average_quiz_score: number;
  total_challenges_solved: number;
  total_projects_submitted: number;
}

interface BadgeItem {
  id: string;
  title: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "diamond";
  category: string;
  description: string;
  unlocked: boolean;
  current_value: number;
  max_value: number;
  progress_percent: number;
}

interface BadgesResponse {
  unlocked_badges: BadgeItem[];
  locked_badges: BadgeItem[];
  total_badges: number;
  total_unlocked: number;
  primary_badge: BadgeItem | null;
  all_badges: BadgeItem[];
  stats: {
    total_xp: number;
    challenges_solved: number;
    quizzes_passed: number;
    perfect_quizzes: number;
    avg_quiz_score: number;
    projects_submitted: number;
    phases_completed: number;
    current_streak: number;
  };
}

const DOMAIN_ICONS: Record<string, string> = {
  "Full Stack Developer": "💻",
  "Python Developer": "🐍",
  "UI / UX Design": "🎨",
  "Data Science": "📊",
  "AI / ML Engineer": "🤖",
  "Cybersecurity": "🛡️",
  "Mobile App Developer": "📱",
};

export default function StudentDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [badgeData, setBadgeData] = useState<BadgesResponse | null>(null);
  const [selectedBadgeModal, setSelectedBadgeModal] = useState<BadgeItem | null>(null);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [switchingDomain, setSwitchingDomain] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function loadDashboard(targetDomain?: string) {
    const token = localStorage.getItem("student_token");
    if (!token) {
      router.push("/login");
      return;
    }

    const url = targetDomain
      ? `${API_BASE}/student/dashboard?domain=${encodeURIComponent(targetDomain)}`
      : `${API_BASE}/student/dashboard`;

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.detail || "Failed to load dashboard");
        setData(body);
        if (body.user?.domain) {
          setSelectedDomain(body.user.domain);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        setLoading(false);
        setSwitchingDomain(false);
      });
  }

  useEffect(() => {
    loadDashboard();

    const token = localStorage.getItem("student_token");
    if (token) {
      fetch(`${API_BASE}/student/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((body) => setAnalytics(body))
        .catch(() => {});

      fetch(`${API_BASE}/student/badges`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((b) => setBadgeData(b))
        .catch(() => {});
    }
  }, [router]);

  async function handleSwitchDomain(newDomain: string) {
    if (newDomain === selectedDomain || switchingDomain) return;
    setSwitchingDomain(true);
    setSelectedDomain(newDomain);
    const token = localStorage.getItem("student_token");
    try {
      await fetch(`${API_BASE}/student/switch-domain`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain: newDomain }),
      });
      loadDashboard(newDomain);
    } catch (e) {
      console.error("Failed to switch domain:", e);
      loadDashboard(newDomain);
    }
  }

  function handleLogout() {
    localStorage.removeItem("student_token");
    localStorage.removeItem("student_user");
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-medium text-slate-600">Loading your learning dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-6 py-5 max-w-md text-center shadow-sm">
          <p className="font-semibold mb-1">Failed to Load Dashboard</p>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalPhases = data.total_phases || data.phases.length || 1;
  const completedPhases = data.completed_phases || 0;
  const progressPercent = Math.min(100, Math.round((completedPhases / totalPhases) * 100)) || 0;

  const initials = data.user.full_name
    ? data.user.full_name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join("")
    : "ST";

  const domainIcon = DOMAIN_ICONS[data.user.domain] || "🚀";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Top Navigation */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-100">
              PF
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-slate-900 text-base">PathForge</span>
              <span className="text-indigo-600 font-extrabold text-base ml-1">AI</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => router.push("/dashboard/leaderboard")}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-lg transition-all flex items-center gap-1.5"
            >
              <span>🏆</span>
              <span className="hidden sm:inline">Leaderboard</span>
            </button>
            <button
              onClick={() => router.push("/dashboard/flashcards")}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-lg transition-all flex items-center gap-1.5"
            >
              <span>🗂️</span>
              <span className="hidden sm:inline">Flashcards</span>
            </button>

            {analytics && analytics.current_streak > 0 && (
              <span className="hidden md:inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-full">
                🔥 {analytics.current_streak} Day Streak
              </span>
            )}

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* MASTER TESTER DOMAIN SWITCHER (Shown for Preview / Tester Accounts) */}
        {(data.is_preview || data.user.is_preview_account) && (
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-indigo-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="inline-flex items-center gap-2 bg-indigo-500/30 text-indigo-200 text-xs font-semibold px-2.5 py-1 rounded-md border border-indigo-400/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Testing Master Mode — All Domains, Videos & Quizzes Unlocked
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mt-1.5">
                  Select Domain to Test
                </h3>
                <p className="text-xs text-indigo-200/90">
                  Click any domain below to immediately test its full weekly roadmap, lectures, quizzes, and project challenges.
                </p>
              </div>
              {switchingDomain && (
                <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-950/80 px-3 py-1.5 rounded-lg border border-indigo-700/50 self-start sm:self-auto">
                  <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  Switching domain...
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {[
                { name: "Full Stack Developer", icon: "💻", badge: "10 Phases" },
                { name: "Python Developer", icon: "🐍", badge: "7 Phases" },
                { name: "UI / UX Design", icon: "🎨", badge: "6 Phases" },
                { name: "Data Science", icon: "📊", badge: "8 Phases" },
              ].map((d) => {
                const isActive = (selectedDomain || data.user.domain) === d.name;
                return (
                  <button
                    key={d.name}
                    onClick={() => handleSwitchDomain(d.name)}
                    disabled={switchingDomain}
                    className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl text-left transition-all font-medium text-xs sm:text-sm ${
                      isActive
                        ? "bg-white text-slate-950 font-bold shadow-md ring-2 ring-indigo-400 scale-[1.01]"
                        : "bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <span className="text-lg sm:text-xl flex-shrink-0">{d.icon}</span>
                      <span className="truncate">{d.name}</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ml-1 ${
                        isActive
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-white/10 text-indigo-200"
                      }`}
                    >
                      {isActive ? "✓ Active" : d.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STUDENT PROFILE & DOMAIN PROGRESS HERO CARD */}
        <section className="bg-gradient-to-br from-white via-indigo-50/20 to-white border border-indigo-100/80 rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -z-0 pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left: Student Profile Info */}
            <div className="lg:col-span-7 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Avatar */}
              <div className="relative">
                {data.user.photo_url ? (
                  <img
                    src={data.user.photo_url}
                    alt={data.user.full_name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-200 shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center text-2xl font-black shadow-md shadow-indigo-200">
                    {initials}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[10px]">
                  ✓
                </div>
              </div>

              {/* Student Details */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {data.user.full_name}
                  </h1>
                  {badgeData?.primary_badge && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-300 text-amber-800 shadow-xs">
                      <span>{badgeData.primary_badge.icon}</span>
                      <span>{badgeData.primary_badge.title}</span>
                    </span>
                  )}
                  {data.user.subscription_type && (
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                      {data.user.subscription_type}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-500">{data.user.email}</p>

                {/* Selected Domain Highlight */}
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow-sm shadow-indigo-200">
                    <span>{domainIcon}</span>
                    <span>Enrolled Domain: {data.user.domain}</span>
                  </div>

                  {(data.user.branch || data.user.year) && (
                    <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {data.user.branch} {data.user.year ? `• Year ${data.user.year}` : ""}
                    </span>
                  )}

                  {data.user.enrollment_no && (
                    <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                      Roll: {data.user.enrollment_no}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Domain Completion Gauge & Percentage */}
            <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Domain Completion
                </span>
                <span className="text-2xl font-black text-indigo-600">{progressPercent}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>
                  <strong>{completedPhases}</strong> of <strong>{totalPhases}</strong> phases completed
                </span>
                <span className="text-indigo-600 font-semibold">
                  {totalPhases - completedPhases === 0
                    ? "🎉 All Done!"
                    : `${totalPhases - completedPhases} phases remaining`}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* STATS OVERVIEW */}
        {analytics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-xs">
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
                🔥 {analytics.longest_streak || 0}d
              </div>
              <div className="text-xs text-slate-500 mt-0.5 font-medium">Longest Streak</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-xs">
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {analytics.average_quiz_score ? `${analytics.average_quiz_score}%` : "—"}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 font-medium">Avg Quiz Score</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-xs">
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
                ⚡ {analytics.total_challenges_solved || 0}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 font-medium">Practice Solved</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-xs">
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
                💻 {analytics.total_projects_submitted || 0}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 font-medium">Projects Built</div>
            </div>
          </div>
        )}

        {/* TROPHY CABINET & BADGES SECTION */}
        {badgeData && (
          <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-white flex items-center justify-center text-xl shadow-md shadow-amber-100">
                  🎖️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">Trophy Cabinet & Badges</h2>
                    <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                      {badgeData.total_unlocked} / {badgeData.total_badges} Unlocked
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Earn badges across Practice Challenges, Quizzes, Projects, and Daily Streaks.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Total XP</span>
                  <span className="text-sm font-black text-indigo-600">⚡ {badgeData.stats?.total_xp || 0} XP</span>
                </div>
                <button
                  onClick={() => router.push("/dashboard/leaderboard")}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <span>🏆</span>
                  <span>Leaderboard</span>
                </button>
              </div>
            </div>

            {/* BADGES DISPLAY */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
              {(showAllBadges ? badgeData.all_badges : badgeData.all_badges.slice(0, 6)).map((b) => {
                const tierColor = {
                  bronze: "from-amber-100/60 to-orange-50 border-amber-300 text-amber-900",
                  silver: "from-slate-100 to-slate-200 border-slate-300 text-slate-800",
                  gold: "from-yellow-100/70 to-amber-100 border-yellow-400 text-yellow-900",
                  diamond: "from-cyan-100/70 to-blue-100 border-cyan-400 text-cyan-900",
                }[b.tier] || "border-slate-200";

                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBadgeModal(b)}
                    className={`cursor-pointer rounded-xl p-3 border transition-all text-center flex flex-col items-center justify-between gap-1.5 ${
                      b.unlocked
                        ? `bg-gradient-to-b ${tierColor} shadow-xs hover:scale-105 hover:shadow-md`
                        : "bg-slate-50/70 border-slate-200 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="relative">
                      <span className={`text-3xl block ${!b.unlocked ? "grayscale" : ""}`}>
                        {b.icon}
                      </span>
                      {!b.unlocked && (
                        <span className="absolute -bottom-1 -right-1 text-[11px]">🔒</span>
                      )}
                    </div>
                    <div className="w-full">
                      <div className="text-xs font-bold text-slate-900 truncate">{b.title}</div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                        {b.unlocked ? `${b.tier}` : `${b.current_value}/${b.max_value}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show all / collapse button */}
            {badgeData.all_badges.length > 6 && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setShowAllBadges(!showAllBadges)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  {showAllBadges
                    ? "Show Less ↑"
                    : `View All ${badgeData.all_badges.length} Badges (${badgeData.all_badges.length - 6} more) ↓`}
                </button>
              </div>
            )}
          </section>
        )}

        {/* BADGE DETAIL MODAL */}
        {selectedBadgeModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => setSelectedBadgeModal(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-sm font-bold w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>

              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-100 via-indigo-50 to-slate-100 mx-auto flex items-center justify-center text-4xl shadow-inner border border-slate-200">
                {selectedBadgeModal.icon}
              </div>

              <div>
                <span className={`text-[10px] uppercase tracking-wider font-black px-2.5 py-0.5 rounded-full border ${
                  selectedBadgeModal.unlocked
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}>
                  {selectedBadgeModal.unlocked ? "✅ Unlocked" : "🔒 In Progress"} • {selectedBadgeModal.tier.toUpperCase()} TIER
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2">{selectedBadgeModal.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{selectedBadgeModal.description}</p>
              </div>

              {/* Progress bar */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-left">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">Requirement Progress</span>
                  <span className="text-indigo-600">
                    {selectedBadgeModal.current_value} / {selectedBadgeModal.max_value}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 rounded-full transition-all"
                    style={{ width: `${selectedBadgeModal.progress_percent}%` }}
                  />
                </div>
              </div>

              <button
                onClick={() => setSelectedBadgeModal(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-semibold text-xs transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}

        {/* ROADMAP / WEEKLY PHASES */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Curriculum Roadmap — {data.user.domain}
              </h2>
              <p className="text-xs text-slate-500">
                Complete each week in sequence: Watch Lecture ➔ Solve Practice Code ➔ Pass 20-MCQ Quiz (75%) ➔ Build Project
              </p>
            </div>
            <span className="text-xs bg-slate-100 font-semibold text-slate-600 px-3 py-1 rounded-full border border-slate-200">
              {data.phases.length} Phases Total
            </span>
          </div>

          <div className="space-y-3">
            {data.phases.map((phase) => (
              <PhaseCard
                key={phase.phase_number}
                phase={phase}
                currentDomain={selectedDomain || data.user.domain}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function PhaseCard({ phase, currentDomain }: { phase: Phase; currentDomain?: string }) {
  const router = useRouter();
  const isLocked = phase.status === "locked";
  const isCompleted = phase.status === "completed";

  const statusConfig = {
    locked: {
      icon: "🔒",
      label: "Locked",
      badgeClass: "bg-slate-100 text-slate-500 border border-slate-200",
      btnClass: "bg-slate-100 text-slate-400 cursor-not-allowed",
      btnText: "Locked",
    },
    unlocked: {
      icon: "⚡",
      label: "In Progress",
      badgeClass: "bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold",
      btnClass: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-100",
      btnText: "Continue Phase →",
    },
    completed: {
      icon: "✅",
      label: "Completed",
      badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold",
      btnClass: "bg-slate-100 hover:bg-slate-200 text-slate-700",
      btnText: "Review Phase",
    },
  }[phase.status];

  return (
    <div
      onClick={() => {
        if (!isLocked) {
          const targetUrl = currentDomain
            ? `/dashboard/phase/${phase.phase_number}?domain=${encodeURIComponent(currentDomain)}`
            : `/dashboard/phase/${phase.phase_number}`;
          router.push(targetUrl);
        }
      }}
      className={`bg-white border rounded-xl p-5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        isLocked
          ? "border-slate-200 opacity-60 cursor-not-allowed"
          : "border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer"
      }`}
    >
      <div className="flex items-start sm:items-center gap-4">
        {/* Phase Number Circle */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0 ${
            isCompleted
              ? "bg-emerald-100 text-emerald-700"
              : isLocked
              ? "bg-slate-100 text-slate-400"
              : "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
          }`}
        >
          {isLocked ? "🔒" : phase.phase_number}
        </div>

        {/* Phase Title & Week Schedule */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {phase.weeks_covered || `Phase ${phase.phase_number}`}
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusConfig.badgeClass}`}>
              {statusConfig.icon} {statusConfig.label}
            </span>
          </div>

          <h3 className="font-bold text-slate-900 text-base">
            {phase.phase_title}
          </h3>

          {/* Sub-steps Indicator */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-1">
            <span className={`flex items-center gap-1 ${phase.lecture_watched ? "text-emerald-600 font-medium" : ""}`}>
              📺 {phase.lecture_watched ? "Lecture Watched ✓" : "Curated Lecture"}
            </span>
            <span>•</span>
            <span className={`flex items-center gap-1 ${phase.quiz_passed ? "text-emerald-600 font-medium" : ""}`}>
              📝 {phase.quiz_passed ? `Quiz Passed (${phase.quiz_score}%) ✓` : "20-MCQ Quiz (75% to Pass)"}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              💻 Hands-on Project
            </span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="w-full sm:w-auto flex items-center justify-end">
        <button
          disabled={isLocked}
          className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold transition-all ${statusConfig.btnClass}`}
        >
          {statusConfig.btnText}
        </button>
      </div>
    </div>
  );
}