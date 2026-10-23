import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-blue-50 to-white py-24 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-block bg-blue-100 text-blue-700 text-sm px-4 py-1 rounded-full mb-6">
          🚀 29 Free Beta Seats — College Students Only
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Launch Your Orbit.{" "}<span className="text-blue-600">Build Your Future.</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          AI-powered 6-month career roadmap. Week-by-week learning, real projects, verified certificate. Beginner to job-ready.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/admission" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">Apply for Free Seat</Link>
          <Link href="/services" className="border border-gray-300 text-gray-700 px-8 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors">View All Domains</Link>
        </div>
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          {[{ num: "7", label: "Domains" }, { num: "24+", label: "Weeks Structured" }, { num: "100%", label: "Project Based" }].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-blue-600">{stat.num}</div>
              <div className="text-gray-500 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
