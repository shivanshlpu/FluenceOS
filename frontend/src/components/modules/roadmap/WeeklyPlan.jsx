import { useState } from 'react';
import { CheckSquare, Square, Calendar } from 'lucide-react';

export default function WeeklyPlan({ plan = [] }) {
    const [completedTasks, setCompletedTasks] = useState({});
    const toggleTask = (weekIdx, taskIdx) => {
        const key = `${weekIdx}-${taskIdx}`;
        setCompletedTasks((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    if (!plan.length) return null;

    const totalTasks = plan.reduce((sum, week) => sum + (week.tasks?.length || 0), 0);
    const totalCompleted = Object.values(completedTasks).filter(Boolean).length;
    const pct = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={18} color="var(--warning)" /> Weekly Plan
                </h3>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{totalCompleted}/{totalTasks} tasks done</span>
            </div>

            {/* Progress bar */}
            <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Overall Progress</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--success)' }}>{pct}%</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'var(--bg-elevated-3)', borderRadius: '2px' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--success)', borderRadius: '2px', transition: 'width 0.3s ease' }} />
                </div>
            </div>

            {plan.map((week, weekIdx) => (
                <div key={weekIdx} style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                    <h4 style={{ fontWeight: 700, marginBottom: '12px' }}>📅 Week {week.week}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {week.tasks?.map((task, taskIdx) => {
                            const done = completedTasks[`${weekIdx}-${taskIdx}`];
                            return (
                                <button key={taskIdx} onClick={() => toggleTask(weekIdx, taskIdx)} style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    width: '100%', textAlign: 'left', padding: '8px 12px',
                                    borderRadius: 'var(--radius-md)', background: 'transparent',
                                    color: done ? 'var(--text-muted)' : 'var(--text-secondary)',
                                    fontSize: '14px', cursor: 'pointer',
                                    textDecoration: done ? 'line-through' : 'none',
                                    transition: 'background var(--transition-fast)',
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated-2)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    {done ? <CheckSquare size={16} color="var(--success)" /> : <Square size={16} color="var(--text-muted)" />}
                                    {task}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
