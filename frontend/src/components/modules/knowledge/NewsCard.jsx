import { useState } from 'react';
import { ExternalLink, Sparkles, Video, Flame, ShieldAlert, BookOpen, X, Share2, Check, Clock, User } from 'lucide-react';
import { formatTimeAgo, formatDateDDMMYYYY } from '../../../utils/formatters';

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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const impactInfo = impactBadge[article.impact?.toLowerCase()] || impactBadge.medium;
    const catColor = categoryTheme[article.category] || '#8b5cf6';
    const ImpactIcon = impactInfo.icon;

    const handleCopy = (e) => {
        e.stopPropagation();
        const url = article.sourceUrl || article.url || window.location.href;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <div
                onClick={() => setIsModalOpen(true)}
                style={{
                    background: 'var(--bg-elevated-1)',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                    borderRadius: 'var(--radius-md, 12px)',
                    padding: '18px',
                    marginBottom: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-elevated-2)';
                    e.currentTarget.style.borderColor = `${catColor}55`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-elevated-1)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            >
                {/* Top row: Number, badges, date, source */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                            fontSize: '11px',
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <Clock size={12} />
                        <span>{article.publishedAt ? formatDateDDMMYYYY(article.publishedAt) : 'Recent'}</span>
                    </div>
                </div>

                {/* Main Headline & preview snippet */}
                <h3 style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    lineHeight: 1.45,
                    color: 'var(--text-primary)',
                    marginBottom: '8px',
                }}>
                    {article.title || (article.summary?.slice(0, 90) + '...')}
                </h3>

                <p style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    marginBottom: '12px',
                }}>
                    {article.summary?.length > 200 ? `${article.summary.slice(0, 200)}...` : article.summary}
                </p>

                {/* Tags row */}
                {article.tags && article.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                        {article.tags.slice(0, 4).map((tag, tIdx) => (
                            <span key={tIdx} style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                background: 'rgba(255,255,255,0.04)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                            }}>
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Footer row: Publisher info & Read Article CTA */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
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
                            {article.author?.name ? article.author.name.slice(0, 2).toUpperCase() : (article.source ? article.source.slice(0, 2).toUpperCase() : 'AI')}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {article.author?.name || article.source || 'DataCube News'}
                        </span>
                    </div>

                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: catColor,
                    }}>
                        <BookOpen size={13} /> Tap to read full story →
                    </span>
                </div>
            </div>

            {/* FULL STORY READER MODAL */}
            {isModalOpen && (
                <div
                    onClick={() => setIsModalOpen(false)}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0, 0, 0, 0.82)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: '680px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            background: 'var(--bg-elevated-1, #181818)',
                            borderRadius: '20px',
                            border: `1.5px solid ${catColor}55`,
                            boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                            padding: '28px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '18px',
                        }}
                    >
                        {/* Modal Header Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    background: `${catColor}20`,
                                    color: catColor,
                                    border: `1px solid ${catColor}40`,
                                }}>
                                    {article.category}
                                </span>
                                <span style={{
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    background: impactInfo.bg,
                                    color: impactInfo.color,
                                }}>
                                    {impactInfo.label}
                                </span>
                            </div>

                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: 'var(--bg-elevated-2)',
                                    color: '#fff',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Title & Metadata */}
                        <div>
                            <h2 style={{ fontSize: '22px', fontWeight: 900, lineHeight: 1.4, color: '#fff', marginBottom: '8px' }}>
                                {article.title || article.summary?.slice(0, 100)}
                            </h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                <span>✍️ Source: <strong style={{ color: 'var(--text-primary)' }}>{article.author?.name || article.source || 'DataCube AI'}</strong></span>
                                <span>🕒 Published: <strong style={{ color: 'var(--text-primary)' }}>{article.publishedAt ? formatDateDDMMYYYY(article.publishedAt) : 'Recent'}</strong></span>
                            </div>
                        </div>

                        {/* Full Comprehensive Content */}
                        <div style={{
                            background: 'var(--bg-elevated-2, #202020)',
                            borderRadius: '14px',
                            padding: '20px',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: catColor, marginBottom: '10px', letterSpacing: '0.5px' }}>
                                📰 Full Story & Summary
                            </h4>
                            <p style={{ fontSize: '15px', lineHeight: 1.75, color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                                {article.summary}
                            </p>
                        </div>

                        {/* Key Takeaways & Topics */}
                        {article.tags && article.tags.length > 0 && (
                            <div>
                                <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    🏷️ Topics & Tags:
                                </h4>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {article.tags.map((t, idx) => (
                                        <span key={idx} style={{
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            background: 'rgba(255,255,255,0.06)',
                                            color: '#fff',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                        }}>
                                            #{t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Modal Action Bar */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                            paddingTop: '12px',
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                        }}>
                            <button
                                onClick={handleCopy}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '10px 16px',
                                    borderRadius: '10px',
                                    background: 'var(--bg-elevated-2)',
                                    color: '#fff',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                {copied ? <Check size={15} color="#10b981" /> : <Share2 size={15} />}
                                {copied ? 'Link Copied!' : 'Share'}
                            </button>

                            <a
                                href={article.sourceUrl || article.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 24px',
                                    borderRadius: '10px',
                                    background: catColor,
                                    color: '#fff',
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    textDecoration: 'none',
                                    boxShadow: `0 4px 15px ${catColor}44`,
                                }}
                            >
                                Read Original Article on {article.source || 'Web'} <ExternalLink size={14} />
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
