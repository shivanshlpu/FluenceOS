import SpeakingEngine from '../components/modules/speaking/SpeakingEngine';
import SpeakingHistory from '../components/modules/speaking/SpeakingHistory';

export default function Speaking() {
    return (
        <div>
            {/* Responsive Gradient header */}
            <div style={{
                padding: '40px 24px 20px',
                background: 'linear-gradient(180deg, var(--grad-speaking) 0%, transparent 100%)',
            }}>
                <div className="page-header-flex" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div className="page-header-icon" style={{
                        width: '100px', height: '100px', borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, #4a1d96, #7c3aed)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: 'var(--shadow-image)', flexShrink: 0, fontSize: '48px',
                    }}>🎤</div>
                    <div>
                        <p className="label-caps" style={{ marginBottom: '6px' }}>AI Module</p>
                        <h1 className="page-header-title" style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '6px' }}>Speaking Coach</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                            Improve your spoken English with real-time 2-way AI voice conversations, CEFR feedback & pronunciation
                        </p>
                    </div>
                </div>
            </div>

            {/* Responsive Content Grid */}
            <div className="responsive-two-col" style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 320px)', gap: '24px' }}>
                <SpeakingEngine />
                <SpeakingHistory />
            </div>
        </div>
    );
}
