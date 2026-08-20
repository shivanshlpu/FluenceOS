export default function ClayInput({ className = '', inputClassName = '', label, error, ...props }) {
    return (
        <div className={`w-full ${className}`}>
            {label && <label className="block text-sm font-semibold text-gray-600 mb-1.5">{label}</label>}
            <input
                className={`clay-input w-full text-gray-700 ${error ? 'border-red-300' : ''} ${inputClassName}`}
                {...props}
            />
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
    );
}

