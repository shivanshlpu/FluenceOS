import { useEffect, useState } from 'react';
import NewsCard from './NewsCard';
import { pythonAPI } from '../../../services/api';
import { RefreshCw, Loader, AlertCircle, Sparkles, TrendingUp, DollarSign, Lightbulb, Video, Calendar, Globe, Search } from 'lucide-react';

const TYPE_TABS = [
    { id: 'tech', label: 'AI Tech & Research', icon: Sparkles, color: '#a855f7' },
    { id: 'investment', label: 'Startups & Funding', icon: DollarSign, color: '#10b981' },
    { id: 'tips', label: 'Practical AI Tips', icon: Lightbulb, color: '#ec4899' },
    { id: 'videos', label: 'Video Summaries', icon: Video, color: '#ef4444' },
    { id: 'trends', label: 'Trending Topics', icon: TrendingUp, color: '#3b82f6' },
];

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
    { code: 'zh', label: '中文' },
    { code: 'fr', label: 'Français' },
    { code: 'es', label: 'Español' },
    { code: 'ja', label: '日本語' },
];

export default function KnowledgeDashboard() {
    const [activeType, setActiveType] = useState('tech');
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [periods, setPeriods] = useState([]);
    const [language, setLanguage] = useState('en');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState('All');

    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastRefreshed, setLastRefreshed] = useState(null);

    // Load available periods on mount
    useEffect(() => {
        const loadPeriods = async () => {
            try {
                const data = await pythonAPI.get('/api/knowledge/periods');
                const weeksList = data?.weeks || [];
                const allDays = [];
                weeksList.forEach(w => {
                    if (w.days) {
                        w.days.forEach(d => allDays.push({ id: d.id, label: `${d.id} (${d.weekday || ''})` }));
                    }
                    allDays.push({ id: w.id, label: `Week: ${w.label || w.id}` });
                });
                setPeriods(allDays);
                if (allDays.length > 0) {
                    setSelectedPeriod(allDays[0].id);
                }
            } catch (err) {
                console.warn('Could not load period list, using default today:', err);
            }
        };
        loadPeriods();
    }, []);

    // Load news whenever activeType, selectedPeriod, or language changes
    useEffect(() => {
        loadNews();
    }, [activeType, selectedPeriod, language]);

    const loadNews = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                type: activeType,
                lang: language,
            };
            if (selectedPeriod) {
                params.period = selectedPeriod;
            }

            const data = await pythonAPI.get('/api/knowledge/news', { params });
            const list = Array.isArray(data.articles) ? data.articles : (Array.isArray(data) ? data : []);
            setArticles(list);
            setLastRefreshed(new Date());
        } catch (err) {
            console.error('Knowledge news fetch failed:', err);
            setError('Failed to load news from DataCube AI API. Falling back to local cache.');
            setArticles([]);
        } finally {
            setLoading(false);
        }
    };

    // Extract all unique tags
    const allTags = ['All', ...new Set(articles.flatMap(a => a.tags || []))].slice(0, 15);

    // Filter by search and tag
    const filteredArticles = articles.filter(a => {
        const matchesTag = selectedTag === 'All' || (a.tags && a.tags.includes(selectedTag));
        const matchesSearch = !searchQuery ||
            a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.category?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTag && matchesSearch;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Toolbar: Free DataCube API Banner & Type Tabs */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-lg, 16px)',
                padding: '20px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px' }}>⚡</span>
                            <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)' }}>
                                Daily AI News & Intelligence
                            </h2>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: '#10b98122',
                                color: '#10b981',
                                border: '1px solid #10b98144',
                            }}>
                                100% Free Public API
                            </span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Curated AI breakthroughs, venture funding, prompts & videos from 35+ global sources.
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Language Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-elevated-2)', padding: '6px 12px', borderRadius: '8px' }}>
                            <Globe size={14} color="var(--text-muted)" />
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-primary)',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    outline: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                {LANGUAGES.map(l => (
                                    <option key={l.code} value={l.code} style={{ background: '#1e1e1e', color: '#fff' }}>
                                        {l.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Period / Date Selector */}
                        {periods.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-elevated-2)', padding: '6px 12px', borderRadius: '8px' }}>
                                <Calendar size={14} color="var(--text-muted)" />
                                <select
                                    value={selectedPeriod}
                                    onChange={(e) => setSelectedPeriod(e.target.value)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-primary)',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        outline: 'none',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {periods.map(p => (
                                        <option key={p.id} value={p.id} style={{ background: '#1e1e1e', color: '#fff' }}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button
                            onClick={loadNews}
                            title="Refresh Feed"
                            style={{
                                width: '36px', height: '36px', borderRadius: '8px',
                                background: 'var(--bg-elevated-2)', color: 'var(--text-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: 'none', cursor: 'pointer',
                            }}
                        >
                            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Category Type Pills */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {TYPE_TABS.map((tab) => {
                        const TabIcon = tab.icon;
                        const isActive = activeType === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveType(tab.id);
                                    setSelectedTag('All');
                                }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 16px',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: isActive ? '#fff' : 'var(--text-secondary)',
                                    background: isActive ? tab.color : 'rgba(255,255,255,0.05)',
                                    border: isActive ? `1px solid ${tab.color}` : '1px solid rgba(255,255,255,0.05)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <TabIcon size={15} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Search and Tags Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--bg-elevated-1)',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    flex: '1',
                    minWidth: '240px',
                    border: '1px solid rgba(255,255,255,0.08)',
                }}>
                    <Search size={16} color="var(--text-muted)" />
                    <input
                        type="text"
                        placeholder="Search headlines, companies, topics..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            width: '100%',
                        }}
                    />
                </div>

                {allTags.length > 1 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {allTags.map((tag) => (
                            <button
                                key={tag}
                                onClick={() => setSelectedTag(tag)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    background: selectedTag === tag ? 'var(--text-primary)' : 'var(--bg-elevated-1)',
                                    color: selectedTag === tag ? '#000' : 'var(--text-secondary)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    cursor: 'pointer',
                                }}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Articles List / States */}
            {loading ? (
                <div style={{ padding: '60px 24px', textAlign: 'center', background: 'var(--bg-elevated-1)', borderRadius: '16px' }}>
                    <Loader size={32} color="#a855f7" className="animate-spin" style={{ margin: '0 auto 12px', display: 'block' }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>
                        Fetching real-time updates from DataCube AI API...
                    </p>
                </div>
            ) : error ? (
                <div style={{ padding: '40px 24px', textAlign: 'center', background: 'var(--bg-elevated-1)', borderRadius: '16px' }}>
                    <AlertCircle size={36} color="#ef4444" style={{ margin: '0 auto 12px', display: 'block' }} />
                    <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>Unable to reach API</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>{error}</p>
                    <button
                        onClick={loadNews}
                        style={{
                            padding: '8px 20px',
                            borderRadius: '9999px',
                            background: 'var(--accent, #a855f7)',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        Retry
                    </button>
                </div>
            ) : filteredArticles.length === 0 ? (
                <div style={{ padding: '60px 24px', textAlign: 'center', background: 'var(--bg-elevated-1)', borderRadius: '16px' }}>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>No articles found</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Try changing category, search filter, or period.
                    </p>
                </div>
            ) : (
                <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 600 }}>
                        Showing {filteredArticles.length} updates for {selectedPeriod || 'Latest'}
                    </div>
                    <div>
                        {filteredArticles.map((article, i) => (
                            <NewsCard key={article.id || i} article={article} index={i} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
