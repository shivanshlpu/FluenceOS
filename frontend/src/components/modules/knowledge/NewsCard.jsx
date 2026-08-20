import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Sparkles, Video, Flame, ShieldAlert, BookOpen, Share2 } from 'lucide-react';
import { formatTimeAgo } from '../../../utils/formatters';

const impactBadge = {
    critical: { bg: '#ef444422', color: '#ef4444', border: '#ef444444', icon: ShieldAlert, label: 'Critical' },
    high: { bg: '#f59e0b22', color: '#f59e0b', border: '#f59e0b44', icon: Flame, label: 'High Impact' },
    medium: { bg: '#3b82f622', color: '#60a5fa', border: '#3b82f644', icon: Sparkles, label: 'Insight' },
};

const categoryTheme = {
    'AI Safety & Security': '#ef4444',
    'LLM': '#a855f7',
    'Tech': '#3b82f6',
    'Investment': '#10b981',
    'Tips': '#ec4899',
    'Video': '#f43f5e',
};

export default function NewsCard({ article, index = 0 }) {
    const [expanded, setExpanded] = useState(false);
    const impactInfo = impactBadge[article.impact?.toLowerCase()] || impactBadge.medium;
    const catColor = categoryTheme[article.category] || '#8b5cf6';
    const ImpactIcon = impactInfo.icon;

    return (
        <div
            onClick={() => setExpanded(!expanded)}
            style={{
                background: expanded ? 'var(--bg-elevated-2)' : 'var(--bg-elevated-1)',
                border: expanded ? `1px solid ${catColor}44` : '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                borderRadius: 'var(--radius-md, 12px)',
                padding: '16px',
                marginBottom: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: expanded ? '0 8px 24px rgba(0,0,0,0.35)' : 'none',
            }}
        >
            {/* Top row: Number, badges, date, source */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: 'var(--text-muted)',
                        padding: '2px 8px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '6px',
                    }}>
                        #{index + 1}
                    </span>

                    {/* Category pill */}
                    <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 10px',
                        borderRadius: '12px',
                        background: `${catColor}20`,
                        color: catColor,
                        border: `1px solid ${catColor}40`,
                    }}>
                        {article.category}
                    </span>

                    {/* Impact badge */}
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: impactInfo.bg,
                        color: impactInfo.color,
                        border: `1px solid ${impactInfo.border}`,
                    }}>
                        <ImpactIcon size={12} />
                        {impactInfo.label}
                    </span>

                    {article.isVideo && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: '#ff000020',
                            color: '#ff4444',
                        }}>
                            <Video size={12} /> Video
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {article.publishedAt ? formatTimeAgo(article.publishedAt) : ''}
                    </span>
                    {expanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                </div>
            </div>

            {/* Main content / summary */}
            <div style={{
                fontSize: '15px',
                fontWeight: 600,
                lineHeight: 1.5,
                color: 'var(--text-primary)',
                marginBottom: '10px',
            }}>
                {expanded ? article.summary : (article.summary?.length > 180 ? `${article.summary.slice(0, 180)}...` : article.summary)}
            </div>

            {/* Tags row */}
            {article.tags && article.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {article.tags.map((tag, tIdx) => (
                        <span key={tIdx} style={{
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            background: 'rgba(255,255,255,0.06)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                        }}>
                            #{tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Footer row: Source info and external action */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255,255,255,0.04)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: `${catColor}30`,
                        color: catColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 800,
                    }}>
                        {article.author?.name ? article.author.name.slice(0, 2).toUpperCase() : article.source.slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {article.author?.name || article.source}
                    </span>
                </div>

                <a
                    href={article.sourceUrl || article.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-pill, 9999px)',
                        background: 'rgba(255,255,255,0.08)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = catColor}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                >
                    Read Source <ExternalLink size={13} />
                </a>
            </div>
        </div>
    );
}
