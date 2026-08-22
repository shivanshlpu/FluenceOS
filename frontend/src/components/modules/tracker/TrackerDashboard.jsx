import { useEffect, useState } from 'react';
import { Flame, Award, Target, CheckCircle2, Circle, TrendingUp, Calendar, Zap, ShieldCheck, RefreshCw, BarChart2, Sparkles, CheckCheck, Loader } from 'lucide-react';
import { pythonAPI } from '../../../services/api';

const GOALS_CACHE_KEY = 'fluence_tracker_goals_today';

export default function TrackerDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [goals, setGoals] = useState([]);
    const [checkingIn, setCheckingIn] = useState(false);
    const [checkinSuccess, setCheckinSuccess] = useState(false);

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
            // Local fallback from cache
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
                goalDate: data?.todayDate
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

    // Generate last 16 weeks (112 days) grid for the GitHub-style heatmap
    const generateHeatmapDays = () => {
        const days = [];
        const today = new Date();
        const heatmapData = data?.heatmap || {};

        for (let i = 111; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            const count = heatmapData[dateStr] || 0;
            days.push({
                date: dateStr,
                count: count,
                dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
            });
        }
        return days;
    };

    const heatmapDays = generateHeatmapDays();

    const getHeatmapColor = (count) => {
        if (count === 0) return 'rgba(255, 255, 255, 0.05)';
        if (count === 1) return '#0e4429';
        if (count === 2) return '#006d32';
        if (count === 3) return '#26a641';
        return '#39d353';
    };

    const completedGoalsCount = goals.filter(g => g.completed).length;
    const progressPercent = goals.length > 0 ? Math.round((completedGoalsCount / goals.length) * 100) : 0;
    const isTodayActive = data?.todayActive || data?.currentStreak > 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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

                {/* Total Minutes Practiced */}
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
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        flexShrink: 0,
                    }}>
                        ⏱️
                    </div>
                    <div>
                        <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
                            {data?.totalMinutesPracticed ?? 20}m
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Total Practice Time
                        </div>
                    </div>
                </div>
            </div>

            {/* GitHub-style Activity Heatmap */}
            <div style={{
                padding: '24px',
                borderRadius: '16px',
                background: 'var(--bg-elevated-1)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={18} color="#10b981" />
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>
                            Daily Growth Heatmap (Past 16 Weeks)
                        </h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>Less</span>
                        {[0, 1, 2, 3, 4].map(lvl => (
                            <div key={lvl} style={{ width: '11px', height: '11px', borderRadius: '2px', background: getHeatmapColor(lvl) }} />
                        ))}
                        <span>More</span>
                    </div>
                </div>

                {/* Heatmap Grid (7 rows x 16 columns) */}
                <div style={{
                    display: 'grid',
                    gridTemplateRows: 'repeat(7, 13px)',
                    gridAutoFlow: 'column',
                    gridAutoColumns: '13px',
                    gap: '4px',
                    overflowX: 'auto',
                    paddingBottom: '8px',
                }}>
                    {heatmapDays.map((day, idx) => (
                        <div
                            key={idx}
                            title={`${day.date}: ${day.count} activities completed`}
                            style={{
                                width: '13px',
                                height: '13px',
                                borderRadius: '2.5px',
                                background: getHeatmapColor(day.count),
                                cursor: 'pointer',
                                transition: 'transform 0.1s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.3)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        />
                    ))}
                </div>
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
