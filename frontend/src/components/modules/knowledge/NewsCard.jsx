import { useState, useEffect } from 'react';
import { ExternalLink, Sparkles, Video, Flame, ShieldAlert, BookOpen, X, Share2, Check, Clock, User, ChevronRight, Layers, FileText, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { formatTimeAgo, formatDateDDMMYYYY } from '../../../utils/formatters';
import { pythonAPI } from '../../../services/api';

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
    const [expandedStory, setExpandedStory] = useState(null);
    const [isExpanding, setIsExpanding] = useState(false);
    const [expandError, setExpandError] = useState(null);

    const impactInfo = impactBadge[article.impact?.toLowerCase()] || impactBadge.medium;
    const catColor = categoryTheme[article.category] || '#8b5cf6';
    const ImpactIcon = impactInfo.icon;

    // Mobile Back Button interception: Closes modal cleanly instead of navigating away
    useEffect(() => {
        if (!isModalOpen) return;

        window.history.pushState({ modal: 'news_card' }, '');

        const handlePopState = () => {
            setIsModalOpen(false);
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isModalOpen]);

    const handleOpenModal = () => {
        setIsModalOpen(true);
        // Auto-log reading activity to tracker
        pythonAPI.post('/api/tracker/log-activity', {
            activityType: 'news',
            durationMinutes: 5,
            title: `Read: ${article.title || 'AI Intelligence Update'}`
        }).catch(() => {});
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        // If state was pushed, pop it cleanly
        if (window.history.state?.modal === 'news_card') {
            window.history.back();
        }
    };

    const handleCopy = (e) => {
        e.stopPropagation();
        const url = article.sourceUrl || article.url || window.location.href;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExpandInDepth = async () => {
        if (expandedStory) return;
        setIsExpanding(true);
        setExpandError(null);
        try {
            const data = await pythonAPI.post('/api/knowledge/news/expand', {
                title: article.title || 'AI Intelligence Breakthrough',
                summary: article.summary || '',
                source: article.author?.name || article.source || 'Tech Wire',
                category: article.category || 'AI Tech'
            });
            setExpandedStory(data);
        } catch (err) {
            console.error('Failed to generate in-depth story:', err);
            setExpandError('Could not generate full in-depth story right now. Showing standard paragraphs.');
        } finally {
            setIsExpanding(false);
        }
    };

    // Prepare multi-paragraph structure from summary if not already an array
    const rawParagraphs = article.paragraphs && article.paragraphs.length > 0
        ? article.paragraphs
        : (article.summary ? article.summary.split('\n\n').filter(p => p.trim()) : []);

    const paragraphsToDisplay = rawParagraphs.length > 0 ? rawParagraphs : [article.summary || article.title];

    return (
        <>
            <div
                onClick={handleOpenModal}
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

                {/* Main Headline */}
                <h3 style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    lineHeight: 1.45,
                    color: 'var(--text-primary)',
                    marginBottom: '10px',
                }}>
                    {article.title || (article.summary?.slice(0, 90) + '...')}
                </h3>

                {/* Preview Paragraphs (Showing 1st well-formed paragraph) */}
                <p style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.65,
                    marginBottom: '12px',
                }}>
                    {paragraphsToDisplay[0]?.length > 220 ? `${paragraphsToDisplay[0].slice(0, 220)}...` : paragraphsToDisplay[0]}
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
                        <BookOpen size={13} /> Full Paragraphs & In-Depth Story →
                    </span>
                </div>
            </div>

            {/* FULL STORY READER MODAL */}
            {isModalOpen && (
                <div
                    onClick={handleCloseModal}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(10px)',
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
                            maxWidth: '740px',
                            maxHeight: '92vh',
                            overflowY: 'auto',
                            background: '#161424',
                            borderRadius: '22px',
                            border: `1.5px solid ${catColor}55`,
                            boxShadow: '0 25px 70px rgba(0,0,0,0.85)',
                            padding: '28px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px',
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
                                onClick={handleCloseModal}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.08)',
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
                            <h2 style={{ fontSize: '23px', fontWeight: 900, lineHeight: 1.35, color: '#fff', marginBottom: '10px' }}>
                                {article.title || article.summary?.slice(0, 100)}
                            </h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                <span>✍️ Source: <strong style={{ color: 'var(--text-primary)' }}>{article.author?.name || article.source || 'DataCube AI'}</strong></span>
                                <span>🕒 Published: <strong style={{ color: 'var(--text-primary)' }}>{article.publishedAt ? formatDateDDMMYYYY(article.publishedAt) : 'Recent'}</strong></span>
                            </div>
                        </div>

                        {/* AI Deep Dive In-Depth Button */}
                        {!expandedStory && (
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(59, 130, 246, 0.15))',
                                border: '1px solid rgba(168, 85, 247, 0.3)',
                                borderRadius: '14px',
                                padding: '14px 18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '12px',
                            }}>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Sparkles size={16} color="#c084fc" /> Want full journalistic analysis & detailed paragraphs?
                                    </div>
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                                        Generate deep context, architectural mechanics, and industry market impacts.
                                    </p>
                                </div>

                                <button
                                    onClick={handleExpandInDepth}
                                    disabled={isExpanding}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '9px 18px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
                                        color: '#fff',
                                        fontSize: '12px',
                                        fontWeight: 800,
                                        border: 'none',
                                        cursor: isExpanding ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 4px 14px rgba(168, 85, 247, 0.4)',
                                    }}
                                >
                                    {isExpanding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    {isExpanding ? 'Analyzing Story...' : '✨ Generate Full In-Depth Story'}
                                </button>
                            </div>
                        )}

                        {/* EXPANDED IN-DEPTH AI STORY (Structured Multi-Paragraphs) */}
                        {expandedStory ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Executive Summary */}
                                <div style={{
                                    background: 'rgba(168, 85, 247, 0.08)',
                                    border: '1px solid rgba(168, 85, 247, 0.25)',
                                    borderRadius: '14px',
                                    padding: '18px 20px',
                                }}>
                                    <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#c084fc', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        📌 EXECUTIVE SUMMARY
                                    </h4>
                                    <p style={{ fontSize: '15px', lineHeight: 1.8, color: '#fff', margin: 0 }}>
                                        {expandedStory.executiveSummary}
                                    </p>
                                </div>

                                {/* Background & Context */}
                                {expandedStory.backgroundContext && (
                                    <div style={{
                                        background: '#1d1930',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: '14px',
                                        padding: '18px 20px',
                                    }}>
                                        <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#60a5fa', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            🌐 BACKGROUND & CONTEXT
                                        </h4>
                                        <p style={{ fontSize: '14.5px', lineHeight: 1.8, color: 'var(--text-primary)', margin: 0 }}>
                                            {expandedStory.backgroundContext}
                                        </p>
                                    </div>
                                )}

                                {/* Core Breakthrough */}
                                {expandedStory.coreBreakthrough && (
                                    <div style={{
                                        background: '#1d1930',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: '14px',
                                        padding: '18px 20px',
                                    }}>
                                        <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#34d399', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            🚀 CORE BREAKTHROUGHS & WHAT HAPPENED
                                        </h4>
                                        <p style={{ fontSize: '14.5px', lineHeight: 1.8, color: 'var(--text-primary)', margin: 0 }}>
                                            {expandedStory.coreBreakthrough}
                                        </p>
                                    </div>
                                )}

                                {/* Technical Deep Dive */}
                                {expandedStory.technicalDeepDive && (
                                    <div style={{
                                        background: '#1d1930',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: '14px',
                                        padding: '18px 20px',
                                    }}>
                                        <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#f472b6', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            🔬 TECHNICAL ARCHITECTURE & HOW IT WORKS
                                        </h4>
                                        <p style={{ fontSize: '14.5px', lineHeight: 1.8, color: 'var(--text-primary)', margin: 0 }}>
                                            {expandedStory.technicalDeepDive}
                                        </p>
                                    </div>
                                )}

                                {/* Industry & Strategic Impact */}
                                {expandedStory.industryImpact && (
                                    <div style={{
                                        background: '#1d1930',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: '14px',
                                        padding: '18px 20px',
                                    }}>
                                        <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#fbbf24', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            💼 INDUSTRY CONSEQUENCES & FUTURE OUTLOOK
                                        </h4>
                                        <p style={{ fontSize: '14.5px', lineHeight: 1.8, color: 'var(--text-primary)', margin: 0 }}>
                                            {expandedStory.industryImpact}
                                        </p>
                                    </div>
                                )}

                                {/* Key Takeaways */}
                                {expandedStory.keyTakeaways && expandedStory.keyTakeaways.length > 0 && (
                                    <div style={{
                                        background: 'rgba(16, 185, 129, 0.08)',
                                        border: '1px solid rgba(16, 185, 129, 0.25)',
                                        borderRadius: '14px',
                                        padding: '18px 20px',
                                    }}>
                                        <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#10b981', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            🎯 KEY TAKEAWAYS & ACTION POINTS
                                        </h4>
                                        <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {expandedStory.keyTakeaways.map((t, idx) => (
                                                <li key={idx} style={{ fontSize: '14px', color: '#fff', lineHeight: 1.6 }}>
                                                    {t}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* STANDARD PARAGRAPH-BY-PARAGRAPH VIEW */
                            <div style={{
                                background: '#1d1930',
                                borderRadius: '16px',
                                padding: '22px',
                                border: '1px solid rgba(255,255,255,0.06)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                            }}>
                                <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: catColor, letterSpacing: '0.5px' }}>
                                    📰 Full Story Paragraphs
                                </h4>
                                {paragraphsToDisplay.map((para, pIdx) => (
                                    <p
                                        key={pIdx}
                                        style={{
                                            fontSize: '15px',
                                            lineHeight: 1.8,
                                            color: 'var(--text-primary)',
                                            margin: 0,
                                            paddingLeft: '12px',
                                            borderLeft: `3px solid ${pIdx === 0 ? catColor : 'rgba(255,255,255,0.1)'}`,
                                        }}
                                    >
                                        {para}
                                    </p>
                                ))}
                            </div>
                        )}

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
