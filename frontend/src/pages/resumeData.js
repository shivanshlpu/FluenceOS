export const initialResumeData = {
  header: {
    fullName: "Vishesh Raj",
    targetTitle: "Full Stack & AI Engineer",
    summary: "Innovative Full Stack & AI Engineer with 3+ years of experience designing scalable web architectures, agentic AI pipelines, and distributed cloud applications.",
    email: "vishesh@example.com",
    mobile: "+91 95XXXXXXXX",
    location: "San Francisco, CA",
    linkedIn: { label: "linkedin.com/in/vishesh-raj", url: "https://linkedin.com/in/vishesh-raj" },
    github: { label: "github.com/VisheshRaj11", url: "https://github.com/VisheshRaj11" },
    portfolio: { label: "vishesh-port-folio.vercel.app", url: "https://vishesh-port-folio.vercel.app" }
  },
  skills: [
    { category: "Languages", items: "Java, TypeScript, JavaScript, SQL, HTML5, CSS3" },
    { category: "Frameworks & Libraries", items: "React.js, Node.js, Express.js, Langchain, Livekit" },
    { category: "Databases", items: "MongoDB, PostgreSQL, Supabase" },
    { category: "Cloud / DevOps", items: "Docker, Kubernetes, Grafana, Prometheus, AWS" },
    { category: "Developer Tools", items: "Render, Netlify, Vercel, Postman, Git & GitHub, VS Code" },
    { category: "Core Subjects", items: "OOP, DBMS, Computer Networks, Operating System, Data Structures & Algorithms" },
    { category: "Soft Skills", items: "Problem-Solving, Adaptability, Team Collaboration, Intellectual Curiosity" },
    { category: "AI / LLMs", items: "Claude, ChatGPT, Gemini" }
  ],
  experience: [
    {
      role: "Open Source Contributor",
      organization: "OSCI",
      tagLabel: "Certificate",
      tagUrl: "https://example.com/cert",
      date: "Aug 2025",
      bullets: [
        "Contributed to a stock market analysis platform under Open Source Connect India, enhancing the frontend using React.js and CSS to improve interface responsiveness and user experience.",
        "Improved UI components and styling architecture, optimizing layout consistency and visual design across multiple dashboard views.",
        "Collaborated with open-source contributors at OSCI on GitHub, resolving issues and submitting pull requests to improve frontend usability."
      ]
    }
  ],
  projects: [
    {
      title: "Freeko",
      descriptor: "AI-Powered Gym Coaching Platform",
      githubUrl: "https://github.com/VisheshRaj11/freeko",
      liveUrl: "https://freeko.live",
      date: "May 2026 – June 2026",
      bullets: [
        "Architected a full-stack gym coaching platform integrating LangChain and Gemini AI to auto-generate 12–16 week periodized training programs, reducing manual coach planning time.",
        "Engineered a LangGraph multi-agent anomaly detection pipeline where Agent 1 collects workout performance trends and Agent 2 reasons over data, flagging injury risks in real time.",
        "Delivered a real-time coach-athlete communication system using Socket.io with JWT-authenticated rooms, paired with a Node-cron scheduled AI summarizer that auto-generates weekly PDF reports."
      ],
      techStack: "React.js, Node.js, MongoDB, Redis, FastAPI, LangChain, Docker, Gemini AI"
    },
    {
      title: "Compend",
      descriptor: "Community Platform for Student Collaboration",
      githubUrl: "https://github.com/VisheshRaj11/compend",
      liveUrl: "https://compend.dev",
      date: "Mar 2026 – Apr 2026",
      bullets: [
        "Built a scalable multi-tenant community platform with real-time chat and video calling for concurrent users, streamlining peer learning, hackathon discovery, and project collaboration.",
        "Integrated AI-powered automation to generate interactive wireframes and TLDR summaries from project discussions, reducing ideation-to-prototype time.",
        "Designed a content discovery and streaming module with dynamic hackathon feed, improving platform session duration and user engagement."
      ],
      techStack: "React.js, Clerk, Supabase, GraphQL, LiveKit, tldraw, Gemini AI, Tailwind CSS"
    },
    {
      title: "Grapheus AI",
      descriptor: "Project Performance Analyzer",
      githubUrl: "https://github.com/VisheshRaj11/grapheus",
      liveUrl: "",
      date: "Nov 2025 – Dec 2025",
      bullets: [
        "Engineered an AI-powered project analytics platform that clones any GitHub repository via Simple Git and instruments it for real-time observability across HTTP latency and memory consumption.",
        "Programmed a containerized backend pipeline using Node.js and Docker orchestrating Prometheus metric scraping and Grafana dashboard rendering with zero manual configuration.",
        "Crafted a responsive React + TypeScript interface where users submit repository URLs and instantly surface live performance dashboards."
      ],
      techStack: "React.js, TypeScript, Node.js, Docker, Prometheus, Grafana, Simple Git"
    }
  ],
  training: [
    {
      title: "Vet Guard",
      descriptor: "AI Driven Animal Disease Detector App",
      tagLabel: "Certificate",
      tagUrl: "https://example.com/vetguard-cert",
      date: "Jun 2025 – Jul 2025",
      bullets: [
        "Built Android application using Kotlin, XML, Firebase Authentication, and Figma; developing ResNet-based CNN model achieving 95% accuracy in detecting 50+ animal diseases.",
        "Embedded Google Maps API to locate veterinary pharmacies within 10 km radius, reducing emergency response time and ensuring faster access to pet care.",
        "Built a pet care system with news feeds, notifications, and medication reminders."
      ],
      techStack: "Kotlin, XML, Firebase, ResNet, CNN, Google Maps API"
    }
  ],
  certifications: [
    { name: "Postman Api Fundamentals Student Expert", issuer: "Postman", link: "https://postman.com", date: "Jan 2026" },
    { name: "Cloud Computing", issuer: "NPTEL", link: "https://nptel.ac.in", date: "Apr 2025" },
    { name: "The Bits and Bytes of Computer Networking", issuer: "Coursera", link: "https://coursera.org", date: "Sep 2024" }
  ],
  achievements: [
    { text: "Clinched 1st at GearUp Hackathon (SIH'25) among 2,000+ participants by engineering an AI-powered drone rescue system.", date: "Sep 2025" },
    { text: "Selected as PW Campus Ambassador, engaging 200+ students to promote learning programs and technical events.", date: "Jan 2024" }
  ],
  education: [
    {
      institution: "Lovely Professional University",
      location: "Punjab, India",
      degree: "Bachelor of Technology in Computer Science — CGPA: 8.1",
      date: "Aug 2023 – Present"
    },
    {
      institution: "Bijnor Public School",
      location: "Uttar Pradesh, India",
      degree: "Intermediate — CGPA: 9.0",
      date: "Apr 2021 – May 2022"
    },
    {
      institution: "Bijnor Public School",
      location: "Uttar Pradesh, India",
      degree: "Matriculation — CGPA: 10",
      date: "Apr 2020 – May 2021"
    }
  ]
};
