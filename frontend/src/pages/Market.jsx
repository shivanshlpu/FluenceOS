import MarketAnalyzer from '../components/modules/market/MarketAnalyzer';

export default function Market() {
    return (
        <div>
            {/* Gradient header */}
            <div style={{
                padding: '60px 24px 24px',
                background: 'linear-gradient(180deg, var(--grad-market) 0%, transparent 100%)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{
                        width: '160px', height: '160px', borderRadius: 'var(--radius-xs)',
                        background: 'linear-gradient(135deg, #6b1a1a, #ef4444)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: 'var(--shadow-image)', flexShrink: 0, fontSize: '64px',
                    }}>💼</div>
                    <div>
                        <p className="label-caps" style={{ marginBottom: '8px' }}>Module</p>
                        <h1 style={{ fontSize: '48px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '8px' }}>Job Market Analyzer</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                            Explore in-demand skills, salary trends & market intelligence
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
                <MarketAnalyzer />
            </div>
        </div>
    );
}
