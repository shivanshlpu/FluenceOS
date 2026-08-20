import { motion } from 'framer-motion';

export default function ClayCard({ children, className = '', hover = true, gradient = '', onClick, ...props }) {
    return (
        <motion.div
            className={`${hover ? 'clay-card' : 'clay-card-static'} ${gradient} ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            onClick={onClick}
            {...props}
        >
            {children}
        </motion.div>
    );
}
