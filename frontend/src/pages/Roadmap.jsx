import RoadmapGenerator from '../components/modules/roadmap/RoadmapGenerator';

export default function Roadmap() {
    return (
        <div>
            {/* Gradient header */}
            <div style={{
                padding: '60px 24px 24px',
                background: 'linear-gradient(180deg, var(--grad-roadmap) 0%, transparent 100%)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{
                        width: '160px', height: '160px', borderRadius: 'var(--radius-xs)',
                        background: 'linear-gradient(135deg, #1a4a2e, #10b981)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: 'var(--shadow-image)', flexShrink: 0, fontSize: '64px',
                    }}>🗺️</div>
                    <div>
                        <p className="label-caps" style={{ marginBottom: '8px' }}>Module</p>
                        <h1 style={{ fontSize: '48px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '8px' }}>Skill Roadmap</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                            AI-generated personalized learning paths for your career growth
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
                <RoadmapGenerator />
            </div>
        </div>
    );
}
