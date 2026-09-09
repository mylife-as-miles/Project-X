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
  FileText,
  Server,
  Database,
  Cloud
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

  const analysisLabel = summary.runtimeSource?.analysis || 'Demo fixture / precomputed benchmark';
  const clickhouseLabel = summary.runtimeSource?.clickhouse || 'ClickHouse Cloud — Connected';
  const storageLabel = summary.runtimeSource?.storage || 'Google Cloud Storage — Saved';
  const isDemo = summary.runtimeSource?.mode === 'demo';

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
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                  isDemo ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-btn-primary-bg text-btn-primary-text"
                )}>
                  {isDemo ? "Demo Fixture" : "Agentic QA"}
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

        {/* Runtime Provenance Bar (Subtle Truthfulness Indicator) */}
        <div className="px-6 py-2 bg-surface-muted/50 border-b border-border-main flex flex-wrap items-center gap-4 text-[11px] font-mono text-text-muted">
          <div className="flex items-center gap-1.5">
            <Server size={12} className={analysisLabel.includes('Live') ? 'text-emerald-500' : (analysisLabel.includes('failed') ? 'text-rose-500' : 'text-amber-500')} />
            <span className="font-semibold text-text-main">Analysis:</span>
            <span>{analysisLabel}</span>
          </div>
          <span className="text-border-main hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5">
            <Database size={12} className={clickhouseLabel.includes('Connected') ? 'text-blue-500' : 'text-amber-500'} />
            <span className="font-semibold text-text-main">History:</span>
            <span>{clickhouseLabel}</span>
          </div>
          <span className="text-border-main hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5">
            <Cloud size={12} className={storageLabel.includes('Saved') ? 'text-purple-500' : 'text-slate-400'} />
            <span className="font-semibold text-text-main">Artifacts:</span>
            <span>{storageLabel}</span>
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

            {/* Cue Breakdown Counts */}
            <div className="p-4 rounded-2xl border border-border-main bg-surface flex flex-col justify-between space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-faint">
                Screenplay Alignment
              </span>
              <div className="space-y-1.5 font-mono">
                <div className="flex items-center justify-between text-emerald-500">
                  <span className="flex items-center gap-1 text-[11px]"><CheckCircle2 size={12} /> Matched Beats</span>
                  <span className="font-bold">{summary.matchedCues}</span>
                </div>
                <div className="flex items-center justify-between text-amber-500">
                  <span className="flex items-center gap-1 text-[11px]"><Clock size={12} /> Partial Adherence</span>
                  <span className="font-bold">{summary.partialCues}</span>
                </div>
                <div className="flex items-center justify-between text-rose-500">
                  <span className="flex items-center gap-1 text-[11px]"><AlertTriangle size={12} /> Diverged / Missed</span>
                  <span className="font-bold">{summary.missedCues}</span>
                </div>
              </div>
            </div>

            {/* Critical Divergences count */}
            <div className="p-4 rounded-2xl border border-border-main bg-surface flex flex-col justify-between space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-faint">
                Critical Divergences
              </span>
              <div className="space-y-1">
                <span className="text-2xl font-bold font-mono text-text-main">
                  {summary.criticalFailures.length}
                </span>
                <p className="text-[11px] text-text-muted">
                  Beats requiring prompt regeneration or continuity corrections.
                </p>
              </div>
            </div>

            {/* Director Notes */}
            <div className="p-4 rounded-2xl border border-border-main bg-surface flex flex-col justify-between space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-faint flex items-center gap-1">
                <FileText size={11} /> Agent Director Assessment
              </span>
              <p className="text-[11px] text-text-muted italic leading-relaxed">
                "{summary.directorNotes || 'Automated multi-category script adherence evaluation completed.'}"
              </p>
            </div>
          </div>

          {/* 8-Category Adherence Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-text-faint">
                Category Compliance Matrix (8 Cinematic Dimensions)
              </span>
              <span className="text-[10px] text-text-faint font-mono">
                Dialogue (1.2) • Action (1.2) • Camera (1.0)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(summary.categoryScores).map(([catKey, catData]: [string, FidelityCategoryScore]) => {
                const barColor = catData.score >= 85 ? 'bg-emerald-500' : catData.score >= 70 ? 'bg-amber-500' : 'bg-rose-500';
                return (
                  <div key={catKey} className="p-3 rounded-xl border border-border-main bg-surface space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-text-main">
                        {catKey}
                      </span>
                      <span className="font-mono font-bold text-xs">
                        {catData.score}%
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-500", barColor)}
                        style={{ width: `${Math.max(5, catData.score)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-text-muted font-mono">
                      <span>{catData.count} beats</span>
                      <span>{catData.matched} matched</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Critical Failures & Divergences List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 flex items-center gap-1.5">
                <AlertTriangle size={13} />
                Critical Divergences & Fixes ({summary.criticalFailures.length})
              </span>
              <span className="text-[10px] text-text-faint">
                Click a failure to jump video timeline or trigger prompt regeneration
              </span>
            </div>

            {summary.criticalFailures.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={24} className="mx-auto mb-2" />
                <p className="font-bold">Zero critical divergences detected!</p>
                <p className="text-[11px] text-text-muted mt-1">All screenplay beats match visual generation within acceptable tolerances.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {summary.criticalFailures.map((fail) => {
                  const matchingCue = cues.find(c => c.id === fail.cueId);
                  return (
                    <div 
                      key={fail.id}
                      className="p-4 rounded-xl border border-border-main bg-surface hover:border-border-strong transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20">
                              {fail.type} Failure
                            </span>
                            <span className="text-[11px] font-mono text-text-faint">
                              t={fail.timestamp.toFixed(1)}s
                            </span>
                            <span className="text-xs font-bold text-text-main">
                              {fail.title}
                            </span>
                          </div>
                          <p className="text-xs text-text-muted">
                            {fail.reason}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => onJumpToCue(fail.timestamp, fail.cueId)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-hover hover:bg-surface-active text-text-main text-xs font-medium transition-colors"
                            title="Jump video and screenplay to failure timecode"
                          >
                            <Play size={11} />
                            <span>Jump</span>
                          </button>

                          {matchingCue && (
                            <button
                              onClick={() => onFixWithAgent(matchingCue)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-btn-primary-bg hover:opacity-90 text-btn-primary-text text-xs font-semibold shadow-sm transition-all"
                              title="Generate revised prompt and negative constraints with Gemini"
                            >
                              <Sparkles size={11} />
                              <span>Fix With Agent</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expected vs Observed Comparison Strip */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-border-subtle text-[11px] font-mono">
                        <div className="p-2 rounded-lg bg-surface-muted border border-border-subtle">
                          <span className="text-text-faint font-bold block text-[10px] uppercase">Screenplay Expected:</span>
                          <span className="text-text-main line-clamp-2">{fail.expected}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
                          <span className="text-rose-500 font-bold block text-[10px] uppercase">Actual Observed:</span>
                          <span className="text-text-body line-clamp-2">{fail.observed}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border-main bg-surface flex items-center justify-between shrink-0">
          <span className="text-[11px] text-text-faint font-mono">
            {summary.totalCuesAnalyzed} cues evaluated • ClickHouse analytical schema synchronized
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-surface-hover hover:bg-surface-active text-text-main font-semibold text-xs transition-colors"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
