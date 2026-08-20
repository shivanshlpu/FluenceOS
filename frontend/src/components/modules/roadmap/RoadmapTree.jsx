import { BookOpen, Video, GraduationCap, Code, CheckCircle2, Circle, ExternalLink, Play } from 'lucide-react';
import { motion } from 'framer-motion';

const phaseColors = ['#a855f7', '#60a5fa', '#1ed760', '#fbbf24', '#f472b6'];
const phaseEmojis = ['🌱', '🌿', '🌳', '🚀', '⭐'];

// Returns style config for each resource type
function getResourceStyle(type) {
    if (type === 'course') {
        return {
            icon: GraduationCap, iconColor: '#fbbf24',
            bg: 'rgba(251, 191, 36, 0.08)', border: 'rgba(251, 191, 36, 0.2)',
            hoverBg: 'rgba(251, 191, 36, 0.15)',
            badge: '🎓 Certificate', badgeColor: '#fbbf24',
        };
    }
    if (type === 'free') {
        return {
            icon: BookOpen, iconColor: '#60a5fa',
            bg: 'rgba(96, 165, 250, 0.08)', border: 'rgba(96, 165, 250, 0.2)',
            hoverBg: 'rgba(96, 165, 250, 0.15)',
            badge: '🆓 Free', badgeColor: '#60a5fa',
        };
    }
    // default: video
    return {
        icon: Play, iconColor: '#ff0000',
        bg: 'rgba(255, 0, 0, 0.07)', border: 'rgba(255, 0, 0, 0.15)',
        hoverBg: 'rgba(255,0,0,0.14)',
        badge: '▶ Video Tutorial', badgeColor: '#ff4444',
    };
}

export default function RoadmapTree({ roadmap }) {
    if (!roadmap?.phases) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🗺️ Learning Roadmap: {roadmap.name}
            </h3>

            {roadmap.phases.map((phase, i) => {
                const color = phaseColors[i % phaseColors.length];
                return (
                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}>
                        <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '20px', borderLeft: `3px solid ${color}` }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
                                    background: `${color}22`, display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: '20px', flexShrink: 0,
                                }}>{phaseEmojis[i]}</div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <h4 style={{ fontWeight: 700, fontSize: '16px' }}>Phase {phase.phase}: {phase.title}</h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontSize: '11px', fontWeight: 700, background: `${color}1A`, color }}>{phase.duration}</span>
                                            {phase.isCompleted ? <CheckCircle2 size={18} color="var(--success)" /> : <Circle size={18} color="var(--text-muted)" />}
                                        </div>
                                    </div>

                                    {/* Topics */}
                                    <div style={{ marginBottom: '14px' }}>
                                        <p className="label-caps" style={{ marginBottom: '8px' }}>Topics</p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {phase.topics?.map((topic, j) => (
                                                <span key={j} style={{ fontSize: '13px', padding: '4px 12px', background: 'var(--bg-elevated-2)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}>{topic}</span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Resources: YouTube videos + Professional courses */}
                                    {phase.resources?.length > 0 && (
                                        <div style={{ marginBottom: '14px' }}>
                                            <p className="label-caps" style={{ marginBottom: '8px' }}>Learning Resources</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {phase.resources.map((res, j) => {
                                                    const s = getResourceStyle(res.type);
                                                    const Icon = s.icon;
                                                    return (
                                                        <a key={j} href={res.url} target="_blank" rel="noopener noreferrer"
                                                            style={{
                                                                padding: '10px 14px', borderRadius: 'var(--radius-md)',
                                                                background: s.bg, border: `1px solid ${s.border}`,
                                                                color: 'var(--text-primary)',
                                                                fontSize: '13px', fontWeight: 600,
                                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                                textDecoration: 'none',
                                                                transition: 'background 0.18s',
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = s.hoverBg}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = s.bg}
                                                        >
                                                            <Icon size={15} color={s.iconColor} style={{ flexShrink: 0 }} />
                                                            <span style={{ flex: 1, lineHeight: 1.4 }}>{res.title}</span>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                                {res.channel && (
                                                                    <span style={{ fontSize: '10px', fontWeight: 700, color: s.badgeColor, padding: '2px 7px', borderRadius: 'var(--radius-pill)', background: `${s.badgeColor}18`, whiteSpace: 'nowrap' }}>
                                                                        {res.channel}
                                                                    </span>
                                                                )}
                                                                <ExternalLink size={12} color="var(--text-muted)" />
                                                            </div>
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Projects with direct YouTube tutorial links */}
                                    {phase.projects?.length > 0 && (
                                        <div>
                                            <p className="label-caps" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Code size={12} color="var(--accent)" /> Build Projects
                                            </p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {phase.projects.map((project, j) => {
                                                    const isObj = typeof project === 'object' && project !== null;
                                                    const name = isObj ? project.name : project;
                                                    const url = isObj ? project.youtubeUrl : null;
                                                    const channel = isObj ? project.channel : null;

                                                    return url ? (
                                                        <a key={j} href={url} target="_blank" rel="noopener noreferrer"
                                                            style={{
                                                                padding: '10px 14px', borderRadius: 'var(--radius-md)',
                                                                background: 'var(--accent-subtle)', border: '1px solid rgba(30,215,96,0.15)',
                                                                color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600,
                                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                                textDecoration: 'none', transition: 'background 0.18s',
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(30,215,96,0.12)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent-subtle)'}
                                                        >
                                                            <Code size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
                                                            <span style={{ flex: 1 }}>{name}</span>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                                {channel && (
                                                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#ff4444', padding: '2px 7px', borderRadius: 'var(--radius-pill)', background: 'rgba(255,0,0,0.1)', whiteSpace: 'nowrap' }}>
                                                                        {channel}
                                                                    </span>
                                                                )}
                                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                                                                    <Play size={11} color="#ff0000" /> Watch Tutorial
                                                                </span>
                                                                <ExternalLink size={11} color="var(--text-muted)" />
                                                            </div>
                                                        </a>
                                                    ) : (
                                                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', padding: '6px 0' }}>
                                                            <Code size={14} color="var(--accent)" /> {name}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
