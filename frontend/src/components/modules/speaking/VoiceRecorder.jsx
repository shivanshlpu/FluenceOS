import { Mic, MicOff, Square } from 'lucide-react';
import ClayButton from '../../ui/ClayButton';

export default function VoiceRecorder({ isListening, onStart, onStop }) {
    return (
        <div className="flex items-center gap-4">
            {!isListening ? (
                <ClayButton onClick={onStart} variant="success" className="flex items-center gap-2">
                    <Mic size={18} /> Start Recording
                </ClayButton>
            ) : (
                <ClayButton onClick={onStop} variant="danger" className="flex items-center gap-2 animate-pulse">
                    <Square size={18} /> Stop Recording
                </ClayButton>
            )}
            <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-400 animate-pulse' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-500">{isListening ? 'Listening...' : 'Ready'}</span>
            </div>
        </div>
    );
}
