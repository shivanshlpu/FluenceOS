import RoadmapGenerator from '../components/modules/roadmap/RoadmapGenerator';

export default function Roadmap() {
    return (
        <div>
            {/* Gradient header */}
            <div className="page-header-container" style={{
                padding: '40px 24px 20px',
                background: 'linear-gradient(180deg, var(--grad-roadmap) 0%, transparent 100%)',
            }}>
                <div className="page-header-flex" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div className="page-header-icon" style={{
                        width: '80px', height: '80px', borderRadius: 'var(--radius-md, 12px)',
                        background: 'linear-gradient(135deg, #1a4a2e, #10b981)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: 'var(--shadow-image)', flexShrink: 0, fontSize: '40px',
                    }}>🗺️</div>
                    <div>
                        <p className="label-caps" style={{ marginBottom: '6px' }}>AI Module</p>
                        <h1 className="page-header-title" style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '6px' }}>Skill Roadmap</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                            AI-generated personalized learning paths with free courses & video resources
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
