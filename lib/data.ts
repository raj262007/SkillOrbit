export const domains = [
  { id: 1, title: "Full Stack Developer", icon: "🔧", duration: "26 weeks", description: "Frontend + Backend + DevOps — complete package", topics: ["React", "Node.js", "PostgreSQL", "Docker", "AWS"], comingSoon: false },
  { id: 2, title: "Python Developer", icon: "🐍", duration: "22 weeks", description: "From Python basics to Django REST APIs", topics: ["Python", "OOP", "Django", "REST APIs", "PostgreSQL"], comingSoon: false },
  { id: 3, title: "UI / UX Design", icon: "🎨", duration: "20 weeks", description: "From design principles to Figma prototyping — complete UX journey", topics: ["Figma", "Wireframing", "User Research", "Prototyping", "Design Systems"], comingSoon: false },
  { id: 4, title: "Data Science", icon: "📊", duration: "24 weeks", description: "From raw data to insights — complete analytics path", topics: ["Python", "Pandas", "Matplotlib", "Scikit-learn", "SQL"], comingSoon: false },
  { id: 5, title: "AI / ML Engineer (Coming Soon)", icon: "🤖", duration: "26 weeks", description: "From Python to LLMs — complete AI engineering journey", topics: ["Python", "NumPy", "Pandas", "TensorFlow", "OpenAI"], comingSoon: true },
  { id: 6, title: "Cybersecurity (Coming Soon)", icon: "🛡️", duration: "24 weeks", description: "From networking basics to ethical hacking — complete security path", topics: ["Networking", "Linux", "Ethical Hacking", "Wireshark", "Kali Linux"], comingSoon: true },
  { id: 7, title: "Mobile App Developer (Coming Soon) ", icon: "📱", duration: "22 weeks", description: "From Flutter basics to published apps — complete mobile journey", topics: ["Flutter", "Dart", "Firebase", "REST APIs", "UI Design"], comingSoon: true },
];
export const howItWorks = [
  { step: 1, icon: "🎯", title: "Choose Domain", desc: "Select your career path from 7 options" },
  { step: 2, icon: "📺", title: "Watch Lectures", desc: "AI-curated top YouTube lectures every week" },
  { step: 3, icon: "📝", title: "Give Quiz", desc: "30 MCQ + 20 text — 75% to pass and unlock next week" },
  { step: 4, icon: "💻", title: "Build Projects", desc: "Pass quiz → unlock projects → upload to GitHub" },
];

export const pricingPlans = [
  {
    name: "Explorer",
    price: 0,
    features: ["1 domain roadmap", "Basic YouTube resources", "3 project suggestions", "Valid for 3 months"],
    notIncluded: ["AI doubt support", "Progress tracker", "Priority admission"],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Pro Learner",
    price: 149,
    features: ["2 domain roadmaps (your choice)", "Full resources + GitHub links", "10 project ideas per domain", "Progress tracker", "Valid for 6 months"],
    notIncluded: ["Priority admission slot", "AI doubt support"],
    cta: "Get Pro",
    highlighted: true,
  },
  {
    name: "Career Pro",
    price: 249,
    features: ["All 4 domain roadmaps", "Access to upcoming domains (incl. DSA) as they launch", "Everything in Pro", "Priority admission slot", "Valid for 12 months"],
    notIncluded: ["AI doubt support"],
    cta: "Go Career Pro",
    highlighted: false,
  },
];

export const teamMembers = [
  {
    name: "Pawan Singh",
    role: "Founder & CEO",
    bio: "Building SkillOrbit to give every student a structured path to become job-ready.",
    linkedin: "https://linkedin.com/in/username",
    Github: "https://git.com/raj262007",
    initials: "YN",
  },
  {
    name: "Nishant Sawaimoon",
    role: "Co-founder",
    bio: "",
    linkedin: "",
    Github: "",
    initials: "PS"

  }
];