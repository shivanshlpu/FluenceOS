const colorMap = {
    purple: 'bg-purple-400',
    blue: 'bg-blue-400',
    green: 'bg-green-400',
    yellow: 'bg-yellow-400',
    pink: 'bg-pink-400',
    orange: 'bg-orange-400',
    red: 'bg-red-400',
};

export default function ClayProgress({ value = 0, max = 100, color = 'purple', label, className = '', height = 'h-3' }) {
    const percentage = Math.min((value / max) * 100, 100);
    return (
        <div className={className}>
            {label && (
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-semibold text-gray-600">{label}</span>
                    <span className="text-sm font-bold text-gray-500">{Math.round(percentage)}%</span>
                </div>
            )}
            <div className={`clay-progress-track ${height}`}>
                <div
                    className={`clay-progress-bar ${height} ${colorMap[color]}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
