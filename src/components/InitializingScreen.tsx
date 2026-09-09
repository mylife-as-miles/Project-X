import React from 'react';
import { Loader2 } from 'lucide-react';

export function InitializingScreen() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-app gap-6">
      <span className="text-4xl lg:text-5xl font-black tracking-tight text-text-main whitespace-nowrap" aria-label="Project X">PROJECT <span className="text-amber-500">X</span></span>
      <div className="flex items-center gap-2 text-text-faint">
        <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
        <p className="text-text-muted font-mono text-[10px] uppercase tracking-widest font-bold">Initializing System...</p>
      </div>
    </div>
  );
}
