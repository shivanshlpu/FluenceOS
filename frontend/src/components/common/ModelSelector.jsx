import { useState, useEffect } from 'react';
import { Cpu, Zap, Sparkles, Layers, ChevronDown, Check, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const DEFAULT_MODELS = [
    {
        id: 'auto',
        name: 'Auto (Smart Failover)',
        provider: 'Multi-Engine',
        description: 'Auto-routes across Groq, DeepSeek & Gemini for maximum speed and zero downtime',
        badge: 'Recommended',
        color: '#10b981',
        icon: Zap
    },
    {
        id: 'deepseek-ai/deepseek-v4-flash-0731',
        name: 'DeepSeek V4 Flash',
        provider: 'NVIDIA NIM',
        description: 'Deep technical reasoning, nuanced explanations, and varied vocabulary',
        badge: 'NVIDIA NIM',
        color: '#76b900', // NVIDIA green
        icon: Cpu
    },
    {
        id: 'meta/llama-3.3-70b-instruct',
        name: 'Meta LLaMA 3.3 70B',
        provider: 'NVIDIA NIM',
        description: 'Comprehensive multi-paragraph breakdowns, intuitive analogies & trade-offs',
        badge: '70B Quality',
        color: '#3b82f6',
        icon: Layers
    },
    {
        id: 'openai/gpt-oss-120b',
        name: 'GPT-OSS 120B',
        provider: 'Groq',
        description: 'Sub-second ultra-fast inference with sharp conversational clarity',
        badge: 'Ultra Fast',
        color: '#f97316',
        icon: Zap
    },
    {
        id: 'gemini-2.5-flash',
        name: 'Google Gemini 2.5 Flash',
        provider: 'Google AI',
        description: 'Creative academic breakdowns with deep contextual awareness',
        badge: 'Google AI',
        color: '#a855f7',
        icon: Sparkles
    }
];

export default function ModelSelector({ selectedModel, onSelectModel, compact = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const activeModel = DEFAULT_MODELS.find(m => m.id === selectedModel) || DEFAULT_MODELS[0];
    const ActiveIcon = activeModel.icon;

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            {/* Selector Trigger Button */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: compact ? '8px 12px' : '12px 16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${isOpen ? activeModel.color : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    userSelect: 'none'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: `${activeModel.color}22`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: activeModel.color,
                        flexShrink: 0
                    }}>
                        <ActiveIcon size={16} />
                    </div>

                    <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #fff)', whiteSpace: 'nowrap' }}>
                                {activeModel.name}
                            </span>
                            <span style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                background: `${activeModel.color}26`,
                                color: activeModel.color,
                                letterSpacing: '0.04em'
                            }}>
                                {activeModel.badge}
                            </span>
                        </div>
                        {!compact && (
                            <p style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {activeModel.description}
                            </p>
                        )}
                    </div>
                </div>

                <ChevronDown
                    size={16}
                    color="var(--text-muted, #94a3b8)"
                    style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        flexShrink: 0
                    }}
                />
            </div>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 6px)',
                            left: 0,
                            right: 0,
                            zIndex: 100,
                            background: '#18181b',
                            border: '1px solid rgba(255, 255, 255, 0.14)',
                            borderRadius: '14px',
                            padding: '6px',
                            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)',
                            backdropFilter: 'blur(12px)'
                        }}
                    >
                        <div style={{ padding: '8px 10px 6px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #94a3b8)' }}>
                                Choose AI Engine
                            </span>
                        </div>

                        {DEFAULT_MODELS.map((model) => {
                            const Icon = model.icon;
                            const isSelected = model.id === selectedModel;

                            return (
                                <div
                                    key={model.id}
                                    onClick={() => {
                                        onSelectModel(model.id);
                                        localStorage.setItem('preferred_ai_model', model.id);
                                        setIsOpen(false);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '10px',
                                        padding: '10px 12px',
                                        borderRadius: '10px',
                                        background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                                        border: `1px solid ${isSelected ? model.color + '44' : 'transparent'}`,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                        <div style={{
                                            width: '26px',
                                            height: '26px',
                                            borderRadius: '6px',
                                            background: `${model.color}22`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: model.color,
                                            flexShrink: 0
                                        }}>
                                            <Icon size={14} />
                                        </div>

                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 500, color: 'var(--text-primary, #fff)' }}>
                                                    {model.name}
                                                </span>
                                                <span style={{
                                                    fontSize: '9px',
                                                    fontWeight: 800,
                                                    textTransform: 'uppercase',
                                                    padding: '1px 5px',
                                                    borderRadius: '4px',
                                                    background: `${model.color}26`,
                                                    color: model.color
                                                }}>
                                                    {model.provider}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', margin: '1px 0 0' }}>
                                                {model.description}
                                            </p>
                                        </div>
                                    </div>

                                    {isSelected && (
                                        <Check size={16} color={model.color} style={{ flexShrink: 0 }} />
                                    )}
                                </div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
