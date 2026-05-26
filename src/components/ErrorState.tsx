import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { message: string; onRetry: () => void; }

export default function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6">
      <div className="card bracket max-w-sm w-full p-8 text-center border-danger/20">
        <AlertTriangle className="w-10 h-10 text-danger mx-auto mb-4" />
        <h2 className="font-pixel text-base font-bold text-ink uppercase tracking-wider mb-2">
          Connection Failed
        </h2>
        <p className="font-pixel text-xs text-ink-ghost mb-6 leading-relaxed break-words">{message}</p>
        <button onClick={onRetry} className="btn-ghost flex items-center gap-2 mx-auto">
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    </div>
  );
}
