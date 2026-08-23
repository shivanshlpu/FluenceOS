import { pythonAPI, javaAPI } from './api';

export const roadmapService = {
    // Generate full master roadmap
    generateRoadmap: async (skill, level = 'Beginner') => {
        // 1. PRIMARY: Dedicated Python FastAPI roadmap endpoint
        try {
            const data = await pythonAPI.post('/api/roadmap/generate', { skill, level });
            if (data && data.phases && data.phases.length > 0) return data;
        } catch (e) {
            console.warn('[ROADMAP] /api/roadmap/generate fallback:', e);
        }

        // 2. BACKUP: Knowledge router fallback
        try {
            const data = await pythonAPI.post('/api/knowledge/roadmap/generate', { skill, level });
            if (data && data.phases && data.phases.length > 0) return data;
        } catch (e) {
            console.warn('[ROADMAP] /api/knowledge/roadmap/generate fallback:', e);
        }

        // 3. OFFLINE CLIENT-SIDE PRESETS FOR INSTANT SMOOTH EXPERIENCE
        return getClientFallbackRoadmap(skill, level);
    },

    // Get on-demand topic deep dive tutorial
    getTopicGuide: async (skill, topicName) => {
        try {
            const data = await pythonAPI.post('/api/roadmap/topic-guide', { skill, topicName });
            if (data && data.overview) return data;
        } catch (e) {
            console.warn('[ROADMAP] Topic guide fallback:', e);
        }

        return {
            topic: topicName,
            skill: skill,
            overview: `Comprehensive guide to mastering ${topicName} in ${skill}.`,
            whyItMatters: `Essential skill for building production-ready, performant systems in ${skill}.`,
            stepByStep: [
                `1. Review official documentation and core syntax for ${topicName}.`,
                `2. Build a minimal working code example in your local project.`,
                `3. Test edge cases, concurrency, and error handling.`
            ],
            codeSnippet: `// Practice ${topicName} in ${skill}\nconsole.log('Mastering ${topicName}');`,
            codeExplanation: 'Demonstrates basic syntax initialization and usage.',
            commonMistakes: [
                { mistake: 'Skipping edge-case input validation', fix: 'Always sanitize parameters and handle exceptions gracefully.' }
            ],
            bestPractices: [
                'Keep logic modular and isolated.',
                'Write unit tests covering edge cases.'
            ],
            officialDocs: `https://www.google.com/search?q=${encodeURIComponent(skill + ' ' + topicName + ' tutorial documentation')}`
        };
    },

    // Fetch popular curated technology presets
    getPresets: async () => {
        try {
            const res = await pythonAPI.get('/api/roadmap/presets');
            if (res && res.presets) return res.presets;
        } catch (e) {}

        return [
            { skill: 'Python', icon: '🐍', category: 'Backend & AI', desc: 'FastAPI, Data Structures, & AI Pipelines', level: 'Beginner' },
            { skill: 'React & Next.js', icon: '⚛️', category: 'Frontend', desc: 'Hooks, Server Components & Full-Stack', level: 'Beginner' },
            { skill: 'Machine Learning & AI', icon: '🤖', category: 'AI Engineering', desc: 'Neural Networks, PyTorch & LLMs', level: 'Intermediate' },
            { skill: 'Rust', icon: '🦀', category: 'Systems', desc: 'Memory Safety, Concurrency & High Performance', level: 'Beginner' },
            { skill: 'Go (Golang)', icon: '🚀', category: 'Backend', desc: 'Goroutines, Microservices & High Concurrency', level: 'Beginner' },
            { skill: 'Docker & Kubernetes', icon: '🐳', category: 'DevOps', desc: 'Containers, Compose & Orchestration', level: 'Intermediate' },
            { skill: 'Java Spring Boot', icon: '☕', category: 'Enterprise', desc: 'Enterprise REST APIs, Security & JPA', level: 'Beginner' },
            { skill: 'System Design & DSA', icon: '🏗️', category: 'Architecture', desc: 'Scalability, Caching & Interview Mastery', level: 'Advanced' },
            { skill: 'TypeScript', icon: '💙', category: 'Full-Stack', desc: 'Type Safety, Generics & Node.js', level: 'Beginner' },
            { skill: 'SQL & PostgreSQL', icon: '🐘', category: 'Database', desc: 'Queries, Indexing & Optimization', level: 'Beginner' },
        ];
    }
};

function getClientFallbackRoadmap(skill, level) {
    const encoded = encodeURIComponent(skill);
    return {
        name: skill,
        overview: `Comprehensive step-by-step mastery roadmap for ${skill}.`,
        level: level || 'Beginner',
        estimatedWeeks: 8,
        setupGuide: {
            prerequisites: [`Install official ${skill} runtime/compiler`, 'Install Visual Studio Code', 'Install Git & command-line tools'],
            installCommands: [`# Verify ${skill} installation`, `${skill.toLowerCase().replace(/ /g, '')} --version`],
            helloWorldCode: `// Hello World in ${skill}\nconsole.log("Welcome to ${skill} on FluenceOS!");`,
            explanation: `Make sure your environment PATH is configured and verify the version command in your terminal.`
        },
        phases: [
            {
                phase: 1,
                title: 'Phase 1: Environment Setup & Core Syntax',
                duration: '2 weeks',
                goal: `Master fundamentals, control structures, and primitive operations in ${skill}.`,
                topics: [
                    {
                        name: 'Variables, Types & Syntax Rules',
                        shortDesc: 'Core primitive types, variable declarations, and syntax rules',
                        explanation: `Learn how ${skill} handles memory, variable bindings, and type safety.`,
                        howToStart: '1. Create a starter script\n2. Declare variables\n3. Run your program in terminal',
                        codeSnippet: `// Example variables in ${skill}\nconst message = "Hello from FluenceOS";\nconsole.log(message);`,
                        commonMistakes: 'Overlooking variable scoping and type coercion rules.',
                        docUrl: `https://www.google.com/search?q=${encoded}+documentation`
                    },
                    {
                        name: 'Functions & Data Collections',
                        shortDesc: 'Modular functions, arguments, return values, and data structures',
                        explanation: 'Structure clean, reusable modules and understand list/array/hash-map operations.',
                        howToStart: '1. Write pure helper functions\n2. Iterate through collections\n3. Implement filter/map logic',
                        codeSnippet: `// Modular function pattern\nfunction calculateStats(items) {\n  return { count: items.length };\n}`,
                        commonMistakes: 'Mutating shared arrays inside loops.',
                        docUrl: `https://www.google.com/search?q=${encoded}+data+structures`
                    }
                ],
                resources: [
                    { title: `${skill} Full Course for Beginners (freeCodeCamp)`, url: `https://www.youtube.com/results?search_query=${encoded}+freecodecamp+full+course`, type: 'video', channel: 'freeCodeCamp.org' },
                    { title: `${skill} Complete Course (Coursera)`, url: `https://www.coursera.org/search?query=${encoded}`, type: 'course', channel: 'Coursera' }
                ],
                projects: [
                    { name: `Beginner ${skill} CLI Tool`, desc: `Build an interactive command-line app with file storage and input validation`, difficulty: 'Beginner', youtubeUrl: `https://www.youtube.com/results?search_query=${encoded}+beginner+project+tutorial`, channel: 'YouTube' }
                ],
                isCompleted: false
            },
            {
                phase: 2,
                title: 'Phase 2: Intermediate Engineering & Architecture',
                duration: '2 weeks',
                goal: `Apply design patterns, modular architecture, and async/concurrent workflows in ${skill}.`,
                topics: [
                    {
                        name: 'Object-Oriented & Functional Patterns',
                        shortDesc: 'Classes, modules, composition, and inheritance',
                        explanation: 'Organize complex business logic into maintainable, loosely-coupled components.',
                        howToStart: '1. Define clean interfaces\n2. Encapsulate business logic\n3. Write modular services',
                        codeSnippet: `// Object pattern in ${skill}\nclass Service {\n  constructor(name) { this.name = name; }\n}`,
                        commonMistakes: 'Creating overly deep inheritance hierarchies.',
                        docUrl: `https://www.google.com/search?q=${encoded}+design+patterns`
                    }
                ],
                resources: [
                    { title: `Intermediate ${skill} Masterclass`, url: `https://www.youtube.com/results?search_query=${encoded}+intermediate+tutorial`, type: 'video', channel: 'YouTube' }
                ],
                projects: [
                    { name: `Full-Stack ${skill} Web Application`, desc: `Interactive full-stack web application with database persistence and REST API`, difficulty: 'Intermediate', youtubeUrl: `https://www.youtube.com/results?search_query=${encoded}+full+stack+project`, channel: 'YouTube' }
                ],
                isCompleted: false
            },
            {
                phase: 3,
                title: 'Phase 3: Production, Testing & Cloud Deployment',
                duration: '2 weeks',
                goal: 'Write automated unit tests, containerize with Docker, and deploy to cloud.',
                topics: [
                    {
                        name: 'Automated Testing, Docker & CI/CD',
                        shortDesc: 'Automated test suites, containerization, and cloud deployment pipelines',
                        explanation: 'Ensure deterministic builds, automated regression tests, and zero-downtime deployments.',
                        howToStart: '1. Write unit tests\n2. Create a Dockerfile\n3. Set up automated CI workflows',
                        codeSnippet: `// Docker deployment configuration\nFROM node:18-alpine\nWORKDIR /app\nCOPY . .\nCMD ["npm", "start"]`,
                        commonMistakes: 'Deploying without automated health checks or logging.',
                        docUrl: `https://www.google.com/search?q=${encoded}+docker+deployment`
                    }
                ],
                resources: [
                    { title: `${skill} Production & DevOps Guide`, url: `https://www.youtube.com/results?search_query=${encoded}+production+devops`, type: 'video', channel: 'TechWorld with Nana' }
                ],
                projects: [
                    { name: `Production Cloud Service for ${skill}`, desc: `Containerized microservice with database integration, caching, and CI/CD pipelines`, difficulty: 'Advanced', youtubeUrl: `https://www.youtube.com/results?search_query=${encoded}+production+architecture`, channel: 'YouTube' }
                ],
                isCompleted: false
            }
        ],
        weeklyPlan: [
            { week: 1, title: 'Week 1: Setup & Foundations', tasks: [`Install ${skill} runtime & IDE`, 'Run Hello World', 'Practice primitive syntax'], completedTasks: [] },
            { week: 2, title: 'Week 2: Data Structures', tasks: ['Build collection utilities', 'Complete Phase 1 project', 'Push code to GitHub'], completedTasks: [] },
            { week: 3, title: 'Week 3: Intermediate Patterns', tasks: ['Learn error handling and modularity', 'Implement async workflows', 'Start Phase 2 project'], completedTasks: [] },
            { week: 4, title: 'Week 4: Full App Build', tasks: ['Complete Phase 2 project', 'Refactor and optimize performance', 'Add unit tests'], completedTasks: [] },
            { week: 5, title: 'Week 5: Docker & Cloud', tasks: ['Write Dockerfile', 'Deploy container to cloud', 'Configure CI/CD pipeline'], completedTasks: [] },
            { week: 6, title: 'Week 6: Portfolio & Interview Prep', tasks: ['Review interview questions', 'Polish CV bullet points', 'Publish final project'], completedTasks: [] }
        ],
        interviewQuestions: [
            {
                question: `What are the key architectural advantages of using ${skill}?`,
                answer: `${skill} provides high developer velocity, strong community ecosystem, excellent tooling, and predictable runtime performance suitable for scalable systems.`,
                difficulty: 'Medium'
            },
            {
                question: `How do you handle error boundaries and concurrency in ${skill}?`,
                answer: `By following structured error handling, clean async/promise pipelines, and isolating failure states with retry and fallback mechanisms.`,
                difficulty: 'Medium'
            }
        ],
        cheatSheet: [
            { category: 'Getting Started', snippet: `// Initialize project\n${skill.toLowerCase().replace(/ /g, '')} init`, explanation: `Initializes a new ${skill} project workspace` },
            { category: 'Best Practice', snippet: '// Always validate inputs and handle edge cases', explanation: 'Ensures reliability across production workloads' }
        ]
    };
}
