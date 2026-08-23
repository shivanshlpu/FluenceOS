import { useEffect, useState } from 'react';
import {
    Flame, Award, Target, CheckCircle2, Circle, TrendingUp, Calendar,
    Zap, ShieldCheck, RefreshCw, BarChart2, Sparkles, CheckCheck,
    Loader, Clock, Activity, Play, ChevronRight, Info
} from 'lucide-react';
import { pythonAPI } from '../../../services/api';
import {
    useActiveTimeTracker,
    formatTimeHoursMinsSecs,
    formatTimeCompact,
    getTodayDateString
} from '../../../hooks/useActiveTimeTracker';

const GOALS_CACHE_KEY = 'fluence_tracker_goals_today';

export default function TrackerDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [goals, setGoals] = useState([]);
    const [checkingIn, setCheckingIn] = useState(false);
    const [checkinSuccess, setCheckinSuccess] = useState(false);
    
    // Global active time tracker hook
    const { todaySeconds, todayMinutes, formattedTime, isTracking } = useActiveTimeTracker();

    // Selected day in the heatmap for interactive touch / click inspection (default to today)
    const [selectedDate, setSelectedDate] = useState(() => getTodayDateString());

    useEffect(() => {
        loadTrackerData();
    }, []);

    const loadTrackerData = async () => {
        setLoading(true);
        try {
            const res = await pythonAPI.get('/api/tracker/dashboard');
            setData(res);
            if (res.dailyGoals && Array.isArray(res.dailyGoals)) {
                setGoals(res.dailyGoals);
                try {
                    localStorage.setItem(GOALS_CACHE_KEY, JSON.stringify(res.dailyGoals));
                } catch (e) {}
            }
        } catch (err) {
            console.error('Tracker data load failed:', err);
            try {
                const cached = localStorage.getItem(GOALS_CACHE_KEY);
                if (cached) setGoals(JSON.parse(cached));
            } catch (e) {}
        } finally {
            setLoading(false);
        }
    };

    const toggleGoal = async (goalId) => {
        const targetGoal = goals.find(g => g.id === goalId);
        if (!targetGoal) return;
        const newStatus = !targetGoal.completed;

        // Optimistic UI update
        const updatedGoals = goals.map(g => g.id === goalId ? { ...g, completed: newStatus } : g);
        setGoals(updatedGoals);
        try {
            localStorage.setItem(GOALS_CACHE_KEY, JSON.stringify(updatedGoals));
        } catch (e) {}

        try {
            await pythonAPI.post('/api/tracker/toggle-goal', {
                goalId,
                completed: newStatus,
                goalDate: data?.todayDate || getTodayDateString()
            });
            // Re-fetch quietly to update heatmap and streaks
            const res = await pythonAPI.get('/api/tracker/dashboard');
            setData(res);
        } catch (err) {
            console.warn('Failed to sync goal toggle to backend:', err);
        }
    };

    const handleClaimDailyStreak = async () => {
        setCheckingIn(true);
        try {
            await pythonAPI.post('/api/tracker/checkin', { note: 'Daily habit check-in from Tracker' });
            setCheckinSuccess(true);
            const res = await pythonAPI.get('/api/tracker/dashboard');
            setData(res);
            if (res.dailyGoals) setGoals(res.dailyGoals);
            setTimeout(() => setCheckinSuccess(false), 3500);
        } catch (err) {
            console.warn('Checkin failed:', err);
        } finally {
            setCheckingIn(false);
        }
    };

    // Generate last 16 weeks (112 days) grid for the GitHub/LeetCode style heatmap
    const generateHeatmapDays = () => {
        const days = [];
        const today = new Date();
        const todayStr = getTodayDateString();
        const rawHeatmap = data?.heatmap || {};
        const heatmapMinutesMap = data?.heatmapMinutes || {};

        for (let i = 111; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            const isToday = dateStr === todayStr;

            const dayObj = rawHeatmap[dateStr] || {};
            // Minutes: use live tracker minutes if today, otherwise backend record
            let minutes = dayObj.minutes || heatmapMinutesMap[dateStr] || 0;
            if (isToday && todayMinutes > minutes) {
                minutes = todayMinutes;
            }

            const count = dayObj.count || (minutes > 0 ? 1 : 0);
            const activities = dayObj.activities || (minutes > 0 ? [`Active Practice (${minutes}m)`] : []);

            days.push({
                date: dateStr,
                rawDate: d,
                minutes: minutes,
                count: count,
                activities: activities,
                isToday: isToday,
                formattedDate: d.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                }),
                dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
            });
        }
        return days;
    };

    const heatmapDays = generateHeatmapDays();

    // LeetCode / GitHub style green colors based on active minutes spent
    const getHeatmapColor = (minutes) => {
        if (!minutes || minutes <= 0) return 'rgba(255, 255, 255, 0.05)';
        if (minutes <= 15) return '#0e4429';   // Tier 1: Light Green (1 - 15 mins)
        if (minutes <= 45) return '#006d32';   // Tier 2: Mid Green (16 - 45 mins)
        if (minutes <= 90) return '#26a641';   // Tier 3: Dark Green (46 - 90 mins)
        return '#39d353';                      // Tier 4: Intense Glowing Green (90+ mins)
    };

    const getHeatmapBorder = (minutes, isSelected) => {
        if (isSelected) return '2px solid #ffffff';
        if (!minutes || minutes <= 0) return '1px solid rgba(255, 255, 255, 0.06)';
        if (minutes <= 15) return '1px solid rgba(22, 101, 52, 0.6)';
        if (minutes <= 45) return '1px solid rgba(21, 128, 61, 0.7)';
        if (minutes <= 90) return '1px solid rgba(34, 197, 94, 0.8)';
        return '1px solid #4ade80';
    };

    const getTierLabel = (minutes) => {
        if (!minutes || minutes <= 0) return { label: 'Rest Day (0m)', badge: '💤 Rest', color: '#6b7280' };
        if (minutes <= 15) return { label: `Light Practice (${minutes}m)`, badge: '🌱 Starter', color: '#34d399' };
        if (minutes <= 45) return { label: `Consistent Practice (${minutes}m)`, badge: '🌿 Good', color: '#10b981' };
        if (minutes <= 90) return { label: `Deep Focus (${minutes}m)`, badge: '🚀 High Focus', color: '#22c55e' };
        return { label: `Master Immersion (${minutes}m)`, badge: '👑 Master Session', color: '#39d353' };
    };

    const selectedDayData = heatmapDays.find(d => d.date === selectedDate) || heatmapDays[heatmapDays.length - 1] || {
        date: getTodayDateString(),
        formattedDate: 'Today',
        minutes: todayMinutes,
        count: 1,
        activities: ['Active App Learning (Live)']
    };

    const completedGoalsCount = goals.filter(g => g.completed).length;
    const progressPercent = goals.length > 0 ? Math.round((completedGoalsCount / goals.length) * 100) : 0;
    const isTodayActive = data?.todayActive || data?.currentStreak > 0 || todayMinutes > 0;

    // Daily active time vs 30-min recommendation progress
    const dailyTargetMinutes = 30;
    const currentTodayMinutes = Math.max(todayMinutes, data?.todayMinutes || 0);
    const dailyTimeProgress = Math.min(100, Math.round((currentTodayMinutes / dailyTargetMinutes) * 100));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Live Continuous Active Time Banner */}
            <div style={{
                padding: '18px 24px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 78, 59, 0.25))',
                border: '1.5px solid rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                        flexShrink: 0,
                    }}>
                        ⏱️
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                display: 'inline-block',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: isTracking ? '#34d399' : '#f59e0b',
                                boxShadow: isTracking ? '0 0 8px #34d399' : 'none',
                                animation: isTracking ? 'pulse 1.5s infinite' : 'none'
                            }} />
                            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#34d399' }}>
                                {isTracking ? 'Live Active Timer' : 'Paused (Idle)'}
                            </span>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginTop: '2px' }}>
                            {formattedTime} <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>today</span>
                        </div>
                    </div>
                </div>

                {/* Progress bar towards daily 30m goal */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px', flex: '1', maxWidth: '380px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Daily Target (30 mins)</span>
                        <span style={{ color: '#34d399' }}>{currentTodayMinutes}m / 30m ({dailyTimeProgress}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${dailyTimeProgress}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #10b981, #34d399)',
                            borderRadius: '4px',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>
            </div>

            {/* Top Row: Streak Banner & Highlights */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
            }}>
                {/* Current Streak Card */}
                <div style={{
                    padding: '20px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(249, 115, 22, 0.18))',
                    border: '1.5px solid rgba(249, 115, 22, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #ef4444, #f97316)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '26px',
                            boxShadow: '0 4px 15px rgba(249, 115, 22, 0.4)',
                            flexShrink: 0,
                        }}>
                            🔥
                        </div>
                        <div>
                            <div style={{ fontSize: '30px', fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
                                {data?.currentStreak ?? 1} <span style={{ fontSize: '16px', fontWeight: 700, color: '#fba76a' }}>Days</span>
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#fb923c', marginTop: '2px' }}>
                                Active Practice Streak
                            </div>
                        </div>
                    </div>

                    {/* Quick Claim Button */}
                    <button
                        onClick={handleClaimDailyStreak}
                        disabled={checkingIn}
                        style={{
                            padding: '8px 14px',
                            borderRadius: '10px',
                            background: checkinSuccess ? '#10b981' : (isTodayActive ? 'rgba(249, 115, 22, 0.25)' : 'linear-gradient(135deg, #ef4444, #f97316)'),
                            color: '#fff',
                            border: `1px solid ${checkinSuccess ? '#10b981' : 'rgba(249, 115, 22, 0.5)'}`,
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: checkingIn ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {checkingIn ? <Loader size={13} className="animate-spin" /> : checkinSuccess ? <CheckCheck size={14} /> : <Zap size={13} />}
                        {checkinSuccess ? 'Streak Secured!' : isTodayActive ? 'Keep Streak 🔥' : 'Claim Streak'}
                    </button>
                </div>

                {/* Longest Streak */}
                <div style={{
                    padding: '20px',
                    borderRadius: '16px',
                    background: 'var(--bg-elevated-1)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                }}>
                    <div style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        flexShrink: 0,
                    }}>
                        ⚡
                    </div>
                    <div>
                        <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
                            {data?.longestStreak ?? 1} <span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Days</span>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Personal Best Streak
                        </div>
                    </div>
                </div>

                {/* This Week Active Time */}
                <div style={{
                    padding: '20px',
                    borderRadius: '16px',
                    background: 'var(--bg-elevated-1)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                }}>
                    <div style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        flexShrink: 0,
                    }}>
                        📅
                    </div>
                    <div>
                        <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
                            {formatTimeCompact((data?.weeklyMinutes || 0) * 60 + (todaySeconds % 3600))}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '2px' }}>
                            This Week's Active Time
                        </div>
                    </div>
                </div>
            </div>

            {/* GitHub & LeetCode Style Time-Scaled Heatmap with Interactive Touch */}
            <div style={{
                padding: '24px',
                borderRadius: '16px',
                background: 'var(--bg-elevated-1)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Calendar size={20} color="#10b981" />
                        <div>
                            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                                Learning Heatmap (Past 16 Weeks)
                            </h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Touch or click any box to view exact active time & activity details
                            </p>
                        </div>
                    </div>

                    {/* Time-Based Legend Bar */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                        <span>0m</span>
                        <div title="0 mins" style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.06)' }} />
                        <div title="1-15 mins" style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#0e4429', border: '1px solid #166534' }} />
                        <div title="16-45 mins" style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#006d32', border: '1px solid #15803d' }} />
                        <div title="46-90 mins" style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#26a641', border: '1px solid #22c55e' }} />
                        <div title="90+ mins" style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#39d353', border: '1px solid #4ade80', boxShadow: '0 0 6px rgba(57, 211, 83, 0.6)' }} />
                        <span>90m+</span>
                    </div>
                </div>

                {/* Heatmap Grid (7 rows x 16 columns) */}
                <div style={{
                    display: 'grid',
                    gridTemplateRows: 'repeat(7, 15px)',
                    gridAutoFlow: 'column',
                    gridAutoColumns: '15px',
                    gap: '4px',
                    overflowX: 'auto',
                    padding: '8px 4px 14px',
                    WebkitOverflowScrolling: 'touch',
                }}>
                    {heatmapDays.map((day, idx) => {
                        const isSelected = day.date === selectedDate;
                        const cellColor = getHeatmapColor(day.minutes);
                        const cellBorder = getHeatmapBorder(day.minutes, isSelected);

                        return (
                            <div
                                key={idx}
                                onClick={() => setSelectedDate(day.date)}
                                title={`${day.formattedDate}\nActive Time: ${day.minutes} mins\nClick to inspect details`}
                                style={{
                                    width: '15px',
                                    height: '15px',
                                    borderRadius: '3px',
                                    background: cellColor,
                                    border: cellBorder,
                                    cursor: 'pointer',
                                    transform: isSelected ? 'scale(1.35)' : 'scale(1)',
                                    boxShadow: isSelected ? '0 0 10px rgba(255, 255, 255, 0.8)' : (day.minutes >= 90 ? '0 0 6px rgba(57, 211, 83, 0.4)' : 'none'),
                                    zIndex: isSelected ? 5 : 1,
                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.transform = 'scale(1.25)';
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.transform = 'scale(1)';
                                }}
                            />
                        );
                    })}
                </div>

                {/* Interactive Selected Day Detail Inspector Card */}
                {selectedDayData && (
                    <div style={{
                        marginTop: '14px',
                        padding: '16px 20px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        animation: 'fadeIn 0.2s ease',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={16} color="#10b981" />
                                <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                                    {selectedDayData.formattedDate} {selectedDayData.isToday && <span style={{ color: '#34d399', fontSize: '12px' }}>(Today)</span>}
                                </span>
                            </div>

                            {/* Status & Tier Badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                    padding: '3px 10px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    background: `${getTierLabel(selectedDayData.minutes).color}22`,
                                    color: getTierLabel(selectedDayData.minutes).color,
                                    border: `1px solid ${getTierLabel(selectedDayData.minutes).color}44`,
                                }}>
                                    {getTierLabel(selectedDayData.minutes).badge}
                                </span>

                                <span style={{
                                    padding: '3px 10px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    background: selectedDayData.minutes > 0 ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255,255,255,0.05)',
                                    color: selectedDayData.minutes > 0 ? '#fb923c' : 'var(--text-muted)',
                                    border: `1px solid ${selectedDayData.minutes > 0 ? 'rgba(249, 115, 22, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                                }}>
                                    {selectedDayData.minutes > 0 ? '🔥 Streak Counted' : '⚪ Inactive'}
                                </span>
                            </div>
                        </div>

                        {/* Active Time Highlight */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '20px', fontWeight: 900, color: '#fff' }}>
                                {formatTimeCompact(selectedDayData.minutes * 60)}
                            </span>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                total active learning time recorded
                            </span>
                        </div>

                        {/* Detailed Activity Logs */}
                        {selectedDayData.activities && selectedDayData.activities.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '4px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Activities Logged ({selectedDayData.activities.length}):
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {selectedDayData.activities.map((act, i) => (
                                        <span
                                            key={i}
                                            style={{
                                                fontSize: '12px',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                color: 'var(--text-primary)',
                                            }}
                                        >
                                            ✓ {act}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Mid Section: Daily Goals Checklist + Skill Radar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {/* Daily Goals Checklist */}
                <div style={{
                    padding: '24px',
                    borderRadius: '16px',
                    background: 'var(--bg-elevated-1)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Target size={18} color="#a855f7" />
                            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>Today's Growth Targets</h3>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#10b981' }}>
                            {completedGoalsCount} / {goals.length} Done ({progressPercent}%)
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', marginBottom: '18px', overflow: 'hidden' }}>
                        <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #a855f7, #10b981)', transition: 'width 0.3s ease' }} />
                    </div>

                    {/* Goals List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {goals.map(goal => (
                            <div
                                key={goal.id}
                                onClick={() => toggleGoal(goal.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    background: goal.completed ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-elevated-2)',
                                    border: goal.completed ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(255,255,255,0.04)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '18px' }}>{goal.icon}</span>
                                    <span style={{
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color: goal.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                                        textDecoration: goal.completed ? 'line-through' : 'none',
                                    }}>
                                        {goal.title}
                                    </span>
                                </div>
                                {goal.completed ? <CheckCircle2 size={18} color="#10b981" /> : <Circle size={18} color="var(--text-muted)" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Skill Mastery Progression */}
                <div style={{
                    padding: '24px',
                    borderRadius: '16px',
                    background: 'var(--bg-elevated-1)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <BarChart2 size={18} color="#60a5fa" />
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>Skill Mastery Levels</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {[
                            { name: 'Spoken Fluency (WPM & Flow)', val: data?.skillRadar?.fluency ?? 84, color: '#a855f7' },
                            { name: 'Grammar & Sentence Accuracy', val: data?.skillRadar?.grammarAccuracy ?? 88, color: '#10b981' },
                            { name: 'Advanced Native Vocabulary', val: data?.skillRadar?.vocabulary ?? 76, color: '#f59e0b' },
                            { name: 'Pronunciation & Clarity', val: data?.skillRadar?.pronunciation ?? 82, color: '#3b82f6' },
                            { name: 'Daily Habit Consistency', val: data?.skillRadar?.consistency ?? 90, color: '#ec4899' },
                        ].map((skill, i) => (
                            <div key={i}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{skill.name}</span>
                                    <span style={{ color: skill.color }}>{skill.val}%</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${skill.val}%`, height: '100%', background: skill.color, borderRadius: '3px' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Milestone Badges Gallery */}
            <div style={{
                padding: '24px',
                borderRadius: '16px',
                background: 'var(--bg-elevated-1)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Award size={18} color="#fbbf24" />
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>Milestone Badges & Trophies</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    {(data?.badges || []).map(badge => (
                        <div
                            key={badge.id}
                            style={{
                                padding: '16px',
                                borderRadius: '12px',
                                background: badge.unlocked ? 'rgba(251, 191, 36, 0.08)' : 'var(--bg-elevated-2)',
                                border: badge.unlocked ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(255,255,255,0.04)',
                                opacity: badge.unlocked ? 1 : 0.45,
                                textAlign: 'center',
                            }}
                        >
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{badge.icon}</div>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: badge.unlocked ? '#fbbf24' : 'var(--text-muted)' }}>
                                {badge.title}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>
                                {badge.desc}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
