import { useState, useEffect, useRef } from 'react';
import { Sparkles, Download, Save, Plus, Trash2, CheckCircle2, ShieldCheck, FileText, Layout, Eye, RefreshCw, Layers, Wand2 } from 'lucide-react';
import { pythonAPI } from '../services/api';

const DEFAULT_CV = {
    personalInfo: {
        fullName: "Alex Morgan",
        email: "alex.morgan@email.com",
        phone: "+1 (555) 234-5678",
        location: "San Francisco, CA",
        linkedin: "linkedin.com/in/alexmorgan",
        github: "github.com/alexmorgan",
        portfolio: "alexmorgan.dev",
        title: "Full Stack & AI Engineer"
    },
    summary: "Innovative Full Stack Engineer with 3+ years of experience designing high-throughput web applications and AI-driven systems. Passionate about clean architecture, scalable microservices, and continuous self-improvement.",
    experience: [
        {
            id: 'exp_1',
            role: "Full Stack Software Engineer",
            company: "TechCorp Innovations",
            location: "Remote",
            startDate: "2023",
            endDate: "Present",
            bullets: [
                "Architected and deployed modern React and FastAPI microservices, serving 50,000+ daily active users.",
                "Optimized database queries and Redis caching layer, reducing API latency by 42% across core endpoints.",
                "Spearheaded automated CI/CD deployment pipelines on GitHub Actions, cutting release cycles from 4 hours to 15 minutes."
            ]
        }
    ],
    projects: [
        {
            id: 'proj_1',
            name: "Personal AI Growth OS",
            technologies: "React, FastAPI, Web Speech API, Supabase, Groq LLaMA 3",
            link: "github.com/user/ai-growth-os",
            bullets: [
                "Built real-time spoken English voice coach with zero-latency browser speech synthesis and automated CEFR grading.",
                "Integrated DataCube AI News REST API for daily multilingual intelligence feed with automated caching."
            ]
        }
    ],
    skills: {
        languages: "Python, JavaScript / TypeScript, Java, SQL, HTML5/CSS3",
        frameworks: "FastAPI, React, Node.js, Spring Boot, Tailwind CSS",
        tools: "Git & GitHub, Docker, Supabase, MongoDB, PostgreSQL, Linux"
    },
    education: [
        {
            id: 'edu_1',
            degree: "B.S. in Computer Science",
            institution: "University of Technology",
            year: "2020 - 2024",
            location: "CA, USA"
        }
    ],
    certifications: "AWS Certified Solutions Architect, DeepLearning.AI Generative AI Specialist"
};

export default function CVMaker() {
    const [cv, setCv] = useState(DEFAULT_CV);
    const [template, setTemplate] = useState('modern'); // 'modern' | 'minimal' | 'executive'
    const [activeTab, setActiveTab] = useState('personal');
    const [enhancingIdx, setEnhancingIdx] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [mobileTab, setMobileTab] = useState('editor'); // 'editor' | 'preview'

    // ATS Match Scanner
    const [jobDescription, setJobDescription] = useState('');
    const [atsResult, setAtsResult] = useState(null);
    const [atsLoading, setAtsLoading] = useState(false);

    const resumeRef = useRef(null);

    // Load user's saved CV on mount
    useEffect(() => {
        pythonAPI.get('/api/cv/my-cv')
            .then(res => {
                if (res.cv && Object.keys(res.cv).length > 0) {
                    setCv(prev => ({ ...prev, ...res.cv }));
                }
            })
            .catch(() => {});
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setSaveMessage('');
        try {
            await pythonAPI.post('/api/cv/save', { cvData: cv, title: 'My Resume' });
            setSaveMessage('✓ CV saved securely!');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (err) {
            setSaveMessage('Failed to save CV to server.');
        } finally {
            setSaving(false);
        }
    };

    const handleEnhanceBullet = async (expIdx, bulletIdx) => {
        const currentBullet = cv.experience[expIdx].bullets[bulletIdx];
        if (!currentBullet.trim()) return;

        setEnhancingIdx(`${expIdx}-${bulletIdx}`);
        try {
            const res = await pythonAPI.post('/api/cv/enhance-bullet', {
                bullet: currentBullet,
                role: cv.experience[expIdx].role,
                targetJob: cv.personalInfo.title
            });

            if (res.enhancedBullet) {
                const updatedExp = [...cv.experience];
                updatedExp[expIdx].bullets[bulletIdx] = res.enhancedBullet;
                setCv({ ...cv, experience: updatedExp });
            }
        } catch (err) {
            console.error('Enhance bullet failed:', err);
        } finally {
            setEnhancingIdx(null);
        }
    };

    const handleAtsCheck = async () => {
        if (!jobDescription.trim()) return;
        setAtsLoading(true);
        try {
            const fullCvText = JSON.stringify(cv);
            const res = await pythonAPI.post('/api/cv/ats-check', {
                cvText: fullCvText,
                jobDescription: jobDescription
            });
            setAtsResult(res);
        } catch (err) {
            console.error('ATS check failed:', err);
        } finally {
            setAtsLoading(false);
        }
    };

    const handlePrintPDF = () => {
        window.print();
    };

    return (
        <div style={{ padding: '24px' }} className="cv-maker-container mobile-padding">
            {/* Print Stylesheet injected into DOM */}
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    #resume-printable-area, #resume-printable-area * { visibility: visible !important; }
                    #resume-printable-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        box-shadow: none !important;
                    }
                    .no-print { display: none !important; }
                }
                @media (max-width: 992px) {
                    .cv-split-layout {
                        grid-template-columns: 1fr !important;
                    }
                    .mobile-hide-editor {
                        display: none !important;
                    }
                    .mobile-hide-preview {
                        display: none !important;
                    }
                    .mobile-toggle-bar {
                        display: flex !important;
                    }
                }
                @media (min-width: 993px) {
                    .mobile-toggle-bar {
                        display: none !important;
                    }
                }
            `}</style>

            {/* Mobile View Toggle Bar (Only on phones/tablets) */}
            <div className="mobile-toggle-bar no-print" style={{
                display: 'none',
                gap: '8px',
                marginBottom: '16px',
                background: 'var(--bg-elevated-1)',
                padding: '6px',
                borderRadius: '12px',
            }}>
                <button
                    onClick={() => setMobileTab('editor')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 800,
                        background: mobileTab === 'editor' ? '#a855f7' : 'transparent',
                        color: mobileTab === 'editor' ? '#fff' : 'var(--text-secondary)',
                    }}
                >
                    ✏️ Edit CV Details
                </button>
                <button
                    onClick={() => setMobileTab('preview')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 800,
                        background: mobileTab === 'preview' ? '#a855f7' : 'transparent',
                        color: mobileTab === 'preview' ? '#fff' : 'var(--text-secondary)',
                    }}
                >
                    👁️ A4 Live Preview
                </button>
            </div>

            {/* Top Header & Actions Bar */}
            <div className="no-print" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '24px',
                padding: '20px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '50px', height: '50px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '24px', flexShrink: 0,
                    }}>📄</div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#fff' }}>AI CV & Resume Builder</h1>
                            <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: '#10b98122', color: '#10b981', border: '1px solid #10b98144' }}>
                                100% Free ATS Optimizer
                            </span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Craft ATS-friendly resumes with one-click AI bullet optimization & instant PDF export
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Template Selector */}
                    <div style={{ display: 'flex', background: 'var(--bg-elevated-2)', padding: '4px', borderRadius: '10px', gap: '4px' }}>
                        {[
                            { id: 'modern', label: 'Modern Tech' },
                            { id: 'minimal', label: 'Minimal ATS' },
                            { id: 'executive', label: 'Executive' },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTemplate(t.id)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: template === t.id ? '#a855f7' : 'transparent',
                                    color: template === t.id ? '#fff' : 'var(--text-secondary)',
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '10px 16px', borderRadius: '10px',
                            background: 'var(--bg-elevated-2)', color: '#fff',
                            border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
                            fontSize: '13px', fontWeight: 700,
                        }}
                    >
                        <Save size={15} /> {saving ? 'Saving...' : 'Save CV'}
                    </button>

                    <button
                        onClick={handlePrintPDF}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '10px 20px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #a855f7, #6366f1)', color: '#fff',
                            border: 'none', cursor: 'pointer',
                            fontSize: '13px', fontWeight: 800,
                            boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)',
                        }}
                    >
                        <Download size={16} /> Export PDF
                    </button>
                </div>
            </div>

            {saveMessage && (
                <div className="no-print" style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>
                    {saveMessage}
                </div>
            )}

            {/* Split Screen Layout: Left (Editor Tabs) | Right (Live A4 Preview) */}
            <div className="cv-split-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1fr) minmax(420px, 1.1fr)', gap: '24px' }}>
                {/* LEFT: Editor Panel */}
                <div className={`no-print ${mobileTab === 'preview' ? 'mobile-hide-editor' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Navigation Tabs */}
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {[
                            { id: 'personal', label: '1. Personal' },
                            { id: 'experience', label: '2. Experience' },
                            { id: 'projects', label: '3. Projects' },
                            { id: 'skills', label: '4. Skills' },
                            { id: 'ats', label: '🎯 ATS Scanner' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    background: activeTab === tab.id ? '#a855f7' : 'var(--bg-elevated-1)',
                                    color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab 1: Personal Details */}
                    {activeTab === 'personal' && (
                        <div style={{ padding: '20px', background: 'var(--bg-elevated-1)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 800 }}>Personal Information</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Full Name</label>
                                    <input
                                        type="text"
                                        value={cv.personalInfo.fullName}
                                        onChange={(e) => setCv({ ...cv, personalInfo: { ...cv.personalInfo, fullName: e.target.value } })}
                                        style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated-2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Target Job Title</label>
                                    <input
                                        type="text"
                                        value={cv.personalInfo.title}
                                        onChange={(e) => setCv({ ...cv, personalInfo: { ...cv.personalInfo, title: e.target.value } })}
                                        style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated-2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Email Address</label>
                                    <input
                                        type="text"
                                        value={cv.personalInfo.email}
                                        onChange={(e) => setCv({ ...cv, personalInfo: { ...cv.personalInfo, email: e.target.value } })}
                                        style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated-2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Phone Number</label>
                                    <input
                                        type="text"
                                        value={cv.personalInfo.phone}
                                        onChange={(e) => setCv({ ...cv, personalInfo: { ...cv.personalInfo, phone: e.target.value } })}
                                        style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated-2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Location (City, Country)</label>
                                    <input
                                        type="text"
                                        value={cv.personalInfo.location}
                                        onChange={(e) => setCv({ ...cv, personalInfo: { ...cv.personalInfo, location: e.target.value } })}
                                        style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated-2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>LinkedIn URL</label>
                                    <input
                                        type="text"
                                        value={cv.personalInfo.linkedin}
                                        onChange={(e) => setCv({ ...cv, personalInfo: { ...cv.personalInfo, linkedin: e.target.value } })}
                                        style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated-2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Professional Summary</label>
                                <textarea
                                    rows={3}
                                    value={cv.summary}
                                    onChange={(e) => setCv({ ...cv, summary: e.target.value })}
                                    style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated-2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#fff', fontSize: '13px', resize: 'vertical' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Work Experience with AI Enhance Bullet Point */}
                    {activeTab === 'experience' && (
                        <div style={{ padding: '20px', background: 'var(--bg-elevated-1)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ fontSize: '15px', fontWeight: 800 }}>Work Experience</h3>
                                <button
                                    onClick={() => {
                                        setCv({
                                            ...cv,
                                            experience: [
                                                ...cv.experience,
                                                { id: `exp_${Date.now()}`, role: "Software Engineer", company: "Company Name", location: "Remote", startDate: "2024", endDate: "Present", bullets: ["Engineered scalable features..."] }
                                            ]
                                        });
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    <Plus size={14} /> Add Role
                                </button>
                            </div>

                            {cv.experience.map((exp, expIdx) => (
                                <div key={exp.id || expIdx} style={{ padding: '14px', background: 'var(--bg-elevated-2)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <input
                                            type="text"
                                            placeholder="Role Title"
                                            value={exp.role}
                                            onChange={(e) => {
                                                const updated = [...cv.experience];
                                                updated[expIdx].role = e.target.value;
                                                setCv({ ...cv, experience: updated });
                                            }}
                                            style={{ padding: '8px', background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Company Name"
                                            value={exp.company}
                                            onChange={(e) => {
                                                const updated = [...cv.experience];
                                                updated[expIdx].company = e.target.value;
                                                setCv({ ...cv, experience: updated });
                                            }}
                                            style={{ padding: '8px', background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                                        />
                                    </div>

                                    {/* Bullet points */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Key Accomplishments (Click ✨ AI to auto-optimize)</label>
                                        {exp.bullets.map((b, bIdx) => (
                                            <div key={bIdx} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                                                <textarea
                                                    rows={2}
                                                    value={b}
                                                    onChange={(e) => {
                                                        const updated = [...cv.experience];
                                                        updated[expIdx].bullets[bIdx] = e.target.value;
                                                        setCv({ ...cv, experience: updated });
                                                    }}
                                                    style={{ flex: 1, padding: '8px', background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', color: '#fff', fontSize: '12px', resize: 'vertical' }}
                                                />
                                                <button
                                                    onClick={() => handleEnhanceBullet(expIdx, bIdx)}
                                                    disabled={enhancingIdx === `${expIdx}-${bIdx}`}
                                                    title="Enhance with AI (STAR format + Action Verbs)"
                                                    style={{
                                                        padding: '8px 10px',
                                                        borderRadius: '6px',
                                                        background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                                                        color: '#fff',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {enhancingIdx === `${expIdx}-${bIdx}` ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                    AI
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tab 3: Projects */}
                    {activeTab === 'projects' && (
                        <div style={{ padding: '20px', background: 'var(--bg-elevated-1)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 800 }}>Key Projects</h3>
                            {cv.projects.map((proj, pIdx) => (
                                <div key={pIdx} style={{ padding: '12px', background: 'var(--bg-elevated-2)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <input
                                        type="text"
                                        placeholder="Project Name"
                                        value={proj.name}
                                        onChange={(e) => {
                                            const updated = [...cv.projects];
                                            updated[pIdx].name = e.target.value;
                                            setCv({ ...cv, projects: updated });
                                        }}
                                        style={{ padding: '8px', background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Tech Stack Used (e.g. React, Python, FastAPI)"
                                        value={proj.technologies}
                                        onChange={(e) => {
                                            const updated = [...cv.projects];
                                            updated[pIdx].technologies = e.target.value;
                                            setCv({ ...cv, projects: updated });
                                        }}
                                        style={{ padding: '8px', background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tab 4: Skills */}
                    {activeTab === 'skills' && (
                        <div style={{ padding: '20px', background: 'var(--bg-elevated-1)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 800 }}>Technical & Soft Skills</h3>
                            <div>
                                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Programming Languages</label>
                                <input
                                    type="text"
                                    value={cv.skills.languages}
                                    onChange={(e) => setCv({ ...cv, skills: { ...cv.skills, languages: e.target.value } })}
                                    style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated-2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Frameworks & Libraries</label>
                                <input
                                    type="text"
                                    value={cv.skills.frameworks}
                                    onChange={(e) => setCv({ ...cv, skills: { ...cv.skills, frameworks: e.target.value } })}
                                    style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated-2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Cloud, Tools & Databases</label>
                                <input
                                    type="text"
                                    value={cv.skills.tools}
                                    onChange={(e) => setCv({ ...cv, skills: { ...cv.skills, tools: e.target.value } })}
                                    style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated-2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Tab 5: ATS Scanner & Matcher */}
                    {activeTab === 'ats' && (
                        <div style={{ padding: '20px', background: 'var(--bg-elevated-1)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShieldCheck size={18} color="#10b981" />
                                <h3 style={{ fontSize: '15px', fontWeight: 800 }}>ATS Job Match Scanner</h3>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                Paste any job posting below to scan ATS score and uncover missing keywords:
                            </p>
                            <textarea
                                rows={4}
                                placeholder="Paste job description here..."
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated-2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                            />
                            <button
                                onClick={handleAtsCheck}
                                disabled={atsLoading || !jobDescription.trim()}
                                style={{
                                    padding: '10px', borderRadius: '8px', background: '#10b981', color: '#fff',
                                    border: 'none', fontWeight: 800, fontSize: '13px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                }}
                            >
                                {atsLoading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />} Scan Match Score
                            </button>

                            {atsResult && (
                                <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 800, fontSize: '14px' }}>ATS Match Score:</span>
                                        <span style={{ fontSize: '20px', fontWeight: 900, color: '#10b981' }}>{atsResult.atsScore}%</span>
                                    </div>
                                    <div style={{ fontSize: '12px' }}>
                                        <strong style={{ color: '#10b981' }}>Matching Keywords:</strong> {atsResult.matchingSkills?.join(', ')}
                                    </div>
                                    <div style={{ fontSize: '12px' }}>
                                        <strong style={{ color: '#ef4444' }}>Missing Keywords:</strong> {atsResult.missingSkills?.join(', ')}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* RIGHT: Live Resume A4 Preview (Printable Area) */}
                <div className={mobileTab === 'editor' ? 'mobile-hide-preview' : ''} style={{ overflowX: 'auto' }}>
                    <div
                        id="resume-printable-area"
                        ref={resumeRef}
                        style={{
                            background: '#ffffff',
                            color: '#1a1a1a',
                            padding: '36px',
                            borderRadius: '8px',
                            minHeight: '840px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                            fontFamily: template === 'modern' ? 'Inter, sans-serif' : 'Times New Roman, serif',
                            lineHeight: 1.45,
                            fontSize: '13px',
                        }}
                    >
                        {/* Resume Header */}
                        <div style={{
                            borderBottom: template === 'modern' ? '2.5px solid #4f46e5' : '1px solid #333',
                            paddingBottom: '12px',
                            marginBottom: '16px',
                            textAlign: template === 'modern' ? 'left' : 'center',
                        }}>
                            <h1 style={{ fontSize: '26px', fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.5px' }}>
                                {cv.personalInfo.fullName}
                            </h1>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#4f46e5', marginTop: '2px' }}>
                                {cv.personalInfo.title}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: template === 'modern' ? 'flex-start' : 'center' }}>
                                <span>📧 {cv.personalInfo.email}</span>
                                <span>📱 {cv.personalInfo.phone}</span>
                                <span>📍 {cv.personalInfo.location}</span>
                                <span>🔗 {cv.personalInfo.linkedin}</span>
                                <span>💻 {cv.personalInfo.github}</span>
                            </div>
                        </div>

                        {/* Summary */}
                        {cv.summary && (
                            <div style={{ marginBottom: '14px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '6px', letterSpacing: '0.5px' }}>
                                    Professional Summary
                                </h4>
                                <p style={{ fontSize: '12px', color: '#334155', margin: 0 }}>
                                    {cv.summary}
                                </p>
                            </div>
                        )}

                        {/* Experience */}
                        <div style={{ marginBottom: '14px' }}>
                            <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '8px', letterSpacing: '0.5px' }}>
                                Work Experience
                            </h4>
                            {cv.experience.map((exp, i) => (
                                <div key={i} style={{ marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>{exp.role}</strong>
                                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{exp.startDate} - {exp.endDate}</span>
                                    </div>
                                    <div style={{ fontSize: '11.5px', color: '#4f46e5', fontWeight: 600, marginBottom: '4px' }}>
                                        {exp.company} • {exp.location}
                                    </div>
                                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11.5px', color: '#334155' }}>
                                        {exp.bullets.map((b, bI) => (
                                            <li key={bI} style={{ marginBottom: '3px' }}>{b}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        {/* Projects */}
                        {cv.projects && cv.projects.length > 0 && (
                            <div style={{ marginBottom: '14px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '8px', letterSpacing: '0.5px' }}>
                                    Featured Projects
                                </h4>
                                {cv.projects.map((p, pI) => (
                                    <div key={pI} style={{ marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                            <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>{p.name}</strong>
                                            <span style={{ fontSize: '11px', color: '#64748b' }}>{p.link}</span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginBottom: '2px' }}>
                                            Tech: {p.technologies}
                                        </div>
                                        {p.bullets && (
                                            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11.5px', color: '#334155' }}>
                                                {p.bullets.map((b, bI) => (
                                                    <li key={bI} style={{ marginBottom: '2px' }}>{b}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Skills */}
                        <div style={{ marginBottom: '14px' }}>
                            <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '6px', letterSpacing: '0.5px' }}>
                                Technical Skills
                            </h4>
                            <div style={{ fontSize: '11.5px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div><strong>Languages:</strong> {cv.skills.languages}</div>
                                <div><strong>Frameworks:</strong> {cv.skills.frameworks}</div>
                                <div><strong>Tools & Cloud:</strong> {cv.skills.tools}</div>
                            </div>
                        </div>

                        {/* Education */}
                        {cv.education && cv.education.length > 0 && (
                            <div>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px', marginBottom: '6px', letterSpacing: '0.5px' }}>
                                    Education
                                </h4>
                                {cv.education.map((edu, eI) => (
                                    <div key={eI} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#334155' }}>
                                        <div>
                                            <strong>{edu.degree}</strong> — {edu.institution}
                                        </div>
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>{edu.year}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
