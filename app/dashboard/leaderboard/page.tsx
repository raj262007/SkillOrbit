"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";

interface BadgeItem {
  id: string;
  title: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "diamond";
  description: string;
}

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  domain: string;
  photo_url?: string | null;
  total_xp: number;
  challenges_solved: number;
  quizzes_passed: number;
  perfect_quizzes: number;
  avg_quiz_score: number;
  projects_submitted: number;
  phases_completed: number;
  current_streak: number;
  rank: number;
  primary_badge?: BadgeItem | null;
  badges_count?: number;
  top_badges?: BadgeItem[];
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  your_stats: LeaderboardEntry | null;
  domain: string;
  category: string;
  total_students: number;
  available_domains: string[];
  available_categories: string[];
}

function authHeaders() {
  const token = localStorage.getItem("student_token");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  bronze: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-300" },
  silver: { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-300" },
  gold: { bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-400" },
  diamond: { bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-400" },
};

const CATEGORIES = [
  { id: "overall", label: "⭐ Overall XP", desc: "Combined XP across all learning activities" },
  { id: "challenges", label: "🧩 Challenges", desc: "Most coding practice challenges solved" },
  { id: "quiz", label: "🎯 Quiz Titans", desc: "Highest quiz accuracy and pass percentage" },
  { id: "projects", label: "🚀 Projects Built", desc: "Most real-world verified projects submitted" },
  { id: "streaks", label: "🔥 Streaks", desc: "Longest consecutive daily learning streaks" },
  { id: "phases", label: "🏆 Phases Completed", desc: "Most weekly roadmap phases finished" },
];

const DOMAINS = [
  { id: "All", label: "🌐 All Domains" },
  { id: "Full Stack Developer", label: "💻 Full Stack" },
  { id: "Python Developer", label: "🐍 Python Dev" },
  { id: "UI / UX Design", label: "🎨 UI / UX" },
  { id: "Data Science", label: "📊 Data Science" },
];

export default function LeaderboardPage() {
  const router = useRouter();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("overall");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");

  function loadLeaderboard(d = selectedDomain, c = selectedCategory) {
    setLoading(true);
    const url = `${API_BASE}/student/leaderboard?domain=${encodeURIComponent(d)}&category=${encodeURIComponent(c)}`;
    fetch(url, { headers: authHeaders() })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.detail || "Failed to load leaderboard");
        setData(body);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const token = localStorage.getItem("student_token");
    if (!token) {
      router.push("/login");
      return;
    }

    const storedUser = localStorage.getItem("student_user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUserId(parsed.id || "");
      } catch {}
    }

    loadLeaderboard("All", "overall");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function handleDomainChange(newDomain: string) {
    setSelectedDomain(newDomain);
    loadLeaderboard(newDomain, selectedCategory);
  }

  function handleCategoryChange(newCategory: string) {
    setSelectedCategory(newCategory);
    loadLeaderboard(selectedDomain, newCategory);
  }

  const topThree = (data?.leaderboard || []).slice(0, 3);
  const restList = (data?.leaderboard || []).slice(3);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-16">
      {/* Top Navbar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-indigo-100">
              🏆
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-slate-900 text-base">SkillOrbit</span>
              <span className="text-indigo-600 font-extrabold text-base ml-1">Arena</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-xs sm:text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* HERO TITLE */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-semibold border border-indigo-400/30 mb-3">
              👑 Hall of Fame & Badges
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Student Leaderboard & Rankings
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200/90 mt-1.5 leading-relaxed">
              Earn XP by solving practice challenges, scoring 100% on quizzes, submitting verified projects, and maintaining daily study streaks.
            </p>
          </div>

          {/* Current User Quick Stats Bar */}
          {data?.your_stats && (
            <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-inner">
                  #{data.your_stats.rank}
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    {data.your_stats.full_name}
                    <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-md font-semibold">You</span>
                  </div>
                  <div className="text-xs text-indigo-200">
                    {data.your_stats.domain} • Rank #{data.your_stats.rank} of {data.total_students}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-indigo-300 font-medium">Your Total XP</div>
                  <div className="text-lg font-black text-amber-400">⚡ {data.your_stats.total_xp} XP</div>
                </div>
                {data.your_stats.primary_badge && (
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
                    <span className="text-xl">{data.your_stats.primary_badge.icon}</span>
                    <div className="text-left">
                      <div className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold">Top Badge</div>
                      <div className="text-xs font-bold text-white">{data.your_stats.primary_badge.title}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* DOMAIN TABS */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {DOMAINS.map((d) => {
            const isActive = selectedDomain === d.id;
            return (
              <button
                key={d.id}
                onClick={() => handleDomainChange(d.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>

        {/* CATEGORY FILTER PILLS */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 flex gap-2 overflow-x-auto">
          {CATEGORIES.map((c) => {
            const isActive = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => handleCategoryChange(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-500">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="font-medium text-sm">Calculating rankings & badges...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-6 text-center">
            {error}
          </div>
        ) : data?.leaderboard.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400">
            <span className="text-4xl block mb-2">🌱</span>
            <p className="font-medium">No students ranked in this category yet.</p>
            <p className="text-xs text-slate-400 mt-1">Start solving challenges or taking quizzes to claim the #1 spot!</p>
          </div>
        ) : (
          <>
            {/* TOP 3 PODIUM */}
            {topThree.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                {/* 2nd Place */}
                {topThree[1] && (
                  <div className="order-2 md:order-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col items-center text-center relative mt-0 md:mt-4">
                    <span className="absolute -top-3.5 bg-slate-200 text-slate-700 text-xs font-bold px-3 py-0.5 rounded-full border border-slate-300">
                      🥈 2nd Place
                    </span>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-400 text-slate-800 flex items-center justify-center text-2xl font-black mt-2 mb-3 shadow-inner">
                      {topThree[1].full_name.charAt(0)}
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">{topThree[1].full_name}</h3>
                    <p className="text-xs text-slate-400 mb-2">{topThree[1].domain}</p>

                    {topThree[1].primary_badge && (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${TIER_STYLES[topThree[1].primary_badge.tier]?.bg} ${TIER_STYLES[topThree[1].primary_badge.tier]?.text} ${TIER_STYLES[topThree[1].primary_badge.tier]?.border}`}>
                        {topThree[1].primary_badge.icon} {topThree[1].primary_badge.title}
                      </span>
                    )}

                    <div className="mt-4 pt-3 border-t border-slate-100 w-full flex items-center justify-around text-xs text-slate-500">
                      <div>
                        <span className="block font-black text-indigo-600 text-sm">⚡ {topThree[1].total_xp}</span>
                        Total XP
                      </div>
                      <div>
                        <span className="block font-black text-slate-800 text-sm">🧩 {topThree[1].challenges_solved}</span>
                        Solved
                      </div>
                    </div>
                  </div>
                )}

                {/* 1st Place (Champion) */}
                {topThree[0] && (
                  <div className="order-1 md:order-2 bg-gradient-to-b from-amber-50/50 via-white to-white border-2 border-amber-300 rounded-2xl p-6 shadow-md flex flex-col items-center text-center relative -translate-y-2">
                    <span className="absolute -top-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-xs font-black px-4 py-1 rounded-full shadow-sm flex items-center gap-1">
                      👑 1st Place Champion
                    </span>
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 flex items-center justify-center text-3xl font-black mt-3 mb-3 shadow-md shadow-amber-200">
                      {topThree[0].full_name.charAt(0)}
                    </div>
                    <h3 className="font-black text-slate-900 text-lg">{topThree[0].full_name}</h3>
                    <p className="text-xs text-indigo-600 font-semibold mb-2">{topThree[0].domain}</p>

                    {topThree[0].primary_badge && (
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-lg border ${TIER_STYLES[topThree[0].primary_badge.tier]?.bg} ${TIER_STYLES[topThree[0].primary_badge.tier]?.text} ${TIER_STYLES[topThree[0].primary_badge.tier]?.border}`}>
                        {topThree[0].primary_badge.icon} {topThree[0].primary_badge.title}
                      </span>
                    )}

                    <div className="mt-5 pt-3 border-t border-amber-100 w-full flex items-center justify-around text-xs text-slate-500">
                      <div>
                        <span className="block font-black text-amber-600 text-base">⚡ {topThree[0].total_xp}</span>
                        Total XP
                      </div>
                      <div>
                        <span className="block font-black text-slate-800 text-base">🧩 {topThree[0].challenges_solved}</span>
                        Solved
                      </div>
                      <div>
                        <span className="block font-black text-slate-800 text-base">🔥 {topThree[0].current_streak}d</span>
                        Streak
                      </div>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {topThree[2] && (
                  <div className="order-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col items-center text-center relative mt-0 md:mt-6">
                    <span className="absolute -top-3.5 bg-amber-100 text-amber-800 text-xs font-bold px-3 py-0.5 rounded-full border border-amber-200">
                      🥉 3rd Place
                    </span>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600/30 to-amber-700/40 text-amber-900 flex items-center justify-center text-2xl font-black mt-2 mb-3 shadow-inner">
                      {topThree[2].full_name.charAt(0)}
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">{topThree[2].full_name}</h3>
                    <p className="text-xs text-slate-400 mb-2">{topThree[2].domain}</p>

                    {topThree[2].primary_badge && (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${TIER_STYLES[topThree[2].primary_badge.tier]?.bg} ${TIER_STYLES[topThree[2].primary_badge.tier]?.text} ${TIER_STYLES[topThree[2].primary_badge.tier]?.border}`}>
                        {topThree[2].primary_badge.icon} {topThree[2].primary_badge.title}
                      </span>
                    )}

                    <div className="mt-4 pt-3 border-t border-slate-100 w-full flex items-center justify-around text-xs text-slate-500">
                      <div>
                        <span className="block font-black text-indigo-600 text-sm">⚡ {topThree[2].total_xp}</span>
                        Total XP
                      </div>
                      <div>
                        <span className="block font-black text-slate-800 text-sm">🧩 {topThree[2].challenges_solved}</span>
                        Solved
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FULL RANKINGS TABLE */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs mt-6">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">All Student Rankings</h3>
                  <p className="text-xs text-slate-500">
                    Showing {data?.leaderboard.length || 0} of {data?.total_students || 0} students
                  </p>
                </div>
                <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                  Sorting by: {CATEGORIES.find((c) => c.id === selectedCategory)?.label}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 text-slate-500 text-xs font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">Rank</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Domain</th>
                      <th className="py-3 px-4">Top Badge</th>
                      <th className="py-3 px-4 text-center">🧩 Solved</th>
                      <th className="py-3 px-4 text-center">🚀 Projects</th>
                      <th className="py-3 px-4 text-center">🔥 Streak</th>
                      <th className="py-3 px-4 text-right">⚡ Total XP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.leaderboard || []).map((entry) => {
                      const isYou = entry.user_id === currentUserId;
                      const badge = entry.primary_badge;
                      const tierStyle = badge ? TIER_STYLES[badge.tier] : null;

                      return (
                        <tr
                          key={entry.user_id}
                          className={`transition-colors ${
                            isYou
                              ? "bg-indigo-50/80 font-medium"
                              : "hover:bg-slate-50/60"
                          }`}
                        >
                          {/* Rank */}
                          <td className="py-3.5 px-4 text-center font-black text-slate-700">
                            {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                          </td>

                          {/* Student Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                                {entry.full_name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                  {entry.full_name}
                                  {isYou && (
                                    <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-bold">
                                      You
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Domain */}
                          <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                            {entry.domain}
                          </td>

                          {/* Top Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {badge && tierStyle ? (
                              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-semibold border ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border}`}>
                                <span>{badge.icon}</span>
                                <span>{badge.title}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>

                          {/* Challenges */}
                          <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                            {entry.challenges_solved}
                          </td>

                          {/* Projects */}
                          <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                            {entry.projects_submitted}
                          </td>

                          {/* Streak */}
                          <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                            {entry.current_streak > 0 ? `🔥 ${entry.current_streak}d` : "—"}
                          </td>

                          {/* XP */}
                          <td className="py-3.5 px-4 text-right font-black text-indigo-600 text-base">
                            {entry.total_xp}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* XP POINT RULES FOOTER CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-xs text-slate-500 space-y-2">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <span>ℹ️</span> How XP Points & Badges are Awarded
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-slate-600">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="block font-bold text-slate-900">+50 XP</span>
              Per practice challenge solved
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="block font-bold text-slate-900">+100 XP (+50 bonus)</span>
              Quiz pass (bonus for 100% score)
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="block font-bold text-slate-900">+200 XP</span>
              Per verified project submitted
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="block font-bold text-slate-900">+300 XP</span>
              Per weekly phase completed
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}