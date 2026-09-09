import React from 'react';
import { Plus, Book, Coffee, Play, Edit2, Palette, Clock, FolderOpen, Download, Info, Sun, Moon, Sparkles, ShieldCheck, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { UI_TOKENS } from '../styles/tokens/ui';
import type { AppThemeMode, AppThemeCategory } from '../hooks/useAppShellTheme';

interface AppHeaderProps {
  mode: 'playback' | 'edit';
  setMode: (mode: 'playback' | 'edit') => void;
  currentTime: number;
  isLibraryOpen: boolean;
  setIsLibraryOpen: (open: boolean) => void;
  onOpenGuide: () => void;
  isColorModalOpen: boolean;
  setIsColorModalOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isInfoModalOpen: boolean;
  setIsInfoModalOpen: (open: boolean) => void;
  importJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  exportJson: () => void;
  themeMode?: AppThemeMode;
  effectiveThemeCategory?: AppThemeCategory;
  onCycleThemeMode?: () => void;
  onAnalyzeWithGemini?: () => void;
  isAnalyzing?: boolean;
  overallFidelityScore?: number | null;
  onOpenFidelityDashboard?: () => void;
  onOpenHistory?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  mode,
  setMode,
  currentTime,
  isLibraryOpen,
  setIsLibraryOpen,
  onOpenGuide,
  isColorModalOpen,
  setIsColorModalOpen,
  isSettingsOpen,
  setIsSettingsOpen,
  isInfoModalOpen,
  setIsInfoModalOpen,
  importJson,
  exportJson,
  themeMode = 'auto',
  effectiveThemeCategory = 'light',
  onCycleThemeMode,
  onAnalyzeWithGemini,
  isAnalyzing = false,
  overallFidelityScore,
  onOpenFidelityDashboard,
  onOpenHistory,
}) => {
  return (
    <header
      className={cn(
        UI_TOKENS.layout.appHeader,
        mode === 'playback' && "hidden lg:flex"
      )}
    >
      <div className="flex items-center gap-2 lg:gap-3">
        <span className="text-2xl lg:text-3xl font-black tracking-tight text-text-main whitespace-nowrap" aria-label="Project X">PROJECT <span className="text-amber-500">X</span></span>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <div className="flex items-center gap-1 lg:gap-1.5 mr-1 xl:mr-2">
          <button
            onClick={onOpenGuide}
            title="New Official Guide"
            className={cn("hidden lg:flex", UI_TOKENS.button.actionPill, "px-2 py-1.5 xl:px-2.5")}
          >
            <Plus size={12} /> <span className="hidden xl:inline">Guide</span>
          </button>

          <button
            onClick={() => setIsLibraryOpen(true)}
            title="Example Library Catalog"
            className={cn(
              "px-1.5 py-1.5 lg:px-2 xl:px-2.5",
              isLibraryOpen ? UI_TOKENS.button.actionPillActive : UI_TOKENS.button.actionPill
            )}
          >
            <Book size={12} /> <span className="hidden xl:inline">Library</span>
          </button>
        </div>

        <div className={UI_TOKENS.badge.currentTimePill}>
          <span className="hidden xl:inline text-[10px] font-black text-text-faint uppercase tracking-widest">Current Time</span>
          <span className="text-base xl:text-lg font-mono font-bold text-btn-primary-text w-12 xl:w-16 text-right">{currentTime.toFixed(1)}s</span>
        </div>

        {/* Primary Agentic QA Action: Analyze with Gemini */}
        {onAnalyzeWithGemini && (
          <button
            onClick={onAnalyzeWithGemini}
            disabled={isAnalyzing}
            title="Autonomous Multimodal Quality Control via Gemini"
            className={cn(
              "flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3.5 py-1.5 lg:py-2 rounded-xl text-[10px] lg:text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-md",
              isAnalyzing
                ? "bg-purple-600/60 text-white cursor-wait animate-pulse"
                : "bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 shadow-purple-500/20"
            )}
          >
            <Sparkles size={13} className={isAnalyzing ? "animate-spin" : ""} />
            <span className="whitespace-nowrap">{isAnalyzing ? "Analyzing..." : "Analyze with Gemini"}</span>
          </button>
        )}

        {/* Fidelity QA Score Pill */}
        {typeof overallFidelityScore === 'number' && onOpenFidelityDashboard && (
          <button
            onClick={onOpenFidelityDashboard}
            title="Open Script-to-Screen Fidelity Dashboard"
            className={cn(
              "hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all active:scale-95",
              overallFidelityScore >= 85 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" :
              overallFidelityScore >= 70 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" :
              "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
            )}
          >
            <ShieldCheck size={13} />
            <span>QA: {overallFidelityScore}%</span>
          </button>
        )}

        {/* Cross-Gen History Button */}
        {onOpenHistory && (
          <button
            onClick={onOpenHistory}
            title="ClickHouse Cross-Generation Intelligence"
            className={cn("hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest", UI_TOKENS.button.actionPill)}
          >
            <TrendingUp size={12} className="text-blue-500" />
            <span>History</span>
          </button>
        )}

        <div className={UI_TOKENS.button.modeSwitchContainer}>
          <button
            onClick={() => setMode('playback')}
            className={cn(
              "px-2 lg:px-3 xl:px-5 py-1.5 lg:py-2 rounded-lg text-[10px] lg:text-xs xl:text-sm font-semibold transition-all flex items-center gap-1 lg:gap-2",
              mode === 'playback' ? UI_TOKENS.button.modeSwitchActive : UI_TOKENS.button.modeSwitchInactive
            )}
          >
            <Play size={12} className={mode === 'playback' ? "fill-current" : ""} /> Playback
          </button>
          <button
            onClick={() => setMode('edit')}
            className={cn(
              "px-2 lg:px-3 xl:px-5 py-1.5 lg:py-2 rounded-lg text-[10px] lg:text-xs xl:text-sm font-semibold transition-all flex items-center gap-1 lg:gap-2",
              mode === 'edit' ? UI_TOKENS.button.modeSwitchActive : UI_TOKENS.button.modeSwitchInactive
            )}
          >
            <Edit2 size={12} /> Edit
          </button>
        </div>

        {/* Quick App Shell Theme Switcher */}
        {onCycleThemeMode && (
          <div className="relative hidden lg:block">
            <button
              id="app-theme-cycle-button"
              onClick={onCycleThemeMode}
              className={UI_TOKENS.button.headerIconButton}
              title={`App Theme: ${themeMode === 'auto' ? `Auto (Matching ${effectiveThemeCategory})` : themeMode.toUpperCase()} — Click to cycle (Auto/Light/Warm/Dark)`}
            >
              {themeMode === 'auto' ? (
                <div className="relative">
                  <Sparkles size={16} className="text-amber-500" />
                  <span className="absolute -bottom-1 -right-1 text-[7px] font-black uppercase tracking-tighter opacity-80">A</span>
                </div>
              ) : effectiveThemeCategory === 'dark' ? (
                <Moon size={17} className="text-blue-400" />
              ) : effectiveThemeCategory === 'warm' ? (
                <Coffee size={17} className="text-amber-600" />
              ) : (
                <Sun size={17} className="text-amber-500" />
              )}
            </button>
          </div>
        )}

        <div className="relative hidden lg:block">
          <button
            id="script-theme-header-button"
            onClick={() => setIsColorModalOpen(true)}
            className={isColorModalOpen ? UI_TOKENS.button.headerIconButtonActive : UI_TOKENS.button.headerIconButton}
            title="Script Color & Theme Presets"
          >
            <Palette size={18} />
          </button>
        </div>

        <div className="relative hidden lg:block">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={isSettingsOpen ? UI_TOKENS.button.headerIconButtonActive : UI_TOKENS.button.headerIconButton}
            title="Timing Settings"
          >
            <Clock size={18} />
          </button>
        </div>

        <div className="relative hidden lg:block">
          <button
            onClick={() => setIsInfoModalOpen(true)}
            className={isInfoModalOpen ? UI_TOKENS.button.headerIconButtonActive : UI_TOKENS.button.headerIconButton}
            title="About & Information"
          >
            <Info size={18} />
          </button>
        </div>

        <div className="hidden lg:block h-8 w-px bg-border-main mx-2" />

        <div className="flex items-center gap-1">
          <label
            title="Open Sync (.json)"
            className={cn("cursor-pointer", UI_TOKENS.button.headerIconButton)}
          >
            <FolderOpen size={18} />
            <input type="file" accept=".json" onChange={importJson} className="hidden" />
          </label>
          <button
            onClick={exportJson}
            title="Save Sync (.json)"
            className={UI_TOKENS.button.headerIconButton}
          >
            <Download size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
