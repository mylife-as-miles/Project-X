import React from 'react';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import type { AnalysisPipelineProgress } from '../types/script';
import { cn } from '../lib/utils';

interface AnalysisProgressBarProps {
  progress: AnalysisPipelineProgress | null;
  isAnalyzing: boolean;
}

export const AnalysisProgressBar: React.FC<AnalysisProgressBarProps> = ({
  progress,
  isAnalyzing,
}) => {
  if (!isAnalyzing && !progress) return null;

  const pct = progress ? Math.round((progress.step / progress.totalSteps) * 100) : 10;
  const isError = progress?.stage === 'error';

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-full animate-in slide-in-from-bottom-5 duration-300">
      <div className="p-4 rounded-2xl bg-surface border border-purple-500/30 shadow-2xl backdrop-blur-md space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {isError ? (
              <AlertCircle size={16} className="text-rose-500" />
            ) : progress?.stage === 'complete' ? (
              <CheckCircle2 size={16} className="text-emerald-500" />
            ) : (
              <Sparkles size={16} className="text-purple-500 animate-spin" />
            )}
            <span className="font-bold text-text-main">
              {progress?.stage === 'complete' ? 'Gemini QA Complete' : 'Director Agent Pipeline'}
            </span>
          </div>
          <span className="font-mono text-[10px] font-bold text-purple-500 px-2 py-0.5 rounded bg-purple-500/10">
            {progress?.step || 1}/{progress?.totalSteps || 6} ({pct}%)
          </span>
        </div>

        <p className="text-[11px] text-text-muted font-medium truncate">
          {progress?.message || 'Orchestrating script-to-screen multimodal evaluation...'}
        </p>

        {/* Bar */}
        <div className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-500 ease-out",
              isError ? "bg-rose-500" : "bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
};
