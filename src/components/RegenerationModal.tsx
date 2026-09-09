import React, { useState } from 'react';
import { X, Sparkles, Copy, Check, ShieldAlert, Video, Clapperboard, Ban } from 'lucide-react';
import type { Cue, RegenerationRecommendation } from '../types/script';
import { UI_TOKENS } from '../styles/tokens/ui';
import { cn } from '../lib/utils';

interface RegenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  cue: Cue | null;
  recommendation: RegenerationRecommendation | null;
  isLoading?: boolean;
}

export const RegenerationModal: React.FC<RegenerationModalProps> = ({
  isOpen,
  onClose,
  cue,
  recommendation,
  isLoading = false,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !cue) return null;

  const handleCopy = () => {
    if (recommendation?.revisedPrompt) {
      navigator.clipboard.writeText(recommendation.revisedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={UI_TOKENS.modal.overlayHighZ} onClick={onClose}>
      <div 
        className={cn(UI_TOKENS.modal.containerLg, "max-h-[90vh] flex flex-col")} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-main bg-surface shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-main flex items-center gap-2">
                Gemini Regeneration Agent
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 font-mono">
                  Beat #{cue.id}
                </span>
              </h2>
              <p className="text-xs text-text-muted">Targeted generation prompt fix to resolve observed visual divergence.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-text-faint hover:text-text-main"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-text-body">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Sparkles className="animate-spin mx-auto text-purple-500" size={28} />
              <p className="font-semibold text-text-main">Director Agent is analyzing camera failure and constructing prompt fix...</p>
            </div>
          ) : recommendation ? (
            <>
              {/* Divergence Diagnosis */}
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-2">
                <div className="flex items-center gap-2 text-red-500 font-bold uppercase tracking-wider text-[10px]">
                  <ShieldAlert size={14} /> Observed Failure Diagnosis
                </div>
                <p className="text-xs text-text-main font-medium">{recommendation.problem}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2.5 rounded-lg bg-surface border border-border-subtle">
                    <span className="text-text-faint block font-mono text-[9px] uppercase">Screenplay Expectation:</span>
                    <span className="text-text-main font-medium">{cue.expected || cue.selectedText}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface border border-border-subtle">
                    <span className="text-text-faint block font-mono text-[9px] uppercase">Observed Model Output:</span>
                    <span className="text-red-400 font-medium">{cue.observed || 'Action omitted'}</span>
                  </div>
                </div>
              </div>

              {/* Revised Prompt Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-faint flex items-center gap-1.5">
                    <Clapperboard size={12} /> Corrected Generation Prompt (Copy Ready)
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy Prompt'}
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-surface-subtle border border-purple-500/30 font-mono text-xs text-text-main leading-relaxed select-all">
                  {recommendation.revisedPrompt}
                </div>
              </div>

              {/* Guardrails & Technical Specs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-surface border border-border-main space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-faint flex items-center gap-1.5">
                    <Video size={12} /> Cinematic Camera & Rig Corrections
                  </span>
                  <p className="text-xs text-text-main">{recommendation.cameraCorrections}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-surface border border-border-main space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-faint">
                    Actor Motion & Physical Action
                  </span>
                  <p className="text-xs text-text-main">{recommendation.actionCorrections}</p>
                </div>
              </div>

              {/* Negative Constraints */}
              {recommendation.negativeConstraints && recommendation.negativeConstraints.length > 0 && (
                <div className="p-3.5 rounded-xl bg-surface border border-border-main space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 flex items-center gap-1.5">
                    <Ban size={12} /> Negative Constraints (Avoid in Next Render)
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {recommendation.negativeConstraints.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 text-[10px] font-mono border border-rose-500/20">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border-main bg-surface flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-muted hover:bg-surface-hover text-text-main rounded-xl text-xs font-semibold transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
