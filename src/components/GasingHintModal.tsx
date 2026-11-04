import React from 'react';
import { Lightbulb, X, CheckCircle2, Layers, Sparkles } from 'lucide-react';
import { MathQuestion } from '../types/game';

interface GasingHintModalProps {
  question: MathQuestion;
  onClose: () => void;
  onOpenCaptainAstroTutorial?: () => void;
}

export const GasingHintModal: React.FC<GasingHintModalProps> = ({
  question,
  onClose,
  onOpenCaptainAstroTutorial,
}) => {
  const maxVisualGroups = Math.min(question.divisor, 8);
  const itemsPerVisualBox = Math.min(question.quotient, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 pointer-events-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display tracking-wide text-amber-300">
                Petunjuk Pintar Metode GASING
              </h3>
              <p className="text-xs text-slate-400">
                Gampang, Asyik, dan Menyenangkan · Pengelompokan & Dekomposisi Cepat
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenCaptainAstroTutorial && (
              <button
                onClick={onOpenCaptainAstroTutorial}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Tutorial Captain Astro
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              aria-label="Tutup Petunjuk"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* Target Equation */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-xs text-slate-400">Soal Pertempuran Saat Ini</span>
              <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-cyan-300 mt-0.5">
                {question.dividend.toLocaleString('id-ID')} ÷ {question.divisor} = ?
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Konsep Pembagian</span>
              <div className="text-sm font-medium text-slate-200 mt-0.5">
                Bagikan <span className="text-cyan-300 font-mono">{question.dividend.toLocaleString('id-ID')}</span> energi ke dalam{' '}
                <span className="text-amber-300 font-mono">{question.divisor}</span> wadah sama rata
              </div>
            </div>
          </div>

          {/* Step-by-step GASING Breakdown */}
          <div className="space-y-2.5">
            {question.gasingSteps.map((step, index) => (
              <div
                key={index}
                className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-cyan-400">{step.label}</div>
                  <p className="text-xs text-slate-300">{step.explanation}</p>
                </div>
                <div className="px-3.5 py-2 rounded-lg bg-slate-900 border border-cyan-500/30 font-mono tabular-nums text-sm sm:text-base font-bold text-amber-300 whitespace-nowrap shrink-0">
                  {step.equation}
                </div>
              </div>
            ))}
          </div>

          {/* Visual Grouping Simulation */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>
                  Visualisasi Pengelompokan ({question.divisor} Kelompok × {question.quotient.toLocaleString('id-ID')} Energi
                  {question.remainder > 0 ? ` + Sisa ${question.remainder}` : ''})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {Array.from({ length: maxVisualGroups }).map((_, gIdx) => (
                <div
                  key={gIdx}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col items-center gap-1.5"
                >
                  <span className="text-[11px] font-mono text-slate-400">
                    Wadah #{gIdx + 1}
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-1 min-h-[28px]">
                    {Array.from({ length: itemsPerVisualBox }).map((__, orbIdx) => (
                      <span
                        key={orbIdx}
                        className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold font-mono text-cyan-300 tabular-nums">
                    = {question.quotient.toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
            </div>
            {question.divisor > maxVisualGroups && (
              <p className="text-[11px] text-slate-400 text-center">
                ...dan {question.divisor - maxVisualGroups} wadah lainnya masing-masing berisi{' '}
                {question.quotient.toLocaleString('id-ID')} energi.
              </p>
            )}

            {/* Remainder visualization if any */}
            {question.remainder > 0 && (
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-amber-300 font-medium">
                  Butir Energi Sisa (tidak cukup dibagi ke {question.divisor} wadah):
                </span>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: Math.min(question.remainder, 12) }).map((_, rIdx) => (
                    <span
                      key={rIdx}
                      className="w-3 h-3 rounded-full bg-amber-400 border border-amber-200 inline-block"
                    />
                  ))}
                  <span className="ml-2 text-sm font-mono font-bold text-amber-300 tabular-nums">
                    Sisa {question.remainder}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Summary Conclusion */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs text-emerald-300 font-medium">Kesimpulan Metode GASING</div>
                <div className="text-base sm:text-lg font-bold font-mono text-white tabular-nums">
                  {question.gasingSummary}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors whitespace-nowrap shrink-0"
            >
              Mengerti & Tembak!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
