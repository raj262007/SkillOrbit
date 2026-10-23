"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";

type Admission = {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string;
  domain: string;
  branch: string;
  year: string;
  enrollment_no: string;
  status: "pending" | "selected" | "rejected";
  created_at: string;
  reason: string;
  address: string;
  parent_mobile: string;
};

const API = API_BASE;

export default function AdminDashboard() {
  const router = useRouter();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Admission | null>(null);
  const [plan, setPlan] = useState<"pro" | "career_pro">("pro");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "selected" | "rejected">("all");

  function getToken() {
    return localStorage.getItem("admin_token") || "";
  }

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function fetchAdmissions() {
    try {
      const res = await fetch(`${API}/admin/admissions`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 401 || res.status === 403) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      setAdmissions(data.admissions || []);
    } catch {
      showToast("Failed to fetch admissions", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect() {
    if (!selected) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/admin/select`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ admission_id: selected.id, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      showToast(`✅ ${selected.full_name} selected! Email sent.`, "success");
      setSelected(null);
      fetchAdmissions();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(admission: Admission) {
    if (!confirm(`Reject ${admission.full_name}?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/admin/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ admission_id: admission.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      showToast(`❌ ${admission.full_name} rejected. Email sent.`, "success");
      fetchAdmissions();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setActionLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("admin_token");
    router.push("/admin/login");
  }

  useEffect(() => { fetchAdmissions(); }, []);

  const filtered = admissions.filter((a) => filter === "all" ? true : a.status === filter);
  const counts = {
    all: admissions.length,
    pending: admissions.filter((a) => a.status === "pending").length,
    selected: admissions.filter((a) => a.status === "selected").length,
    rejected: admissions.filter((a) => a.status === "rejected").length,
  };

  const statusColor = (status: string) => {
    if (status === "pending") return "bg-yellow-100 text-yellow-700";
    if (status === "selected") return "bg-green-100 text-green-700";
    if (status === "rejected") return "bg-red-100 text-red-700";
    return "";
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <span className="text-blue-600 font-bold text-lg">SkillOrbit</span>
          <span className="text-gray-400 text-sm">/ Admin Dashboard</span>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500 transition-colors">
          Logout →
        </button>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Applications", count: counts.all, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Pending", count: counts.pending, color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "Selected", count: counts.selected, color: "text-green-600", bg: "bg-green-50" },
            { label: "Rejected", count: counts.rejected, color: "text-red-600", bg: "bg-red-50" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-5`}>
              <div className={`text-3xl font-bold ${s.color}`}>{s.count}</div>
              <div className="text-gray-500 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["all", "pending", "selected", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"}`}
            >
              {f} ({counts[f]})
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading admissions...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No admissions found.</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Name", "Email", "Domain", "Branch / Year", "Status", "Applied On", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 font-medium text-gray-900">{a.full_name}</td>
                      <td className="px-4 py-4 text-gray-500">{a.email}</td>
                      <td className="px-4 py-4">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">{a.domain}</span>
                      </td>
                      <td className="px-4 py-4 text-gray-500">{a.branch} · {a.year}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColor(a.status)}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-400 text-xs">
                        {new Date(a.created_at).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelected(a)}
                            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            View
                          </button>
                          {a.status === "pending" && (
                            <button
                              onClick={() => handleReject(a)}
                              disabled={actionLoading}
                              className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-gray-900 text-lg">{selected.full_name}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              {[
                { label: "Email", value: selected.email },
                { label: "WhatsApp", value: selected.whatsapp },
                { label: "Enrollment No", value: selected.enrollment_no },
                { label: "Branch", value: selected.branch },
                { label: "Year", value: selected.year },
                { label: "Domain", value: selected.domain },
                { label: "Address", value: selected.address },
                { label: "Parent Mobile", value: selected.parent_mobile },
              ].map((f) => (
                <div key={f.label} className="flex gap-2">
                  <span className="text-gray-400 w-32 shrink-0">{f.label}:</span>
                  <span className="text-gray-900 font-medium">{f.value}</span>
                </div>
              ))}
              <div>
                <span className="text-gray-400">Reason:</span>
                <p className="text-gray-700 mt-1 bg-gray-50 rounded-lg p-3">{selected.reason}</p>
              </div>
            </div>

            {selected.status === "pending" && (
              <div className="p-6 border-t border-gray-100 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Plan</label>
                  <div className="flex gap-3">
                    {(["pro", "career_pro"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPlan(p)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${plan === p ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600"}`}
                      >
                        {p === "pro" ? "Pro (₹199)" : "Career Pro (₹399)"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSelect}
                    disabled={actionLoading}
                    className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? "Processing..." : "✅ Select & Send Email"}
                  </button>
                  <button
                    onClick={() => { handleReject(selected); setSelected(null); }}
                    disabled={actionLoading}
                    className="flex-1 border border-red-200 text-red-500 py-2.5 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            )}

            {selected.status !== "pending" && (
              <div className={`mx-6 mb-6 p-3 rounded-xl text-sm text-center font-medium ${statusColor(selected.status)}`}>
                This application is already {selected.status}.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}