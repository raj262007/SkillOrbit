export default function TeamPage() {
  return (
    <div className="py-16 px-4 max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Our Team</h1>
        <p className="text-gray-500">The people behind SkillOrbit</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
        <div className="border border-gray-200 rounded-2xl p-8 text-center hover:shadow-lg transition-all">
          <div className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">PS</div>
          <h3 className="font-bold text-xl text-gray-900 mb-1">Pawan Singh</h3>
          <p className="text-blue-600 text-sm mb-3">Founder & CEO</p>
          <p className="text-gray-500 text-sm mb-4">Building SkillOrbit to give every student a structured path to become job-ready.</p>
          <a href="https://www.linkedin.com/in/pawan-singh-001a00332/" target="_blank" className="text-blue-600 text-sm hover:underline">LinkedIn Profile →</a>
        </div>
      </div>
    </div>
    
  );
  
}
