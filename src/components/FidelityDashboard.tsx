import React from 'react';
import { 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles, 
  Play, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  FileText 
} from 'lucide-react';
import type { AnalysisSummary, Cue, FidelityCategoryScore } from '../types/script';
import { UI_TOKENS } from '../styles/tokens/ui';
import { cn } from '../lib/utils';

interface FidelityDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  summary: AnalysisSummary | null;
  cues: Cue[];
  onJumpToCue: (timestamp: number, cueId: string) => void;
  onFixWithAgent: (cue: Cue) => void;
  onOpenHistory: () => void;
}

export const FidelityDashboard: React.FC<FidelityDashboardProps> = ({
  isOpen,
  onClose,
  summary,
  cues,
  onJumpToCue,
  onFixWithAgent,
  onOpenHistory,
}) => {
  if (!isOpen || !summary) return null;

  const score = summary.overallFidelityScore;
  const scoreColor = score >= 85 ? 'text-emerald-500' : score >= 70 ? 'text-amber-500' : 'text-rose-500';
  const scoreRing = score >= 85 ? 'border-emerald-500/30 bg-emerald-500/5' : score >= 70 ? 'border-amber-500/30 bg-amber-500/5' : 'border-rose-500/30 bg-rose-500/5';

  return (
    <div className={UI_TOKENS.modal.overlayHighZ} onClick={onClose}>
      <div 
        className={cn(UI_TOKENS.modal.containerXl, "h-[90vh]")} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-main bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text-main">
                  Script-to-Screen Fidelity QA
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-btn-primary-bg text-btn-primary-text">
                  Gemini Evaluated
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Multimodal alignment between screenplay instructions and generated video output.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 font-semibold text-xs transition-all border border-blue-500/20"
            >
              <TrendingUp size={13} />
              <span>Cross-Gen History</span>
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-text-faint hover:text-text-main"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Inspector Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-text-body">
          {/* Top Summary Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Overall Score */}
            <div className={cn("p-5 rounded-2xl border flex flex-col items-center justify-center text-center space-y-1", scoreRing)}>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-faint">
                Script Fidelity
              </span>
              <span className={cn("text-4xl font-black font-mono tracking-tight", scoreColor)}>
                {score}%
              </span>
              <span className="text-[10px] text-text-muted font-medium">
                Weighted Cinematic Compliance
              </span>
            </div>

            {/* Counts */}
            <div className="p-5 rounded-2xl border border-border-main bg-surface col-span-3 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-faint">
                  Autonomous Cue Audit ({summary.totalCuesAnalyzed} beats evaluated)
                </span>
                <span className="text-[11px] font-medium text-text-muted">
                  Director Confidence: <strong>88%</strong>
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase">Matched</span>
                  <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{summary.matchedCues}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block uppercase">Partial</span>
                  <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">{summary.partialCues}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block uppercase">Missed</span>
                  <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">{summary.missedCues}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/20">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Uncertain</span>
                  <span className="text-xl font-bold font-mono text-slate-500">{summary.uncertainCues}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 8-Category Radar Breakdown */}
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-faint flex items-center gap-1.5">
              <FileText size={12} /> Cinematic Category Breakdown
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.entries(summary.categoryScores) as [string, FidelityCategoryScore][]).map(([cat, data]) => {
                const catScore = data.score;
                const cColor = catScore >= 85 ? 'text-emerald-500' : catScore >= 70 ? 'text-amber-500' : 'text-rose-500';
                const barColor = catScore >= 85 ? 'bg-emerald-500' : catScore >= 70 ? 'bg-amber-500' : 'bg-rose-500';

                return (
                  <div key={cat} className="p-3.5 rounded-xl bg-surface border border-border-main space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="capitalize font-bold text-text-main text-xs">{cat}</span>
                      <span className={cn("font-mono font-bold text-sm", cColor)}>{catScore}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden">
                      <div className={cn("h-full transition-all duration-500", barColor)} style={{ width: `${catScore}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-text-faint font-mono">
                      <span>{data.count} beats</span>
                      <span>{data.matched} matched</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Critical Failures Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 flex items-center gap-1.5">
                <AlertTriangle size={13} /> Critical Failures Requiring Regeneration ({summary.criticalFailures.length})
              </span>
              <span className="text-[11px] text-text-muted">
                Click a failure card to seek video and highlight script cue
              </span>
            </div>

            {summary.criticalFailures.length > 0 ? (
              <div className="space-y-2.5">
                {summary.criticalFailures.map((fail, index) => {
                  const cue = cues.find(c => c.id === fail.cueId);

                  return (
                    <div
                      key={fail.id}
                      className="p-4 rounded-xl bg-surface border border-rose-500/20 hover:border-rose-500/50 transition-all space-y-3 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="font-mono text-xs font-bold text-rose-500 p-1 px-2 rounded-lg bg-rose-500/10 shrink-0">
                            #{index + 1}
                          </span>
                          <div>
                            <h4 className="text-xs font-bold text-text-main group-hover:text-rose-400 transition-colors">
                              {fail.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-text-faint font-mono mt-0.5">
                              <span className="uppercase px-1.5 py-0.5 rounded bg-surface-muted text-text-muted font-bold">
                                {fail.type}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Clock size={10} /> {fail.timestamp.toFixed(1)}s
                              </span>
                              <span>• Score: <strong className="text-rose-500">{fail.score}%</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => onJumpToCue(fail.timestamp, fail.cueId)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-muted hover:bg-surface-hover text-text-main text-xs font-semibold transition-all active:scale-95 border border-border-subtle"
                            title="Jump video to failure timestamp"
                          >
                            <Play size={11} className="fill-current" /> Seek
                          </button>

                          {cue && (
                            <button
                              onClick={() => onFixWithAgent(cue)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all active:scale-95 shadow-sm shadow-purple-600/20"
                            >
                              <Sparkles size={11} /> Fix With Agent
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expected vs Observed */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
                        <div className="p-2.5 rounded-lg bg-surface-subtle border border-border-subtle">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-text-faint block">
                            Screenplay Beat:
                          </span>
                          <span className="text-text-main font-medium">{fail.expected}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/20">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-rose-400 block">
                            Observed In Video:
                          </span>
                          <span className="text-rose-400 font-medium">{fail.observed}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-500 space-y-1">
                <CheckCircle2 size={24} className="mx-auto" />
                <p className="font-bold text-xs">No Critical Failures Detected</p>
                <p className="text-[11px] text-text-muted">Generated scene achieved acceptable adherence across all monitored categories.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border-main bg-surface flex items-center justify-between shrink-0">
          <span className="text-[11px] text-text-faint">
            Project X Autonomous QA • ClickHouse Intelligence Active • Google Cloud Run
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-surface-muted hover:bg-surface-hover text-text-main rounded-xl text-xs font-semibold transition-all"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
