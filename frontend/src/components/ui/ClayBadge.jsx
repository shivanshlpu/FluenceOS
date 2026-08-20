const colorMap = {
    purple: 'bg-purple-100 text-purple-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    pink: 'bg-pink-100 text-pink-700',
    orange: 'bg-orange-100 text-orange-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-700',
};

export default function ClayBadge({ children, color = 'purple', className = '', icon }) {
    return (
        <span className={`clay-badge px-3 py-1 ${colorMap[color]} ${className}`}>
            {icon && <span>{icon}</span>}
            {children}
        </span>
    );
}
