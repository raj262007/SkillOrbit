"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { API_BASE } from "@/lib/api";
import GatedYoutubePlayer from "@/components/shared/GatedYoutubePlayer";
interface Lecture {
  topic_title: string;
  video_url: string;
  notes_content?: string | null;
  start_time_seconds?: number;
  end_time_seconds?: number | null;
}

interface PhaseData {
  domain?: string;
  phase_number: number;
  phase_title: string;
  weeks_covered: string;
  lectures: Lecture[];
  video_notes: string | null;
  is_preview: boolean;
  lecture_watched: boolean;
  quiz: { attempts: number; score: number | null; passed: boolean };
  projects: {
    project_number: number;
    project_name: string;
    description: string;
    difficulty: string;
    submitted: boolean;
    your_github_link: string | null;
    solution_reference: string | null;
  }[];
  phase_completed: boolean;
}

interface QuizQuestion {
  id: string;
  type: "mcq" | "text";
  question_text: string;
  options?: { A: string; B: string; C: string; D: string };
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  starter_code: string | null;
  hint: string | null;
  solved: boolean;
  solution_code: string | null;
}

interface DiscussionMessage {
  id: string;
  user_id: string;
  parent_id: string | null;
  message: string;
  created_at: string;
  users?: { full_name: string } | null;
}

function getYoutubeId(url: string): string {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : "";
}

function authHeaders() {
  const token = localStorage.getItem("student_token");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export default function PhaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const phaseNumber = params.phaseNumber as string;

  const [data, setData] = useState<PhaseData | null>(null);
  const [domain, setDomain] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [markingWatched, setMarkingWatched] = useState(false);

  // Quiz state
  const [quizStarted, setQuizStarted] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean; correct_count: number; total_questions: number } | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);

  // Project submission state
  const [githubInputs, setGithubInputs] = useState<Record<number, string>>({});
  const [submittingProject, setSubmittingProject] = useState<number | null>(null);
  const [editingProject, setEditingProject] = useState<number | null>(null);
  const [deletingProject, setDeletingProject] = useState<number | null>(null);

  // Coding challenges state
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeCode, setChallengeCode] = useState<Record<string, string>>({});
  const [submittingChallenge, setSubmittingChallenge] = useState<string | null>(null);

  // Discussion state
  const [discussion, setDiscussion] = useState<DiscussionMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [postingMessage, setPostingMessage] = useState(false);

  function getActiveDomain(): string {
    if (typeof window !== "undefined") {
      const qd = new URLSearchParams(window.location.search).get("domain");
      if (qd) return qd;
    }
    return domain;
  }

  function loadPhase() {
    const token = localStorage.getItem("student_token");
    if (!token) {
      router.push("/login");
      return;
    }
    const currentDomain = getActiveDomain();
    const url = currentDomain
      ? `${API_BASE}/student/phase/${phaseNumber}?domain=${encodeURIComponent(currentDomain)}`
      : `${API_BASE}/student/phase/${phaseNumber}`;

    fetch(url, { headers: authHeaders() })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.detail || "Failed to load phase");
        setData(body);
        if (body.domain) setDomain(body.domain);
        setActiveVideoIndex(0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  function loadChallenges() {
    const currentDomain = getActiveDomain();
    const url = currentDomain
      ? `${API_BASE}/student/phase/${phaseNumber}/challenges?domain=${encodeURIComponent(currentDomain)}`
      : `${API_BASE}/student/phase/${phaseNumber}/challenges`;

    fetch(url, { headers: authHeaders() })
      .then((res) => res.json())
      .then((body) => setChallenges(body.challenges || []))
      .catch((err) => console.error(err));
  }

  function loadDiscussion() {
    fetch(`${API_BASE}/student/phase/${phaseNumber}/discussion`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((body) => setDiscussion(body.messages || []))
      .catch((err) => console.error(err));
  }

  useEffect(() => {
    loadPhase();
    loadChallenges();
    loadDiscussion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseNumber]);

  async function handleMarkWatched() {
    setMarkingWatched(true);
    try {
      const res = await fetch(`${API_BASE}/student/phase/${phaseNumber}/lecture-watched`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to update");
      loadPhase();
    } catch (err) {
      console.error(err);
    } finally {
      setMarkingWatched(false);
    }
  }

  async function handleStartQuiz() {
    setQuizLoading(true);
    setQuizResult(null);
    setQuizAnswers({});
    try {
      const currentDomain = getActiveDomain();
      const url = currentDomain
        ? `${API_BASE}/student/phase/${phaseNumber}/quiz?domain=${encodeURIComponent(currentDomain)}`
        : `${API_BASE}/student/phase/${phaseNumber}/quiz`;
      const res = await fetch(url, { headers: authHeaders() });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail || "Failed to load quiz");
      setQuestions(body.questions);
      setQuizStarted(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setQuizLoading(false);
    }
  }

  async function handleSubmitQuiz() {
    const unanswered = questions.filter((q) => !quizAnswers[q.id]?.trim());
    if (unanswered.length > 0) {
      if (!confirm(`${unanswered.length} question(s) unanswered. Submit anyway?`)) return;
    }
    setQuizLoading(true);
    try {
      const answers = questions.map((q) => ({ question_id: q.id, answer: quizAnswers[q.id] || "" }));
      const res = await fetch(`${API_BASE}/student/phase/${phaseNumber}/quiz/submit`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ answers }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail || "Failed to submit quiz");
      setQuizResult(body);
      setQuizStarted(false);
      loadPhase();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setQuizLoading(false);
    }
  }

  async function handleSubmitProject(projectNumber: number) {
    const link = githubInputs[projectNumber];
    if (!link || !link.trim()) {
      alert("Please paste your GitHub link first.");
      return;
    }
    setSubmittingProject(projectNumber);
    try {
      const res = await fetch(`${API_BASE}/student/phase/${phaseNumber}/project/${projectNumber}/submit`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ github_link: link }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail || "Failed to submit project");
      loadPhase();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingProject(null);
    }
  }

  async function handleDeleteProject(projectNumber: number) {
    if (!confirm("Remove your submission for this project? You can resubmit later.")) return;
    setDeletingProject(projectNumber);
    try {
      const res = await fetch(`${API_BASE}/student/phase/${phaseNumber}/project/${projectNumber}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail || "Failed to remove submission");
      loadPhase();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingProject(null);
    }
  }

  async function handleSubmitChallenge(challengeId: string) {
    const code = challengeCode[challengeId];
    if (!code || !code.trim()) {
      alert("Please write your code first.");
      return;
    }
    setSubmittingChallenge(challengeId);
    try {
      const res = await fetch(`${API_BASE}/student/challenges/${challengeId}/submit`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ submitted_code: code }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail || "Failed to submit challenge");
      loadChallenges();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingChallenge(null);
    }
  }

  async function handlePostMessage(message: string, parentId: string | null) {
    if (!message.trim()) return;
    setPostingMessage(true);
    try {
      const res = await fetch(`${API_BASE}/student/phase/${phaseNumber}/discussion`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ message, parent_id: parentId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail || "Failed to post message");
      if (parentId) {
        setReplyText("");
        setReplyTo(null);
      } else {
        setNewMessage("");
      }
      loadDiscussion();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPostingMessage(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-6 py-4 max-w-md text-center">{error}</div>
    </div>
  );
  if (!data) return null;

  const activeLecture = data.lectures[activeVideoIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const currentDomain = getActiveDomain();
                router.push(currentDomain ? `/dashboard?domain=${encodeURIComponent(currentDomain)}` : "/dashboard");
              }}
              className="text-gray-500 hover:text-gray-800 text-sm font-medium"
            >
              ← Dashboard
            </button>
            <span className="text-gray-300">|</span>
            <span className="font-semibold text-gray-900">
              {(data.domain || domain) && (
                <span className="text-indigo-600 font-semibold mr-2">[{data.domain || domain}]</span>
              )}
              Phase {data.phase_number}: {data.phase_title}
            </span>
          </div>
          {data.is_preview && (
            <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-medium">
              ⚡ Testing Mode (Unlocked)
            </span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* LECTURE SECTION */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">📺 Lecture</h2>
            {data.lecture_watched && (
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-green-100 text-green-700">✅ Watched</span>
            )}
          </div>

          {data.video_notes && (
            <p className="text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2 mb-4">
              ℹ️ {data.video_notes}
            </p>
          )}

          {data.lectures.length === 0 ? (
            <p className="text-sm text-gray-400">No lecture videos added for this phase yet.</p>
          ) : (
            <>
              {data.lectures.length > 1 && (
                <div className="flex gap-2 mb-4 flex-wrap">
                  {data.lectures.map((lec, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveVideoIndex(idx)}
                      className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        activeVideoIndex === idx ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {lec.topic_title}
                    </button>
                  ))}
                </div>
              )}

              {activeLecture && activeLecture.video_url && activeLecture.notes_content && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 mb-3 whitespace-pre-wrap text-sm text-blue-900 leading-relaxed">
                  {activeLecture.notes_content}
                </div>
              )}

              {activeLecture && activeLecture.video_url && (
                <GatedYoutubePlayer
                  key={activeLecture.video_url}
                  videoUrl={activeLecture.video_url}
                  startTimeSeconds={activeLecture.start_time_seconds || 0}
                  endTimeSeconds={activeLecture.end_time_seconds}
                  alreadyCompleted={data.lecture_watched || data.is_preview}
                  onSegmentComplete={handleMarkWatched}
                />
              )}

              {activeLecture && !activeLecture.video_url && activeLecture.notes_content && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 mb-4 whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                  {activeLecture.notes_content}
                </div>
              )}
            </>
          )}

          {!data.lecture_watched && (
            <button
              onClick={handleMarkWatched}
              disabled={markingWatched}
              className="bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {markingWatched ? "Saving..." : "Mark Lecture as Complete"}
            </button>
          )}
        </section>

        {/* QUIZ SECTION */}
        <section className={`bg-white border border-gray-200 rounded-xl p-6 ${!data.lecture_watched && !data.is_preview ? "opacity-50" : ""}`}>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">📝 Quiz</h2>

          {!data.lecture_watched && !data.is_preview ? (
            <p className="text-sm text-gray-400">Complete the lecture to unlock the quiz.</p>
          ) : quizStarted ? (
            <div className="space-y-6">
              {questions.map((q, idx) => (
                <div key={q.id} className="border-b border-gray-100 pb-5 last:border-0">
                  <p className="text-sm font-medium text-gray-900 mb-3">
                    {idx + 1}. {q.question_text}
                  </p>
                  {q.type === "mcq" && q.options ? (
                    <div className="space-y-2">
                      {(Object.entries(q.options) as [string, string][]).map(([key, val]) => (
                        <label
                          key={key}
                          className={`flex items-center gap-3 border rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                            quizAnswers[q.id] === key ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            value={key}
                            checked={quizAnswers[q.id] === key}
                            onChange={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: key }))}
                            className="accent-indigo-600"
                          />
                          <span className="font-medium text-gray-500">{key})</span> {val}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      value={quizAnswers[q.id] || ""}
                      onChange={(e) => setQuizAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Type your answer..."
                    />
                  )}
                </div>
              ))}
              <button
                onClick={handleSubmitQuiz}
                disabled={quizLoading}
                className="bg-indigo-600 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {quizLoading ? "Submitting..." : "Submit Quiz"}
              </button>
            </div>
          ) : (
            <div>
              {quizResult && (
                <div
                  className={`rounded-lg px-4 py-3 mb-4 text-sm ${
                    quizResult.passed ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-600"
                  }`}
                >
                  {quizResult.passed ? "🎉 Passed!" : "❌ Not passed."} Score: {quizResult.score}% ({quizResult.correct_count}/{quizResult.total_questions} correct). Need 75% to pass.
                </div>
              )}
              {data.quiz.passed ? (
                <p className="text-sm text-green-700 font-medium">✅ Quiz passed (Score: {data.quiz.score}%)</p>
              ) : (
                <button
                  onClick={handleStartQuiz}
                  disabled={quizLoading}
                  className="bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {quizLoading ? "Loading..." : data.quiz.attempts > 0 ? "Retake Quiz" : "Start Quiz"}
                </button>
              )}
              {data.quiz.attempts > 0 && !quizResult && (
                <p className="text-xs text-gray-400 mt-2">Attempts so far: {data.quiz.attempts}</p>
              )}
            </div>
          )}
        </section>

        {/* CODING CHALLENGES SECTION */}
        <section className={`bg-white border border-gray-200 rounded-xl p-6 ${!data.lecture_watched && !data.is_preview ? "opacity-50" : ""}`}>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">🧩 Practice Challenges</h2>

          {!data.lecture_watched && !data.is_preview ? (
            <p className="text-sm text-gray-400">Complete the lecture to unlock practice challenges.</p>
          ) : challenges.length === 0 ? (
            <p className="text-sm text-gray-400">No challenges added for this phase yet.</p>
          ) : (
            <div className="space-y-4">
              {challenges.map((c) => (
                <div key={c.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-gray-900">{c.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{c.difficulty}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{c.description}</p>

                  {c.hint && <p className="text-xs text-gray-400 mb-3">💡 Hint: {c.hint}</p>}

                  {c.solved ? (
                    <div className="text-sm space-y-2">
                      <p className="text-green-700 font-medium">✅ Solved</p>
                      {c.solution_code && (
                        <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                          {c.solution_code}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={challengeCode[c.id] ?? c.starter_code ?? ""}
                        onChange={(e) => setChallengeCode((prev) => ({ ...prev, [c.id]: e.target.value }))}
                        rows={5}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Write your code here..."
                      />
                      <button
                        onClick={() => handleSubmitChallenge(c.id)}
                        disabled={submittingChallenge === c.id}
                        className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        {submittingChallenge === c.id ? "Saving..." : "Mark as Solved"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* PROJECTS SECTION */}
        <section className={`bg-white border border-gray-200 rounded-xl p-6 ${!data.quiz.passed && !data.is_preview ? "opacity-50" : ""}`}>
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">💻 Projects</h2>

          {!data.quiz.passed && !data.is_preview ? (
            <p className="text-sm text-gray-400">Pass the quiz to unlock projects.</p>
          ) : (
            <div className="space-y-5">
              {data.projects.map((proj) => (
                <div key={proj.project_number} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-gray-900">{proj.project_name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{proj.difficulty}</span>
                  </div>
<p className="text-sm text-gray-500 mb-3 whitespace-pre-wrap">{proj.description}</p>
                  {proj.solution_reference && (
                    <a
                      href={proj.solution_reference}
                      target="_blank"
                      className="text-sm text-gray-500 hover:underline block mb-3"
                    >
                      📖 Reference solution →
                    </a>
                  )}

                  {proj.submitted && editingProject !== proj.project_number ? (
                    <div className="text-sm space-y-2">
                      <p className="text-green-700 font-medium">✅ Submitted</p>
                      <a href={proj.your_github_link || "#"} target="_blank" className="text-indigo-600 hover:underline block">
                        Your submission →
                      </a>
                      <div className="flex gap-3 pt-1">
                        <button
                          onClick={() => {
                            setGithubInputs((prev) => ({ ...prev, [proj.project_number]: proj.your_github_link || "" }));
                            setEditingProject(proj.project_number);
                          }}
                          className="text-xs font-medium text-gray-600 hover:text-indigo-600"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProject(proj.project_number)}
                          disabled={deletingProject === proj.project_number}
                          className="text-xs font-medium text-gray-600 hover:text-red-600 disabled:opacity-50"
                        >
                          {deletingProject === proj.project_number ? "Removing..." : "🗑️ Remove"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Paste your GitHub repo link"
                        value={githubInputs[proj.project_number] || ""}
                        onChange={(e) =>
                          setGithubInputs((prev) => ({ ...prev, [proj.project_number]: e.target.value }))
                        }
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        onClick={async () => {
                          await handleSubmitProject(proj.project_number);
                          setEditingProject(null);
                        }}
                        disabled={submittingProject === proj.project_number}
                        className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {submittingProject === proj.project_number ? "Saving..." : proj.submitted ? "Update" : "Submit"}
                      </button>
                      {proj.submitted && (
                        <button
                          onClick={() => setEditingProject(null)}
                          className="text-sm text-gray-500 px-2 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {data.phase_completed && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
            <p className="text-green-700 font-semibold">🎉 Phase {data.phase_number} Complete!</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-3 text-sm text-indigo-600 hover:underline"
            >
              Back to Dashboard →
            </button>
          </div>
        )}

        {/* DISCUSSION SECTION */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">💬 Doubts & Discussion</h2>

          <div className="flex gap-2 mb-5">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ask your doubt here..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyDown={(e) => e.key === "Enter" && handlePostMessage(newMessage, null)}
            />
            <button
              onClick={() => handlePostMessage(newMessage, null)}
              disabled={postingMessage}
              className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              Post
            </button>
          </div>

          {discussion.filter((m) => !m.parent_id).length === 0 ? (
            <p className="text-sm text-gray-400">No doubts posted yet — you can ask the first question.</p>
          ) : (
            <div className="space-y-4">
              {discussion
                .filter((m) => !m.parent_id)
                .map((msg) => (
                  <div key={msg.id} className="border border-gray-200 rounded-lg p-3">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{msg.users?.full_name || "Student"}</span>: {msg.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(msg.created_at).toLocaleString()}</p>

                    {/* replies */}
                    <div className="ml-4 mt-2 space-y-2">
                      {discussion
                        .filter((r) => r.parent_id === msg.id)
                        .map((r) => (
                          <div key={r.id} className="border-l-2 border-gray-100 pl-3 text-sm">
                            <span className="font-medium text-gray-900">{r.users?.full_name || "Student"}</span>:{" "}
                            {r.message}
                          </div>
                        ))}
                    </div>

                    {replyTo === msg.id ? (
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          onKeyDown={(e) => e.key === "Enter" && handlePostMessage(replyText, msg.id)}
                        />
                        <button
                          onClick={() => handlePostMessage(replyText, msg.id)}
                          disabled={postingMessage}
                          className="text-xs font-medium text-indigo-600 hover:underline whitespace-nowrap"
                        >
                          Reply
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReplyTo(msg.id)}
                        className="text-xs text-gray-500 hover:text-indigo-600 mt-2"
                      >
                        Reply
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}