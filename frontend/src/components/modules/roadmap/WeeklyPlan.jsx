import { useState, useEffect } from 'react';
import { CheckSquare, Square, Calendar, Sparkles, CheckCircle2, Award } from 'lucide-react';
import { pythonAPI } from '../../../services/api';

export default function WeeklyPlan({ plan = [], skillName = 'Skill' }) {
    const cacheKey = `fluence_roadmap_tasks_${skillName.toLowerCase().replace(/ /g, '_')}`;

    const [completedTasks, setCompletedTasks] = useState(() => {
        try {
            const raw = localStorage.getItem(cacheKey);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    });

    const toggleTask = (weekIdx, taskIdx, taskText) => {
        const key = `${weekIdx}-${taskIdx}`;
        const newStatus = !completedTasks[key];
        const updated = { ...completedTasks, [key]: newStatus };
        setCompletedTasks(updated);

        try {
            localStorage.setItem(cacheKey, JSON.stringify(updated));
        } catch {}

        if (newStatus) {
            // Auto-log to Tracker to feed streak
            pythonAPI.post('/api/tracker/log-activity', {
                activityType: 'roadmap',
                durationMinutes: 10,
                title: `Roadmap Step: ${taskText.slice(0, 40)}`
            }).catch(() => {});
        }
    };

    if (!plan || !plan.length) return null;

    const totalTasks = plan.reduce((sum, week) => sum + (week.tasks?.length || 0), 0);
    const totalCompleted = Object.values(completedTasks).filter(Boolean).length;
    const pct = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header & Overall Progress */}
            <div style={{
                padding: '20px 24px',
                borderRadius: '16px',
                background: 'var(--bg-elevated-1)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Calendar size={20} color="#f59e0b" />
                        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff' }}>
                            Actionable Weekly Study Plan ({skillName})
                        </h3>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: pct === 100 ? '#10b981' : '#f59e0b' }}>
                        {totalCompleted} / {totalTasks} tasks completed ({pct}%)
                    </span>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #f59e0b, #10b981)',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                    }} />
                </div>
            </div>

            {/* Weekly task cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                {plan.map((week, weekIdx) => {
                    const weekCompleted = (week.tasks || []).filter((_, taskIdx) => completedTasks[`${weekIdx}-${taskIdx}`]).length;
                    const weekTotal = (week.tasks || []).length;
                    const isAllDone = weekTotal > 0 && weekCompleted === weekTotal;

                    return (
                        <div
                            key={weekIdx}
                            style={{
                                padding: '20px',
                                borderRadius: '14px',
                                background: isAllDone ? 'rgba(16, 185, 129, 0.06)' : 'var(--bg-elevated-1)',
                                border: isAllDone ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>📅 Week {week.week}: {week.title || `Phase Focus`}</span>
                                </h4>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    background: isAllDone ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                                    color: isAllDone ? '#000' : 'var(--text-secondary)'
                                }}>
                                    {weekCompleted}/{weekTotal} Done
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {week.tasks?.map((task, taskIdx) => {
                                    const done = !!completedTasks[`${weekIdx}-${taskIdx}`];
                                    return (
                                        <div
                                            key={taskIdx}
                                            onClick={() => toggleTask(weekIdx, taskIdx, task)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                background: done ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-elevated-2)',
                                                border: done ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255,255,255,0.04)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            {done ? <CheckSquare size={16} color="#10b981" style={{ flexShrink: 0 }} /> : <Square size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
                                            <span style={{
                                                fontSize: '13px',
                                                color: done ? 'var(--text-muted)' : 'var(--text-primary)',
                                                textDecoration: done ? 'line-through' : 'none',
                                                lineHeight: 1.4,
                                            }}>
                                                {task}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
