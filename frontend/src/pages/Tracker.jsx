import TrackerDashboard from '../components/modules/tracker/TrackerDashboard';

export default function Tracker() {
    return (
        <div>
            {/* Gradient header */}
            <div className="page-header-container" style={{
                padding: '40px 24px 20px',
                background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.25) 0%, transparent 100%)',
            }}>
                <div className="page-header-flex" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div className="page-header-icon" style={{
                        width: '80px', height: '80px', borderRadius: 'var(--radius-md, 12px)',
                        background: 'linear-gradient(135deg, #ef4444, #f97316)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 32px rgba(239, 68, 68, 0.4)', flexShrink: 0, fontSize: '40px',
                    }}>🔥</div>
                    <div>
                        <p className="label-caps" style={{ marginBottom: '6px', color: '#fb923c', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '11px' }}>AI Module</p>
                        <h1 className="page-header-title" style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '6px', color: '#fff' }}>Growth & Habit Tracker</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                            Track speaking streaks, 365-day practice heatmap, milestones & habit consistency
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
