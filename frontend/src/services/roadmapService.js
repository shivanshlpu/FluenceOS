import { javaAPI, pythonAPI } from './api';

// Enrich a Java BFS tree phase node with YouTube search links
function enrichWithYouTube(skill, phase, phaseIndex) {
    const encoded = skill.replace(/ /g, '+');
    const levelMap = ['beginner', 'intermediate', 'advanced'];
    const level = levelMap[phaseIndex] || 'intermediate';
    return {
        ...phase,
        resources: phase.resources?.length > 0 ? phase.resources : [
            {
                title: `${skill} ${phase.title} - Free Video Course`,
                url: `https://www.youtube.com/results?search_query=${encoded}+${level}+tutorial+free`,
                type: 'video'
            },
            {
                title: `${skill} ${phase.title} - Crash Course`,
                url: `https://www.youtube.com/results?search_query=${encoded}+${level}+crash+course`,
                type: 'video'
            }
        ],
        projects: phase.projects?.length > 0
            ? phase.projects.map(p => typeof p === 'string'
                ? { name: p, youtubeUrl: `https://www.youtube.com/results?search_query=${encoded}+${p.toLowerCase().replace(/ /g, '+')}+project+tutorial` }
                : p)
            : [{
                name: `${level.charAt(0).toUpperCase() + level.slice(1)} ${skill} Project`,
                youtubeUrl: `https://www.youtube.com/results?search_query=${encoded}+${level}+project+tutorial`
            }]
    };
}

// Transform Java BFS tree response into frontend phases/weeklyPlan format with YouTube links
function transformRoadmapTree(tree, skill) {
    if (!tree?.children) return null;

    const phases = tree.children.map((child, i) => enrichWithYouTube(skill, {
        phase: i + 1,
        title: child.name.replace(/^Phase \d+:\s*/, ''),
        duration: `${child.children?.length || 2} weeks`,
        topics: child.children?.map(c => c.name) || [],
        resources: [],
        projects: [],
        isCompleted: false,
    }, i));

    const weeklyPlan = phases.map((phase, i) => ({
        week: i + 1,
        tasks: phase.topics.map(t => `Learn ${t}`),
        completedTasks: [],
    }));

    return { name: tree.name, phases, weeklyPlan };
}

export const roadmapService = {
    generateRoadmap: async (skill, level = 'Beginner') => {
        // PRIMARY: Python AI-powered roadmap (Groq) — has real YouTube links per phase
        try {
            const data = await pythonAPI.post('/api/knowledge/roadmap/generate', { skill, level });
            if (data?.phases?.length > 0) return data;
        } catch { /* Fall through to Java */ }

        // FALLBACK: Java BFS tree (enriched with YouTube search links)
        try {
            const data = await javaAPI.post('/api/java/roadmap/generate', { skill, level });
            const transformed = transformRoadmapTree(data, skill);
            if (transformed) return transformed;
        } catch { /* Both failed */ }

        // Last resort: static fallback with YouTube links
        const encoded = skill.replace(/ /g, '+');
        return {
            name: skill,
            phases: [
                {
                    phase: 1, title: 'Getting Started', duration: '2 weeks',
                    topics: [`Introduction to ${skill}`, 'Setup & Installation', 'Core Concepts'],
                    resources: [
                        { title: `${skill} Beginner Full Course (Free)`, url: `https://www.youtube.com/results?search_query=${encoded}+full+course+beginners`, type: 'video' },
                        { title: `${skill} Crash Course`, url: `https://www.youtube.com/results?search_query=${encoded}+crash+course`, type: 'video' }
                    ],
                    projects: [{ name: `Simple ${skill} App`, youtubeUrl: `https://www.youtube.com/results?search_query=${encoded}+beginner+project` }],
                    isCompleted: false
                },
                {
                    phase: 2, title: 'Core Skills', duration: '3 weeks',
                    topics: ['Intermediate Concepts', 'Best Practices', 'Real-World Use Cases'],
                    resources: [
                        { title: `${skill} Intermediate Tutorial`, url: `https://www.youtube.com/results?search_query=${encoded}+intermediate+tutorial`, type: 'video' },
                        { title: `${skill} Best Practices`, url: `https://www.youtube.com/results?search_query=${encoded}+best+practices+tutorial`, type: 'video' }
                    ],
                    projects: [{ name: `Full ${skill} Project`, youtubeUrl: `https://www.youtube.com/results?search_query=${encoded}+project+build+tutorial` }],
                    isCompleted: false
                },
                {
                    phase: 3, title: 'Advanced & Production', duration: '4 weeks',
                    topics: ['Advanced Patterns', 'Performance', 'Deployment'],
                    resources: [
                        { title: `Advanced ${skill} Concepts`, url: `https://www.youtube.com/results?search_query=${encoded}+advanced+course`, type: 'video' },
                        { title: `${skill} in Production`, url: `https://www.youtube.com/results?search_query=${encoded}+production+deployment+tutorial`, type: 'video' }
                    ],
                    projects: [{ name: `Production-Ready ${skill} App`, youtubeUrl: `https://www.youtube.com/results?search_query=${encoded}+full+stack+project+2024` }],
                    isCompleted: false
                }
            ],
            weeklyPlan: [
                { week: 1, tasks: ['Watch beginner course', 'Setup environment'], completedTasks: [] },
                { week: 2, tasks: ['Build first project', 'Practice exercises'], completedTasks: [] },
                { week: 3, tasks: ['Intermediate tutorials', 'Build second project'], completedTasks: [] },
                { week: 4, tasks: ['Advanced concepts', 'Work on real app'], completedTasks: [] }
            ]
        };
    },

    getProgress: (userId, skillId) =>
        javaAPI.get(`/api/java/roadmap/progress/${userId}/${skillId}`),

    updateProgress: (data) =>
        javaAPI.put('/api/java/roadmap/progress', data),
};
