export default function TrendFilter({ categories = [], active, onChange }) {
    return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {categories.map((cat) => (
                <button
                    key={cat}
                    onClick={() => onChange(cat)}
                    style={{
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '13px', fontWeight: 700,
                        color: active === cat ? '#000' : 'var(--text-primary)',
                        background: active === cat ? 'var(--text-primary)' : 'var(--bg-elevated-2)',
                        border: 'none', cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                    }}
                >
                    {cat}
                </button>
            ))}
        </div>
    );
}
