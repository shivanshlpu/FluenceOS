import TrackerDashboard from '../components/modules/tracker/TrackerDashboard';

export default function Tracker() {
    return (
        <div>
            {/* Gradient header */}
            <div style={{
                padding: '60px 24px 24px',
                background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.25) 0%, transparent 100%)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{
                        width: '120px', height: '120px', borderRadius: 'var(--radius-xs, 12px)',
                        background: 'linear-gradient(135deg, #ef4444, #f97316)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 32px rgba(239, 68, 68, 0.4)', flexShrink: 0, fontSize: '54px',
                    }}>🔥</div>
                    <div>
                        <p className="label-caps" style={{ marginBottom: '8px', color: '#fb923c', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '11px' }}>OS System</p>
                        <h1 style={{ fontSize: '40px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '8px', color: '#fff' }}>Growth & Habit Tracker</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                            Track your speaking streaks, daily practice heatmap, milestones, and habit consistency
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
                <TrackerDashboard />
            </div>
        </div>
    );
}
