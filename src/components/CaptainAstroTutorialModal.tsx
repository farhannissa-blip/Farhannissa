import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Play,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Star,
} from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

interface CaptainAstroTutorialModalProps {
  onClose: () => void;
  onStartBattle: () => void;
}

type AstroPose = 'wave' | 'point' | 'count' | 'think' | 'cheer';

interface PracticeItem {
  id: number;
  equation: string;
  dividend: number;
  divisor: number;
  quotient: number;
  remainder: number;
  correctText: string;
  options: { prefix: string; text: string; isCorrect: boolean }[];
  hintExplanation: string;
}

const PRACTICE_QUESTIONS: PracticeItem[] = [
  {
    id: 1,
    equation: '7 ÷ 2 = ?',
    dividend: 7,
    divisor: 2,
    quotient: 3,
    remainder: 1,
    correctText: '3 sisa 1',
    options: [
      { prefix: 'A', text: '3 sisa 1', isCorrect: true },
      { prefix: 'B', text: '2 sisa 1', isCorrect: false },
      { prefix: 'C', text: '3 sisa 2', isCorrect: false },
      { prefix: 'D', text: '4 sisa 1', isCorrect: false },
    ],
    hintExplanation:
      'Kelompokkan 7 bola menjadi 2-2: (2 + 2 + 2 = 6), terbentuk 3 kelompok utuh. Sisanya 7 - 6 = 1 bola. Jadi 3 sisa 1!',
  },
  {
    id: 2,
    equation: '9 ÷ 4 = ?',
    dividend: 9,
    divisor: 4,
    quotient: 2,
    remainder: 1,
    correctText: '2 sisa 1',
    options: [
      { prefix: 'A', text: '3 sisa 1', isCorrect: false },
      { prefix: 'B', text: '2 sisa 1', isCorrect: true },
      { prefix: 'C', text: '2 sisa 3', isCorrect: false },
      { prefix: 'D', text: '1 sisa 5', isCorrect: false },
    ],
    hintExplanation:
      'Kelompokkan 9 bola menjadi 4-4: (4 + 4 = 8), terbentuk 2 kelompok utuh. Sisanya 9 - 8 = 1 bola. Jadi 2 sisa 1!',
  },
  {
    id: 3,
    equation: '8 ÷ 5 = ?',
    dividend: 8,
    divisor: 5,
    quotient: 1,
    remainder: 3,
    correctText: '1 sisa 3',
    options: [
      { prefix: 'A', text: '2 sisa 2', isCorrect: false },
      { prefix: 'B', text: '1 sisa 2', isCorrect: false },
      { prefix: 'C', text: '1 sisa 3', isCorrect: true },
      { prefix: 'D', text: '2 sisa 3', isCorrect: false },
    ],
    hintExplanation:
      'Dari 8 bola, kita hanya bisa membuat 1 kelompok berisi 5 bola. Sisanya 8 - 5 = 3 bola. Jadi 1 sisa 3!',
  },
];

export const CaptainAstroTutorialModal: React.FC<CaptainAstroTutorialModalProps> = ({
  onClose,
  onStartBattle,
}) => {
  const [mode, setMode] = useState<'tutorial' | 'practice'>('tutorial');
  const [step, setStep] = useState<number>(1); // 1 to 5
  const [practiceIdx, setPracticeIdx] = useState<number>(0);
  const [practiceStatus, setPracticeStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [completedPractices, setCompletedPractices] = useState<number[]>([]);

  const currentPractice = PRACTICE_QUESTIONS[practiceIdx];

  // Determine Captain Astro's pose & speech
  const getAstroPoseAndSpeech = (): { pose: AstroPose; title: string; speech: string } => {
    if (mode === 'practice') {
      if (practiceStatus === 'correct') {
        return {
          pose: 'cheer',
          title: 'Captain Astro Bangga Padamu!',
          speech: `Luar biasa, Pilot Cilik! Jawabanmu "${currentPractice.correctText}" sangat tepat! Kamu mendapat Bintang Emas GASING!`,
        };
      }
      if (practiceStatus === 'wrong') {
        return {
          pose: 'think',
          title: 'Yuk Hitung Bersama Captain Astro!',
          speech: currentPractice.hintExplanation,
        };
      }
      return {
        pose: 'point',
        title: `Latihan Interaktif ${practiceIdx + 1} dari 3`,
        speech: `Ayo selesaikan soal ${currentPractice.equation} dengan mengelompokkan ${currentPractice.dividend} bola energi ke dalam wadah berisi ${currentPractice.divisor}!`,
      };
    }

    switch (step) {
      case 1:
        return {
          pose: 'wave',
          title: 'Langkah 1 – Memahami Pembagian Bersisa',
          speech:
            '"Halo, pilot cilik! Hari ini kita belajar pembagian bersisa. Yuk, kita hitung bersama! Kita akan membagi 8 benda menjadi kelompok yang masing-masing berisi 3 benda."',
        };
      case 2:
        return {
          pose: 'point',
          title: 'Langkah 2 – Membentuk Kelompok',
          speech:
            '"Perhatikan! Tiga bola masuk ke Kelompok Pertama, tiga bola masuk ke Kelompok Kedua, dan masih tersisa dua bola di luar wadah!"',
        };
      case 3:
        return {
          pose: 'count',
          title: 'Langkah 3 – Menghitung Hasil Bagi',
          speech:
            '"Mari kita jumlahkan bola di dalam kelompok utuh: 3 + 3 = 6. Ada 2 kelompok lengkap yang berhasil terbentuk. Jadi hasil bagi adalah 2!"',
        };
      case 4:
        return {
          pose: 'think',
          title: 'Langkah 4 – Menghitung Sisa',
          speech:
            '"Sekarang kita kurangkan: 8 - 6 = 2. Dua bola masih tersisa dan tidak dapat membentuk kelompok baru berisi tiga benda. Jadi sisanya adalah 2!"',
        };
      default:
        return {
          pose: 'cheer',
          title: 'Langkah 5 – Kesimpulan Metode GASING',
          speech:
            '"Hebat! Kita berhasil membentuk dua kelompok, dan masih ada dua benda tersisa! Jadi 8 ÷ 3 = 2 SISA 2!"',
        };
    }
  };

  const { pose, title, speech } = getAstroPoseAndSpeech();

  const handleSelectPracticeOption = (isCorrect: boolean) => {
    if (isCorrect) {
      soundEngine.playCorrect(3);
      setPracticeStatus('correct');
      if (!completedPractices.includes(currentPractice.id)) {
        setCompletedPractices((prev) => [...prev, currentPractice.id]);
      }
    } else {
      soundEngine.playWrong();
      setPracticeStatus('wrong');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 pointer-events-auto">
      <div className="w-full max-w-4xl max-h-[92vh] bg-slate-900 border-2 border-cyan-400/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold font-display text-white">
                TUTORIAL INTERAKTIF METODE GASING BERSAMA CAPTAIN ASTRO
              </h2>
              <p className="text-xs text-cyan-300">
                Pembagian 1 Digit oleh 1 Digit Dengan Sisa · Media Pembelajaran SDN 66 Banda Aceh
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[42px] min-w-[42px] p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
            aria-label="Tutup Tutorial"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Top Grid: Captain Astro Character Card (Left) + Speech & Stage (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
            {/* Captain Astro 3D-Styled Character Box */}
            <div className="md:col-span-4 p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 flex flex-col items-center justify-between text-center">
              <div className="text-xs font-mono font-bold text-cyan-300 tracking-wider">
                INSTRUKTUR GALAKSI
              </div>

              {/* Animated SVG 3D-Styled Captain Astro */}
              <div
                className={`my-2 transition-transform duration-300 ${
                  pose === 'cheer' ? '-translate-y-2 scale-105' : ''
                }`}
              >
                <svg
                  viewBox="0 0 200 220"
                  className="w-36 h-40 sm:w-44 sm:h-48 mx-auto"
                  role="img"
                  aria-label="Captain Astro"
                >
                  <defs>
                    <radialGradient id="astroHelmetGlow" cx="50%" cy="45%" r="50%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity="0.1" />
                    </radialGradient>
                    <linearGradient id="astroSuitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="100%" stopColor="#cbd5e1" />
                    </linearGradient>
                  </defs>

                  {/* Jetpack */}
                  <rect x="52" y="95" width="96" height="72" rx="14" fill="#64748b" />
                  {/* Helmet Base */}
                  <circle cx="100" cy="64" r="44" fill="url(#astroSuitGrad)" stroke="#38bdf8" strokeWidth="4" />
                  {/* Friendly Face inside Transparent Visor */}
                  <circle cx="100" cy="64" r="35" fill="#0f172a" />
                  <circle cx="100" cy="64" r="35" fill="url(#astroHelmetGlow)" />
                  {/* Eyes */}
                  <circle cx="86" cy="58" r="5" fill="#38bdf8" />
                  <circle cx="114" cy="58" r="5" fill="#38bdf8" />
                  <circle cx="88" cy="56" r="2" fill="#ffffff" />
                  <circle cx="116" cy="56" r="2" fill="#ffffff" />
                  {/* Expression Mouth */}
                  {pose === 'think' ? (
                    <circle cx="104" cy="74" r="4.5" fill="#fbbf24" />
                  ) : (
                    <path
                      d="M 86 71 Q 100 84 114 71"
                      stroke="#38bdf8"
                      strokeWidth="3.5"
                      fill="none"
                      strokeLinecap="round"
                    />
                  )}
                  {/* Helmet Visor Glint */}
                  <path
                    d="M 74 44 Q 88 34 110 40"
                    stroke="#ffffff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.65"
                  />

                  {/* Space Suit Torso (White with Blue Accents) */}
                  <rect x="64" y="106" width="72" height="68" rx="16" fill="url(#astroSuitGrad)" stroke="#0284c7" strokeWidth="3" />
                  {/* Chest Glowing Light Module */}
                  <rect x="80" y="120" width="40" height="24" rx="6" fill="#0284c7" />
                  <circle cx="100" cy="132" r="7" fill="#fde047" />

                  {/* Left Arm (Waves / Points / Thumbs Up) */}
                  {pose === 'wave' || pose === 'cheer' ? (
                    <g>
                      <path
                        d="M 64 118 Q 34 95 36 68"
                        stroke="#f8fafc"
                        strokeWidth="16"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <circle cx="36" cy="64" r="10" fill="#0284c7" />
                    </g>
                  ) : (
                    <g>
                      <path
                        d="M 64 118 Q 42 135 44 156"
                        stroke="#f8fafc"
                        strokeWidth="16"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <circle cx="44" cy="160" r="10" fill="#0284c7" />
                    </g>
                  )}

                  {/* Right Arm (Points to numbers) */}
                  {pose === 'point' || pose === 'count' || pose === 'cheer' ? (
                    <g>
                      <path
                        d="M 136 118 Q 168 102 174 82"
                        stroke="#f8fafc"
                        strokeWidth="16"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <circle cx="175" cy="78" r="10" fill="#0284c7" />
                    </g>
                  ) : (
                    <g>
                      <path
                        d="M 136 118 Q 158 135 156 156"
                        stroke="#f8fafc"
                        strokeWidth="16"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <circle cx="156" cy="160" r="10" fill="#0284c7" />
                    </g>
                  )}

                  {/* Astronaut Boots */}
                  <rect x="72" y="172" width="22" height="34" rx="8" fill="#e2e8f0" stroke="#0284c7" strokeWidth="2.5" />
                  <rect x="106" y="172" width="22" height="34" rx="8" fill="#e2e8f0" stroke="#0284c7" strokeWidth="2.5" />
                  <rect x="68" y="198" width="28" height="12" rx="6" fill="#0284c7" />
                  <rect x="104" y="198" width="28" height="12" rx="6" fill="#0284c7" />
                </svg>
              </div>

              <div>
                <div className="text-base font-extrabold font-display text-white">
                  CAPTAIN ASTRO
                </div>
                <div className="text-xs text-cyan-400">Guru Matematika Astronot</div>
              </div>
            </div>

            {/* Interactive Lesson / Practice Stage */}
            <div className="md:col-span-8 p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-4">
              {/* Speech Bubble */}
              <div className="p-4 rounded-xl bg-cyan-950/50 border border-cyan-400/40 space-y-1.5">
                <div className="text-xs font-bold font-display text-amber-300 uppercase tracking-wider">
                  {title}
                </div>
                <p className="text-sm sm:text-base text-white leading-relaxed font-medium">
                  {speech}
                </p>
              </div>

              {/* MODE A: 5-STEP INTERACTIVE TUTORIAL (8 ÷ 3 = 2 SISA 2) */}
              {mode === 'tutorial' && (
                <div className="space-y-4 my-auto">
                  {/* Giant Equation Display */}
                  <div className="text-center p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-3xl sm:text-4xl font-extrabold font-mono text-cyan-300 tabular-nums">
                      {step < 5 ? '8 ÷ 3 = ?' : '8 ÷ 3 = 2 SISA 2'}
                    </div>
                  </div>

                  {/* Step 1: 8 Ungrouped Energy Balls */}
                  {step === 1 && (
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center space-y-3">
                      <div className="text-xs text-slate-300">
                        Delapan Bola Energi Kosmik Siap Dikelompokkan (Masing-masing Kelompok = 3 Bola):
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3 py-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div
                            key={i}
                            className="w-10 h-10 rounded-full bg-cyan-400 text-slate-950 font-mono font-extrabold flex items-center justify-center shadow-lg shadow-cyan-400/30"
                          >
                            {i + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 2, 3, 4, 5: Visual Grouping into 2 Pods of 3 + 2 Remainder */}
                  {step >= 2 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Group 1 */}
                      <div className="p-3.5 rounded-xl bg-emerald-950/40 border-2 border-emerald-400/60 text-center space-y-2">
                        <div className="text-xs font-bold text-emerald-300">
                          KELOMPOK 1 (Lengkap)
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          {[1, 2, 3].map((n) => (
                            <span
                              key={n}
                              className="w-8 h-8 rounded-full bg-emerald-400 text-slate-950 font-mono font-bold text-sm flex items-center justify-center"
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs font-mono text-emerald-200">Isi = 3 Bola</div>
                      </div>

                      {/* Group 2 */}
                      <div className="p-3.5 rounded-xl bg-emerald-950/40 border-2 border-emerald-400/60 text-center space-y-2">
                        <div className="text-xs font-bold text-emerald-300">
                          KELOMPOK 2 (Lengkap)
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          {[4, 5, 6].map((n) => (
                            <span
                              key={n}
                              className="w-8 h-8 rounded-full bg-emerald-400 text-slate-950 font-mono font-bold text-sm flex items-center justify-center"
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs font-mono text-emerald-200">Isi = 3 Bola</div>
                      </div>

                      {/* Leftover Remainder */}
                      <div className="p-3.5 rounded-xl bg-amber-950/40 border-2 border-amber-400/70 text-center space-y-2">
                        <div className="text-xs font-bold text-amber-300">
                          BOLA TERSISA (Sisa)
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          {[7, 8].map((n) => (
                            <span
                              key={n}
                              className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-mono font-bold text-sm flex items-center justify-center"
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs font-mono text-amber-200">
                          Sisa = 2 Bola (&lt; 3)
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Equations for Step 3, 4, 5 */}
                  {step === 3 && (
                    <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/40 text-center font-mono text-base sm:text-lg font-bold text-cyan-300">
                      3 + 3 = 6  →  Ada 2 Kelompok Lengkap  →  Hasil Bagi = 2
                    </div>
                  )}
                  {step === 4 && (
                    <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/40 text-center font-mono text-base sm:text-lg font-bold text-amber-300">
                      8 - 6 = 2  →  Tersisa 2 Bola  →  Sisa = 2
                    </div>
                  )}
                  {step === 5 && (
                    <div className="p-4 rounded-xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center gap-3 text-amber-300 font-display font-extrabold text-lg">
                      <Star className="w-6 h-6 fill-amber-300" />
                      <span>8 ÷ 3 = 2 SISA 2</span>
                      <Star className="w-6 h-6 fill-amber-300" />
                    </div>
                  )}

                  {/* Step Navigation Buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setStep((s) => Math.max(1, s - 1))}
                      disabled={step <= 1}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Langkah Sebelumnya</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((sNum) => (
                        <button
                          key={sNum}
                          onClick={() => setStep(sNum)}
                          className={`w-8 h-8 rounded-lg font-mono text-xs font-bold ${
                            step === sNum
                              ? 'bg-cyan-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {sNum}
                        </button>
                      ))}
                    </div>

                    {step < 5 ? (
                      <button
                        onClick={() => {
                          soundEngine.playCorrect(step);
                          setStep((s) => Math.min(5, s + 1));
                        }}
                        className="min-h-[44px] px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5"
                      >
                        <span>Langkah Berikutnya</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          soundEngine.playCorrect(4);
                          setMode('practice');
                          setPracticeIdx(0);
                          setPracticeStatus('idle');
                        }}
                        className="min-h-[44px] px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold flex items-center gap-1.5"
                      >
                        <span>Lanjut 3 Latihan Interaktif!</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* MODE B: 3 INTERACTIVE PRACTICE EXERCISES (7 ÷ 2, 9 ÷ 4, 8 ÷ 5) */}
              {mode === 'practice' && (
                <div className="space-y-4 my-auto">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {PRACTICE_QUESTIONS.map((pq, idx) => (
                        <button
                          key={pq.id}
                          onClick={() => {
                            setPracticeIdx(idx);
                            setPracticeStatus('idle');
                          }}
                          className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${
                            practiceIdx === idx
                              ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                              : 'bg-slate-900 text-slate-300 border-slate-800'
                          }`}
                        >
                          <span>Soal #{idx + 1}: {pq.equation}</span>
                          {completedPractices.includes(pq.id) && (
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Practice Equation & Visual Balls */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-3">
                    <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white tabular-nums">
                      {currentPractice.equation}
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {Array.from({ length: currentPractice.dividend }).map((_, bIdx) => {
                        const isRemainderBall =
                          bIdx >= currentPractice.quotient * currentPractice.divisor;
                        return (
                          <span
                            key={bIdx}
                            className={`w-8 h-8 rounded-full font-mono text-xs font-bold flex items-center justify-center ${
                              isRemainderBall
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-cyan-400 text-slate-950'
                            }`}
                          >
                            {bIdx + 1}
                          </span>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-400">
                      Kelompokkan {currentPractice.dividend} bola menjadi wadah berisi{' '}
                      <strong className="text-white">{currentPractice.divisor} bola</strong>!
                    </p>
                  </div>

                  {/* 4 Choice Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    {currentPractice.options.map((opt) => (
                      <button
                        key={opt.prefix}
                        onClick={() => handleSelectPracticeOption(opt.isCorrect)}
                        className="min-h-[52px] p-3 rounded-xl bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-500/40 font-mono font-bold text-base sm:text-lg text-white flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                          {opt.prefix}
                        </span>
                        <span className="mx-auto">{opt.text}</span>
                      </button>
                    ))}
                  </div>

                  {practiceStatus === 'correct' && (
                    <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-400 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-300 text-xs sm:text-sm font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Benar Sekali! Bintang Emas diperoleh!</span>
                      </div>
                      {practiceIdx < PRACTICE_QUESTIONS.length - 1 && (
                        <button
                          onClick={() => {
                            setPracticeIdx((i) => i + 1);
                            setPracticeStatus('idle');
                          }}
                          className="px-4 py-2 rounded-lg bg-emerald-400 text-slate-950 font-bold text-xs"
                        >
                          Soal Latihan Berikutnya →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom 3 Required Action Buttons: PELAJARI LAGI, COBA LATIHAN, MULAI PERTEMPURAN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                setMode('tutorial');
                setStep(1);
              }}
              className="min-h-[48px] py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span>PELAJARI LAGI</span>
            </button>

            <button
              onClick={() => {
                setMode('practice');
                setPracticeIdx(0);
                setPracticeStatus('idle');
              }}
              className="min-h-[48px] py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>COBA LATIHAN (3 SOAL)</span>
            </button>

            <button
              onClick={onStartBattle}
              className="min-h-[48px] py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold font-display text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>MULAI PERTEMPURAN</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
