import React from 'react';
import { RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  showDetails: boolean;
}

/**
 * Update 1.9 — Top-Level Application Error Boundary for ភូមិខ្ញុំ (Phum Khnhom).
 * Prevents blank white/black screens on unexpected runtime errors by showing
 * a warm Khmer village recovery card with 1-click Reload & safe cache recovery.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage: error?.message || String(error || 'Unexpected application error'),
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[Phum Khnhom ErrorBoundary]', error, info.componentStack);
  }

  private handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleSafeResetAndReload = (): void => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('phum_khnhom_vfx_quality_v1');
      } catch {
        // Ignore storage error
      }
      window.location.reload();
    }
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-dvh w-screen bg-gradient-to-b from-slate-950 via-amber-950/80 to-slate-950 flex items-center justify-center p-4">
        <div className="phum-panel w-[min(94vw,460px)] rounded-2xl overflow-hidden shadow-2xl">
          <div className="phum-wood px-4 py-3 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-300 shrink-0" />
            <div>
              <h1 className="font-display font-bold text-base text-amber-100">
                ភូមិខ្ញុំ — Reconnect / Reload
              </h1>
              <p className="text-[11px] text-amber-200/85">
                Your village save &amp; inventory remain safely stored.
              </p>
            </div>
          </div>

          <div className="p-4 space-y-3 text-xs text-amber-950">
            <p className="leading-relaxed">
              An unexpected UI hiccup interrupted <strong>ភូមិខ្ញុំ (Phum Khnhom)</strong>. Tap{' '}
              <strong>Reconnect &amp; Reload</strong> below to return straight to the Village Plaza.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white border-2 border-emerald-950 font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Reconnect &amp; Reload
              </button>
              <button
                type="button"
                onClick={this.handleSafeResetAndReload}
                className="px-3 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border-2 border-amber-900/40 font-display font-bold text-xs flex items-center gap-1 cursor-pointer"
                title="Reset VFX preferences to defaults and reload"
              >
                <Trash2 className="w-3.5 h-3.5" /> Safe Mode
              </button>
            </div>

            <div>
              <button
                type="button"
                onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                className="text-[10px] font-bold text-amber-800 underline cursor-pointer"
              >
                {this.state.showDetails ? 'Hide Technical Details' : 'Show Technical Details'}
              </button>
              {this.state.showDetails && (
                <pre className="mt-1.5 p-2 rounded-lg bg-slate-900 text-amber-200 text-[10px] font-mono overflow-x-auto max-h-32 whitespace-pre-wrap">
                  {this.state.errorMessage}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
