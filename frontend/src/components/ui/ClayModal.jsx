import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function ClayModal({ isOpen, onClose, title, children, className = '' }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className={`fixed top-1/2 left-1/2 z-50 w-full max-w-lg clay-card-static p-6 ${className}`}
                        initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
                        animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                        exit={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                            <button
                                onClick={onClose}
                                className="clay-button p-2 bg-gray-100 hover:bg-gray-200 rounded-full"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
