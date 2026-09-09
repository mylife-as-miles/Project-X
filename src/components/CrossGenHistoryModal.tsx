import React from 'react';
import { X, TrendingUp, History, Database, Cloud, CheckCircle2, ArrowRight } from 'lucide-react';
import type { GenerationComparison } from '../types/script';
import { UI_TOKENS } from '../styles/tokens/ui';
import { cn } from '../lib/utils';

interface CrossGenHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparison: GenerationComparison | null;
  isLoading?: boolean;
}

export const CrossGenHistoryModal: React.FC<CrossGenHistoryModalProps> = ({
  isOpen,
  onClose,
  comparison,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className={UI_TOKENS.modal.overlayHighZ} onClick={onClose}>
      <div 
        className={cn(UI_TOKENS.modal.containerLg, "max-h-[90vh] flex flex-col")} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-main bg-surface shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-main flex items-center gap-2">
                ClickHouse Generation Intelligence
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-mono">
                  {comparison?.runs.length || 0} Runs Analyzed
                </span>
              </h2>
              <p className="text-xs text-text-muted">Cross-iteration progression tracking and regression detection.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-text-faint hover:text-text-main"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-text-body">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Database className="animate-pulse mx-auto text-blue-500" size={28} />
              <p className="font-semibold text-text-main">Querying ClickHouse generation history...</p>
            </div>
          ) : comparison && comparison.runs.length > 0 ? (
            <>
              {/* Iteration Timeline Cards */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-faint flex items-center gap-1.5">
                  <History size={12} /> Scene Generation Progression
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {comparison.runs.map((run, idx) => {
                    const isLatest = idx === comparison.runs.length - 1;
                    const scoreColor = run.overallScore >= 85 ? 'text-emerald-500' : run.overallScore >= 70 ? 'text-amber-500' : 'text-red-500';
                    const scoreBg = run.overallScore >= 85 ? 'bg-emerald-500/10 border-emerald-500/20' : run.overallScore >= 70 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';

                    return (
                      <div 
                        key={run.generationNumber}
                        className={cn(
                          "p-4 rounded-xl border transition-all space-y-3 bg-surface",
                          isLatest ? "border-blue-500/50 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/20" : "border-border-main"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-faint">
                            Attempt #{run.generationNumber}
                          </span>
                          {isLatest && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-500 text-white">
                              Active
                            </span>
                          )}
                        </div>

                        <div className={cn("p-3 rounded-lg border flex items-center justify-between", scoreBg)}>
                          <span className="text-xs font-semibold text-text-main">Overall Fidelity</span>
                          <span className={cn("text-xl font-bold font-mono", scoreColor)}>
                            {run.overallScore}%
                          </span>
                        </div>

                        {/* Category Snippets */}
                        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                          {Object.entries(run.categoryScores).slice(0, 4).map(([cat, score]) => (
                            <div key={cat} className="flex justify-between p-1 rounded bg-surface-muted px-1.5">
                              <span className="text-text-faint capitalize">{cat}</span>
                              <span className="font-mono font-bold text-text-main">{score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gemini Narrative Analysis */}
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> Gemini Cross-Generation Analysis
                </span>
                <p className="text-xs text-text-main leading-relaxed">
                  {comparison.narrative}
                </p>
              </div>

              {/* Improvements & Regressions */}
              {comparison.improvements.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
                    <ArrowRight size={12} /> Detected Improvements
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {comparison.improvements.map((imp, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {imp}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Runtime Infrastructure Badges */}
              <div className="p-3.5 rounded-xl bg-surface-subtle border border-border-main flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-text-faint">
                  <Database size={14} className="text-blue-500" />
                  <span>ClickHouse Analytical Schema: <strong className="text-text-main">cue_analysis, generation_runs</strong></span>
                </div>
                <div className="flex items-center gap-2 text-text-faint">
                  <Cloud size={14} className="text-purple-500" />
                  <span>Google Cloud Storage: <strong className="text-text-main">gs://project-x-analysis/</strong></span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-text-muted">
              No generation history found yet. Run an analysis with Gemini to persist results.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border-main bg-surface flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-muted hover:bg-surface-hover text-text-main rounded-xl text-xs font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
