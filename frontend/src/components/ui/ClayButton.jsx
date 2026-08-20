export default function ClayButton({ children, className = '', variant = 'primary', size = 'md', disabled = false, onClick, ...props }) {
    const variants = {
        primary: 'bg-purple-400 text-white hover:bg-purple-500',
        secondary: 'bg-blue-400 text-white hover:bg-blue-500',
        success: 'bg-green-400 text-white hover:bg-green-500',
        danger: 'bg-red-400 text-white hover:bg-red-500',
        warning: 'bg-yellow-400 text-gray-800 hover:bg-yellow-500',
        ghost: 'bg-white/50 text-gray-700 hover:bg-white/80',
    };
    const sizes = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    return (
        <button
            className={`clay-button ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled}
            onClick={onClick}
            {...props}
        >
            {children}
        </button>
    );
}
