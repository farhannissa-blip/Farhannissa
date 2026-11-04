import React, { useEffect, useState } from 'react';
import {
  X,
  Trophy,
  Rocket,
  Shield,
  Zap,
  Heart,
  Flame,
  RefreshCw,
  Check,
  Lock,
  Volume2,
  VolumeX,
  Database,
  BookOpen,
  Crosshair,
  Search,
  Sparkles,
  RotateCw,
  AlertTriangle,
} from 'lucide-react';
import {
  DivisionCategoryId,
  GameSettings,
  LeaderboardEntry,
  ModalType,
  PlayerProfile,
} from '../types/game';
import {
  ALIEN_TYPES,
  DIVISION_CATEGORIES,
  LASER_UPGRADE_NAMES,
  PLANETS,
  PLAYER_SPACESHIPS,
  UFO_TYPES,
} from '../data/gameData';

interface GameModalsProps {
  activeModal: ModalType;
  onClose: () => void;
  selectedCategory: DivisionCategoryId;
  onSelectCategory: (catId: DivisionCategoryId) => void;
  selectedPlanetId: number;
  onSelectPlanet: (planetId: number) => void;
  profile: PlayerProfile;
  onUpdateProfile: (next: PlayerProfile) => void;
  leaderboard: LeaderboardEntry[];
  isFirebaseLive: boolean;
  onRefreshLeaderboard: () => void;
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onStartGameFromModal: () => void;
  initialGarageTab?: 'ships' | 'weapons' | 'codex';
  onOpenCaptainAstroTutorial?: () => void;
}

export const GameModals: React.FC<GameModalsProps> = ({
  activeModal,
  onClose,
  selectedCategory,
  onSelectCategory,
  selectedPlanetId,
  onSelectPlanet,
  profile,
  onUpdateProfile,
  leaderboard,
  isFirebaseLive,
  onRefreshLeaderboard,
  settings,
  onUpdateSettings,
  onStartGameFromModal,
  initialGarageTab = 'ships',
  onOpenCaptainAstroTutorial,
}) => {
  const [garageTab, setGarageTab] = useState<'ships' | 'weapons' | 'codex'>(
    initialGarageTab
  );
  const [inspectedShipId, setInspectedShipId] = useState<string>(
    profile.selectedShipId
  );
  const [hangarRotationDeg, setHangarRotationDeg] = useState<number>(25);
  const [hangarNotice, setHangarNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [lbCategoryFilter, setLbCategoryFilter] = useState<number>(0);
  const [lbClassFilter, setLbClassFilter] = useState<string>('ALL');
  const [lbSearch, setLbSearch] = useState<string>('');

  useEffect(() => {
    if (activeModal === 'SPACE_GARAGE') {
      setGarageTab(initialGarageTab);
      setInspectedShipId(profile.selectedShipId);
      setHangarNotice(null);
    }
  }, [activeModal, initialGarageTab, profile.selectedShipId]);

  if (activeModal === 'NONE' || activeModal === 'GASING_TUTORIAL') return null;

  // Filtered Leaderboard
  const filteredLeaderboard = leaderboard.filter((entry) => {
    if (lbCategoryFilter !== 0 && entry.categoryId !== lbCategoryFilter)
      return false;
    if (
      lbClassFilter !== 'ALL' &&
      entry.className.toLowerCase() !== lbClassFilter.toLowerCase()
    ) {
      return false;
    }
    if (lbSearch.trim()) {
      const q = lbSearch.trim().toLowerCase();
      return (
        entry.playerName.toLowerCase().includes(q) ||
        entry.school.toLowerCase().includes(q) ||
        entry.className.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const uniqueClasses = Array.from(
    new Set(leaderboard.map((e) => e.className))
  ).slice(0, 12);
  const top3 = filteredLeaderboard.slice(0, 3);

  const inspectedShip =
    PLAYER_SPACESHIPS.find((s) => s.id === inspectedShipId) ||
    PLAYER_SPACESHIPS.find((s) => s.id === profile.selectedShipId) ||
    PLAYER_SPACESHIPS[0];

  // Garage Buy or Select Ship Handler
  const handleUnlockOrSelectShip = (
    shipId: string,
    costCoins: number,
    reqScore: number
  ) => {
    setInspectedShipId(shipId);
    if (profile.unlockedShips.includes(shipId)) {
      onUpdateProfile({ ...profile, selectedShipId: shipId });
      setHangarNotice({
        type: 'success',
        message: 'Pesawat berhasil dipilih dan siap diluncurkan ke arena!',
      });
      return;
    }

    if (profile.coins >= costCoins || profile.highScore >= reqScore) {
      const deductCoins = profile.coins >= costCoins ? costCoins : 0;
      onUpdateProfile({
        ...profile,
        coins: profile.coins - deductCoins,
        unlockedShips: [...profile.unlockedShips, shipId],
        selectedShipId: shipId,
      });
      setHangarNotice({
        type: 'success',
        message:
          'PESAWAT BARU BERHASIL DIBELI! Sekarang aktif di Hanggar Utama!',
      });
    } else {
      setHangarNotice({
        type: 'error',
        message: 'KOINS BELUM CUKUP! Ayo hancurkan lebih banyak UFO!',
      });
    }
  };

  const handleBuyUpgrade = (
    type: 'laser' | 'armor' | 'health' | 'speed' | 'bomb' | 'shield',
    cost: number
  ) => {
    if (profile.coins < cost) {
      setHangarNotice({
        type: 'error',
        message: 'KOINS BELUM CUKUP! Ayo hancurkan lebih banyak UFO!',
      });
      return;
    }
    const up = { ...profile.upgrades };
    if (type === 'laser' && up.laserLevel < 5) up.laserLevel += 1;
    else if (type === 'armor' && up.armorLevel < 5) up.armorLevel += 1;
    else if (type === 'health' && up.maxHealth < 5) up.maxHealth += 1;
    else if (type === 'speed' && up.speedLevel < 5) up.speedLevel += 1;
    else if (type === 'bomb') up.megaBombs += 1;
    else if (type === 'shield') up.shieldCharges += 1;
    else return;

    onUpdateProfile({
      ...profile,
      coins: profile.coins - cost,
      upgrades: up,
    });
    setHangarNotice({
      type: 'success',
      message: 'Upgrade komponen pesawat berhasil dipasang!',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 pointer-events-auto">
      <div className="w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            {activeModal === 'CATEGORY_SELECT' && (
              <Crosshair className="w-6 h-6 text-cyan-400" />
            )}
            {activeModal === 'LEADERBOARD' && (
              <Trophy className="w-6 h-6 text-amber-400" />
            )}
            {activeModal === 'SPACE_GARAGE' && (
              <Rocket className="w-6 h-6 text-cyan-400" />
            )}
            {activeModal === 'HOW_TO_PLAY' && (
              <BookOpen className="w-6 h-6 text-emerald-400" />
            )}
            {activeModal === 'SETTINGS' && (
              <Database className="w-6 h-6 text-cyan-400" />
            )}
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-display tracking-wide text-white">
                {activeModal === 'CATEGORY_SELECT' &&
                  'Pilih 7 Kategori Pembagian GASING & Arena Galaksi'}
                {activeModal === 'LEADERBOARD' &&
                  'Leaderboard Global Top 100 – Galactic Division Wars'}
                {activeModal === 'SPACE_GARAGE' &&
                  'Space Garage – Hanggar 3D, Pesawat Baru & Upgrade Senjata'}
                {activeModal === 'HOW_TO_PLAY' &&
                  'Panduan Misi & Tutorial Pembagian Metode GASING'}
                {activeModal === 'SETTINGS' &&
                  'Pengaturan Layar, Audio & Grafis 3D Ringan'}
              </h2>
              <p className="text-[11px] font-mono text-cyan-400">
                Media Pembelajaran SDN 66 Banda Aceh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-amber-500/30 text-amber-300 font-mono text-sm font-bold tabular-nums">
              Koin: {profile.coins.toLocaleString('id-ID')}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* 1. CATEGORY & PLANET SELECT MODAL (7 CATEGORIES + ARENA ENVIRONMENTS) */}
          {activeModal === 'CATEGORY_SELECT' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-bold text-slate-200">
                  1. Pilih Tujuh Kategori Pembelajaran Pembagian Metode GASING
                </h3>
                {onOpenCaptainAstroTutorial && (
                  <button
                    onClick={onOpenCaptainAstroTutorial}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    Buka Tutorial Interaktif Captain Astro (Kategori 1)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DIVISION_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => onSelectCategory(cat.id)}
                      className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'bg-cyan-950/60 border-cyan-400 shadow-lg shadow-cyan-500/10'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                          <span className="text-cyan-300 font-bold">
                            {cat.code}
                          </span>
                          <span>
                            Skor ×{cat.scoreMultiplier} · {cat.baseTimeSeconds}{' '}
                            dtk
                          </span>
                        </div>
                        <div className="text-base font-bold text-white font-display">
                          {cat.title}
                        </div>
                        <div className="text-[11px] font-mono text-amber-300">
                          Arena: {cat.environment.arenaName}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {cat.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 space-y-1">
                        <div className="text-[11px] text-slate-400">
                          Contoh Soal:
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-mono text-cyan-300 tabular-nums">
                          {cat.examples.slice(0, 2).map((ex, i) => (
                            <span key={i}>{ex}</span>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 8 Planets Selector */}
              <div>
                <h3 className="text-base font-bold text-slate-200 mb-3">
                  2. Pilih Sektor Planet Tujuan (8 Planet Pertempuran)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PLANETS.map((planet) => {
                    const isSelected = selectedPlanetId === planet.id;
                    return (
                      <button
                        key={planet.id}
                        onClick={() => onSelectPlanet(planet.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-amber-950/50 border-amber-400'
                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                          <span>PLANET 0{planet.id}</span>
                          <span>
                            Lv {planet.levelRange[0]}–{planet.levelRange[1]}
                          </span>
                        </div>
                        <div className="text-sm font-bold font-display text-white truncate">
                          {planet.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          Boss: {planet.bossName}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-200"
                >
                  Simpan Pilihan
                </button>
                <button
                  onClick={onStartGameFromModal}
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-bold font-display tracking-wide"
                >
                  Luncurkan Misi Sekarang
                </button>
              </div>
            </div>
          )}

          {/* 2. LEADERBOARD TOP 100 MODAL */}
          {activeModal === 'LEADERBOARD' && (
            <div className="space-y-6">
              {/* Connection Status & Filters Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-semibold text-slate-300">
                    Status Database:
                  </span>
                  <span className="text-cyan-300 font-mono">
                    {isFirebaseLive
                      ? 'Firebase Realtime Database Aktif (Live Sync)'
                      : 'Mode Lokal Tersinkronisasi (Siap Koneksi Firebase)'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={lbSearch}
                      onChange={(e) => setLbSearch(e.target.value)}
                      placeholder="Cari nama atau sekolah..."
                      className="pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <select
                    value={lbCategoryFilter}
                    onChange={(e) =>
                      setLbCategoryFilter(Number(e.target.value))
                    }
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                  >
                    <option value={0}>Semua Kategori (1–7)</option>
                    {DIVISION_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        Kategori {c.id}: {c.subtitle}
                      </option>
                    ))}
                  </select>

                  <select
                    value={lbClassFilter}
                    onChange={(e) => setLbClassFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                  >
                    <option value="ALL">Semua Kelas</option>
                    {uniqueClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        Kelas {cls}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={onRefreshLeaderboard}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-cyan-300 flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* TOP 3 PODIUM SHOWCASE */}
              {top3.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
                  {/* Rank 2 - Silver Trophy */}
                  {top3[1] && (
                    <div className="order-2 md:order-1 p-4 rounded-xl bg-slate-950 border border-slate-700 flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-500 flex items-center justify-center mb-2">
                        <Trophy className="w-6 h-6 text-slate-300" />
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        PERINGKAT #2 · PIALA PERAK
                      </span>
                      <div className="text-base font-bold text-white mt-1 truncate max-w-full">
                        {top3[1].playerName}
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-full">
                        {top3[1].school} · Kelas {top3[1].className}
                      </div>
                      <div className="text-xl font-bold font-mono text-slate-200 tabular-nums mt-2">
                        {top3[1].score.toLocaleString('id-ID')} pts
                      </div>
                    </div>
                  )}

                  {/* Rank 1 - Gold Trophy */}
                  {top3[0] && (
                    <div className="order-1 md:order-2 p-5 rounded-xl bg-amber-950/30 border-2 border-amber-400/80 flex flex-col items-center text-center shadow-lg shadow-amber-500/10">
                      <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center mb-2">
                        <Trophy className="w-8 h-8 text-amber-300" />
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-300">
                        PERINGKAT #1 · PIALA EMAS · SUPREME GALAXY HERO
                      </span>
                      <div className="text-lg font-bold text-white mt-1 truncate max-w-full">
                        {top3[0].playerName}
                      </div>
                      <div className="text-xs text-amber-200/80 truncate max-w-full">
                        {top3[0].school} · Kelas {top3[0].className}
                      </div>
                      <div className="text-2xl font-extrabold font-mono text-amber-300 tabular-nums mt-2">
                        {top3[0].score.toLocaleString('id-ID')} pts
                      </div>
                    </div>
                  )}

                  {/* Rank 3 - Bronze Trophy */}
                  {top3[2] && (
                    <div className="order-3 p-4 rounded-xl bg-slate-950 border border-amber-800/60 flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-amber-950/60 border border-amber-700 flex items-center justify-center mb-2">
                        <Trophy className="w-6 h-6 text-amber-500" />
                      </div>
                      <span className="text-xs font-mono text-amber-500">
                        PERINGKAT #3 · PIALA PERUNGGU
                      </span>
                      <div className="text-base font-bold text-white mt-1 truncate max-w-full">
                        {top3[2].playerName}
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-full">
                        {top3[2].school} · Kelas {top3[2].className}
                      </div>
                      <div className="text-xl font-bold font-mono text-amber-400 tabular-nums mt-2">
                        {top3[2].score.toLocaleString('id-ID')} pts
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Top 100 Table */}
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 bg-slate-900/60">
                        <th className="py-3 px-4">RANK</th>
                        <th className="py-3 px-4">NAMA ASTRONOT</th>
                        <th className="py-3 px-4">SEKOLAH & KELAS</th>
                        <th className="py-3 px-4">KATEGORI</th>
                        <th className="py-3 px-4 text-right">BENAR / UFO</th>
                        <th className="py-3 px-4 text-right">PLANET / LVL</th>
                        <th className="py-3 px-4 text-right">TOTAL SKOR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 text-sm">
                      {filteredLeaderboard.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-8 text-center text-slate-400"
                          >
                            Belum ada data peringkat untuk filter yang dipilih.
                          </td>
                        </tr>
                      ) : (
                        filteredLeaderboard.map((entry, idx) => {
                          const rank = idx + 1;
                          return (
                            <tr
                              key={entry.id || idx}
                              className="hover:bg-slate-900/60 transition-colors"
                            >
                              <td className="py-3 px-4 font-mono font-bold tabular-nums">
                                {rank === 1 && (
                                  <span className="text-amber-300">
                                    #1 Emas
                                  </span>
                                )}
                                {rank === 2 && (
                                  <span className="text-slate-300">
                                    #2 Perak
                                  </span>
                                )}
                                {rank === 3 && (
                                  <span className="text-amber-500">
                                    #3 Perunggu
                                  </span>
                                )}
                                {rank > 3 && (
                                  <span className="text-slate-400">
                                    #{rank}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-semibold text-white">
                                {entry.playerName}
                              </td>
                              <td className="py-3 px-4 text-slate-300 text-xs">
                                {entry.school}{' '}
                                <span className="text-slate-500">·</span> Kelas{' '}
                                {entry.className}
                              </td>
                              <td className="py-3 px-4 text-xs font-mono text-cyan-300">
                                Kategori {entry.categoryId}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-xs text-slate-300 tabular-nums">
                                {entry.correctCount} benar ·{' '}
                                {entry.ufosDestroyed} UFO
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-xs text-slate-300 tabular-nums">
                                Planet {entry.highestPlanet} · Lv{' '}
                                {entry.highestLevel}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-amber-300 tabular-nums">
                                {entry.score.toLocaleString('id-ID')}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. SPACE GARAGE MODAL (3D Hangar Preview, 9 Ships, Weapons/Powerups, Codex) */}
          {activeModal === 'SPACE_GARAGE' && (
            <div className="space-y-6">
              {/* Sub-navigation Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-950 border border-slate-800 w-fit">
                  <button
                    onClick={() => setGarageTab('ships')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                      garageTab === 'ships'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    9 Pesawat Tempur (Buy & Select)
                  </button>
                  <button
                    onClick={() => setGarageTab('weapons')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                      garageTab === 'weapons'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Upgrade Senjata, Armor & Nyawa
                  </button>
                  <button
                    onClick={() => setGarageTab('codex')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                      garageTab === 'codex'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Ensiklopedia 8 Planet, 12 UFO & 12 Alien
                  </button>
                </div>

                {hangarNotice && (
                  <div
                    className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                      hangarNotice.type === 'error'
                        ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                        : 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                    }`}
                  >
                    {hangarNotice.type === 'error' ? (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span>{hangarNotice.message}</span>
                  </div>
                )}
              </div>

              {garageTab === 'ships' && (
                <div className="space-y-5">
                  {/* Interactive 360° Hangar Platform Preview */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-cyan-500/40 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                    <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl bg-slate-900/90 border border-slate-800 relative overflow-hidden">
                      <div className="text-[11px] font-mono text-cyan-400 mb-2 flex items-center gap-1.5">
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>PLATFORM HANGGAR 360° INTERAKTIF</span>
                      </div>

                      {/* Rotating Futuristic Hangar Turntable SVG */}
                      <div className="relative w-48 h-40 flex items-center justify-center">
                        {/* Hologram platform rings */}
                        <div className="absolute bottom-2 w-44 h-12 rounded-full border-2 border-cyan-400/50 bg-cyan-500/10" />
                        <div className="absolute bottom-4 w-32 h-8 rounded-full border border-amber-400/40 bg-amber-500/10" />

                        {/* 3D-styled Rotatable Ship Silhouette */}
                        <svg
                          viewBox="0 0 160 120"
                          className="w-40 h-32 drop-shadow-[0_10px_18px_rgba(34,211,238,0.35)] transition-transform duration-200"
                          style={{
                            transform: `perspective(400px) rotateX(18deg) rotateY(${hangarRotationDeg}deg)`,
                          }}
                        >
                          {/* Glowing Engine Exhaust */}
                          <circle
                            cx="80"
                            cy="98"
                            r="10"
                            fill={inspectedShip.engineColor}
                            opacity="0.85"
                          />
                          {/* Main Wings */}
                          <polygon
                            points="80,16 18,86 80,74 142,86"
                            fill={inspectedShip.primaryColor}
                            stroke={inspectedShip.secondaryColor}
                            strokeWidth="3"
                          />
                          {/* Forward Canards / Twin Cannons */}
                          <polygon
                            points="80,10 50,55 80,48 110,55"
                            fill={inspectedShip.secondaryColor}
                          />
                          {/* Cockpit Canopy */}
                          <ellipse
                            cx="80"
                            cy="48"
                            rx="10"
                            ry="18"
                            fill="#38bdf8"
                          />
                          {/* Quantum / Plasma Core */}
                          <circle
                            cx="80"
                            cy="68"
                            r="6"
                            fill={inspectedShip.engineColor}
                          />
                        </svg>
                      </div>

                      {/* 360 Rotation Slider & Buttons */}
                      <div className="w-full flex items-center gap-2 mt-2">
                        <button
                          onClick={() =>
                            setHangarRotationDeg((d) => (d - 45) % 360)
                          }
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-cyan-300"
                        >
                          -45°
                        </button>
                        <input
                          type="range"
                          min={-180}
                          max={180}
                          value={hangarRotationDeg}
                          onChange={(e) =>
                            setHangarRotationDeg(Number(e.target.value))
                          }
                          className="flex-1 accent-cyan-400 cursor-pointer"
                          aria-label="Putar Pesawat 360 Derajat"
                        />
                        <button
                          onClick={() =>
                            setHangarRotationDeg((d) => (d + 45) % 360)
                          }
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-cyan-300"
                        >
                          +45°
                        </button>
                      </div>
                    </div>

                    {/* Inspected Ship Hologram Details */}
                    <div className="lg:col-span-7 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-mono text-xs font-bold">
                          UNIT 0{inspectedShip.index} ·{' '}
                          {profile.unlockedShips.includes(inspectedShip.id)
                            ? 'STATUS: OWNED (DIMILIKI)'
                            : 'STATUS: LOCKED (TERKUNCI)'}
                        </span>
                        {inspectedShip.isPremium && (
                          <span className="px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono text-xs font-bold">
                            ARMADA ELITE BARU
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl sm:text-2xl font-extrabold font-display text-white">
                        {inspectedShip.fullName ||
                          `${inspectedShip.name} – ${inspectedShip.title}`}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {inspectedShip.description}
                      </p>
                      {inspectedShip.specialFeature && (
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/30 text-xs text-amber-300 font-medium">
                          Keunggulan Khusus: {inspectedShip.specialFeature}
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-3 pt-1">
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                          <div className="text-[11px] text-slate-400">
                            SPEED
                          </div>
                          <div className="text-lg font-extrabold font-mono text-cyan-300 tabular-nums">
                            {inspectedShip.baseSpeed}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                          <div className="text-[11px] text-slate-400">
                            LASER POWER
                          </div>
                          <div className="text-lg font-extrabold font-mono text-amber-300 tabular-nums">
                            {inspectedShip.baseAttack}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                          <div className="text-[11px] text-slate-400">
                            ARMOR
                          </div>
                          <div className="text-lg font-extrabold font-mono text-emerald-300 tabular-nums">
                            {inspectedShip.baseArmor}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* All 9 Spaceships Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {PLAYER_SPACESHIPS.map((ship) => {
                      const isUnlocked = profile.unlockedShips.includes(
                        ship.id
                      );
                      const isEquipped = profile.selectedShipId === ship.id;
                      const isInspected = inspectedShip.id === ship.id;

                      return (
                        <div
                          key={ship.id}
                          onClick={() => setInspectedShipId(ship.id)}
                          className={`p-4 rounded-xl border flex flex-col justify-between gap-4 cursor-pointer transition-all ${
                            isEquipped
                              ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-500/10'
                              : isInspected
                                ? 'bg-slate-900 border-amber-400/70'
                                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-slate-400">
                                UNIT 0{ship.index} ·{' '}
                                {isUnlocked ? (
                                  <span className="text-emerald-400 font-bold">
                                    OWNED
                                  </span>
                                ) : (
                                  <span className="text-amber-400 font-bold">
                                    LOCKED
                                  </span>
                                )}
                              </span>
                              <span
                                className="w-4 h-4 rounded-full border border-white/30"
                                style={{ backgroundColor: ship.primaryColor }}
                              />
                            </div>
                            <h4 className="text-base font-bold font-display text-white">
                              {ship.fullName || ship.name}
                            </h4>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {ship.description}
                            </p>

                            {/* Stat Bars */}
                            <div className="space-y-1.5 pt-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Speed</span>
                                <span className="font-mono text-cyan-300 tabular-nums">
                                  {ship.baseSpeed}/100
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full bg-cyan-400"
                                  style={{ width: `${ship.baseSpeed}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">
                                  Laser Power
                                </span>
                                <span className="font-mono text-amber-300 tabular-nums">
                                  {ship.baseAttack}/100
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full bg-amber-400"
                                  style={{ width: `${ship.baseAttack}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Armor</span>
                                <span className="font-mono text-emerald-300 tabular-nums">
                                  {ship.baseArmor}/100
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-400"
                                  style={{ width: `${ship.baseArmor}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {!isUnlocked && (
                              <div className="text-xs font-mono text-amber-300 font-bold text-center">
                                Harga:{' '}
                                {ship.unlockCostCoins.toLocaleString('id-ID')}{' '}
                                Koin
                              </div>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnlockOrSelectShip(
                                  ship.id,
                                  ship.unlockCostCoins,
                                  ship.requiredScore
                                );
                              }}
                              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                                isEquipped
                                  ? 'bg-emerald-500 text-slate-950'
                                  : isUnlocked
                                    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                              }`}
                            >
                              {isEquipped ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  <span>SELECT (AKTIF DIGUNAKAN)</span>
                                </>
                              ) : isUnlocked ? (
                                <span>SELECT (GUNAKAN PESAWAT)</span>
                              ) : (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>
                                    BUY (
                                    {ship.unlockCostCoins.toLocaleString(
                                      'id-ID'
                                    )}{' '}
                                    KOIN)
                                  </span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {garageTab === 'weapons' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* A. LASER POWER */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                        <Zap className="w-5 h-5" />
                        <span>
                          A. LASER POWER (Level {profile.upgrades.laserLevel}/5)
                        </span>
                      </div>
                      <div className="text-xs font-mono text-amber-300">
                        {LASER_UPGRADE_NAMES[profile.upgrades.laserLevel - 1]}
                      </div>
                      <p className="text-xs text-slate-300">
                        Meningkatkan daya hancur tembakan laser terhadap UFO
                        berlapis baja dan Boss.
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleBuyUpgrade(
                          'laser',
                          profile.upgrades.laserLevel * 120
                        )
                      }
                      disabled={profile.upgrades.laserLevel >= 5}
                      className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs"
                    >
                      {profile.upgrades.laserLevel >= 5
                        ? 'Level Maksimal (Mega Laser)'
                        : `Upgrade Laser (${profile.upgrades.laserLevel * 120} Koin)`}
                    </button>
                  </div>

                  {/* B. ARMOR */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                        <Shield className="w-5 h-5" />
                        <span>
                          B. ARMOR PERISAI 3D (Level{' '}
                          {profile.upgrades.armorLevel}/5)
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Mengurangi kerusakan saat terkena serangan UFO dan
                        menampilkan kubah perisai 3D di sekitar pesawat.
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleBuyUpgrade(
                          'armor',
                          profile.upgrades.armorLevel * 110
                        )
                      }
                      disabled={profile.upgrades.armorLevel >= 5}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs"
                    >
                      {profile.upgrades.armorLevel >= 5
                        ? 'Armor Maksimal'
                        : `Upgrade Armor (${profile.upgrades.armorLevel * 110} Koin)`}
                    </button>
                  </div>

                  {/* C. HEALTH / NYAWA MAKSIMAL */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                        <Heart className="w-5 h-5" />
                        <span>
                          C. KAPASITAS NYAWA ({profile.upgrades.maxHealth}/5
                          Nyawa)
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Menambah kapasitas nyawa awal dari 3 menjadi maksimal 5
                        nyawa selama pertempuran.
                      </p>
                    </div>
                    <button
                      onClick={() => handleBuyUpgrade('health', 200)}
                      disabled={profile.upgrades.maxHealth >= 5}
                      className="w-full py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs"
                    >
                      {profile.upgrades.maxHealth >= 5
                        ? 'Kapasitas Nyawa Maksimal (5/5)'
                        : 'Tambah Kapasitas Nyawa (200 Koin)'}
                    </button>
                  </div>

                  {/* D. SPEED BOOST */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                        <Rocket className="w-5 h-5" />
                        <span>
                          D. SPEED BOOST (Level {profile.upgrades.speedLevel}/5)
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Mempercepat manuver penghindaran pesawat dan menambah
                        waktu ekstra menjawab soal.
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleBuyUpgrade(
                          'speed',
                          profile.upgrades.speedLevel * 100
                        )
                      }
                      disabled={profile.upgrades.speedLevel >= 5}
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs"
                    >
                      {profile.upgrades.speedLevel >= 5
                        ? 'Kecepatan Maksimal'
                        : `Upgrade Kecepatan (${profile.upgrades.speedLevel * 100} Koin)`}
                    </button>
                  </div>

                  {/* E. MEGA BOMB */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-orange-400 font-bold text-sm">
                        <Flame className="w-5 h-5" />
                        <span>
                          E. MEGA BOMB (Stok: {profile.upgrades.megaBombs})
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Senjata taktis gelombang kejut yang menghancurkan
                        beberapa UFO musuh sekaligus dalam satu gelombang.
                      </p>
                    </div>
                    <button
                      onClick={() => handleBuyUpgrade('bomb', 90)}
                      className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs"
                    >
                      Beli +1 Mega Bomb (90 Koin)
                    </button>
                  </div>

                  {/* F. SHIELD POWER */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                        <Shield className="w-5 h-5" />
                        <span>
                          F. SHIELD POWER (Stok:{' '}
                          {profile.upgrades.shieldCharges})
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Mengaktifkan pelindung energi penuh yang menahan
                        serangan musuh saat situasi darurat.
                      </p>
                    </div>
                    <button
                      onClick={() => handleBuyUpgrade('shield', 75)}
                      className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs"
                    >
                      Beli +1 Shield Power (75 Koin)
                    </button>
                  </div>
                </div>
              )}

              {garageTab === 'codex' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-cyan-300 mb-2">
                      12 Jenis UFO & 12 Karakter Alien Invader
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {UFO_TYPES.map((u) => {
                        const alien = ALIEN_TYPES.find(
                          (a) => a.id === u.alienId
                        );
                        return (
                          <div
                            key={u.id}
                            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-white font-bold">
                                #{u.index} {u.name}
                              </span>
                              <span className="text-amber-300">
                                HP {u.hp} · +{u.coinReward} Koin
                              </span>
                            </div>
                            <p className="text-xs text-slate-300">
                              {u.description}
                            </p>
                            {alien && (
                              <div className="pt-1.5 border-t border-slate-800/80 text-[11px] text-cyan-300">
                                Pilot:{' '}
                                <span className="font-semibold">
                                  {alien.name}
                                </span>{' '}
                                ({alien.title})
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. HOW TO PLAY & GASING METHOD GUIDE */}
          {activeModal === 'HOW_TO_PLAY' && (
            <div className="space-y-5 text-sm text-slate-300">
              {onOpenCaptainAstroTutorial && (
                <div className="p-4 rounded-xl bg-cyan-950/60 border border-cyan-400/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono text-amber-300 font-bold">
                      TUTORIAL INTERAKTIF CAPTAIN ASTRO
                    </div>
                    <h3 className="text-base font-bold text-white font-display">
                      Pelajari Pembagian 1 Digit dengan Sisa Menggunakan Metode
                      GASING
                    </h3>
                    <p className="text-xs text-slate-300">
                      Dilengkapi animasi pengelompokan bola energi, penjelasan
                      langkah demi langkah, dan latihan interaktif!
                    </p>
                  </div>
                  <button
                    onClick={onOpenCaptainAstroTutorial}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    Mulai Tutorial Captain Astro
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <h3 className="text-base font-bold text-cyan-300 font-display">
                    Alur Pertempuran Galaksi
                  </h3>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs leading-relaxed">
                    <li>
                      Isi Nama Astronot, Asal Sekolah (default SDN 66 Banda
                      Aceh), dan Kelas pada halaman utama.
                    </li>
                    <li>
                      Pilih satu dari 7 Kategori Pembagian (mulai dari Kategori
                      1: 1 angka ÷ 1 angka bersisa hingga Kategori 7: 4 angka ÷
                      2 digit).
                    </li>
                    <li>
                      Saat UFO Alien muncul, selesaikan soal pembagian di layar
                      atas secepat mungkin.
                    </li>
                    <li>
                      Jawaban benar langsung menembakkan senjata laser 3D dan
                      menghancurkan UFO yang dikunci.
                    </li>
                    <li>
                      Raih Combo 3x, 5x, hingga 10x (Galactic Combo) untuk
                      melipatgandakan skor dan koin!
                    </li>
                    <li>
                      Gunakan koin di Space Garage untuk membeli pesawat baru
                      (Phantom X-9, Titan Destroyer, Quantum Phoenix), Mega
                      Laser, Armor, dan Nyawa!
                    </li>
                  </ol>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <h3 className="text-base font-bold text-amber-300 font-display">
                    Rahasia Cepat Metode GASING
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="font-bold text-white">
                        Contoh Kategori 1 (1 Digit Bersisa): 8 ÷ 3
                      </div>
                      <div className="font-mono text-cyan-300 mt-1">
                        3 × 2 = 6 → Sisa: 8 - 6 = 2 → Jawaban: 2 sisa 2
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="font-bold text-white">
                        Contoh Pembagian 2 Digit Bersisa: 29 ÷ 5
                      </div>
                      <div className="font-mono text-amber-300 mt-1">
                        Kelipatan 5 terdekat: 5 × 5 = 25 → Sisa: 29 - 25 = 4 →
                        Hasil: 5 sisa 4
                      </div>
                    </div>
                    <p className="text-slate-400">
                      Tekan tombol{' '}
                      <span className="text-amber-300 font-semibold">
                        PETUNJUK GASING
                      </span>{' '}
                      kapan saja saat bermain untuk melihat animasi
                      pengelompokan benda dan langkah mudahnya!
                    </p>
                  </div>
                </div>
              </div>

              {/* Multi-Device Ergonomics Guide */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="text-base font-bold text-emerald-300 font-display">
                  Kontrol Nyaman di Semua Perangkat (HP, Tablet, TV Layar Sentuh
                  / IFP & Laptop)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-bold text-white">
                      1. HP Android / iPhone
                    </div>
                    <p className="text-slate-400">
                      Mendukung layar Portrait maupun Landscape. Ketuk UFO untuk
                      mengunci target, dan sentuh tombol jawaban besar A, B, C,
                      D di zona ibu jari bawah.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-bold text-white">2. Tablet / iPad</div>
                    <p className="text-slate-400">
                      Layout adaptif dua tangan dengan tombol Pilihan Ganda
                      maupun Keypad Numerik (Hasil Bagi & Sisa) berukuran besar
                      yang responsif.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-bold text-white">
                      3. TV Layar Sentuh / IFP
                    </div>
                    <p className="text-slate-400">
                      Aktifkan <strong>Mode TV Sentuh / IFP</strong> di bagian
                      atas atau Settings. Semua tombol penting berada di paruh
                      bawah layar agar mudah dijangkau siswa di depan kelas.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-bold text-white">
                      4. Laptop / Komputer
                    </div>
                    <p className="text-slate-400">
                      Gunakan tombol <strong>1–4</strong> untuk memilih jawaban,
                      atau ketik angka + <strong>Tab</strong> (pindah Sisa) +{' '}
                      <strong>Enter</strong> (Tembak). Tekan{' '}
                      <strong>Shift</strong> untuk Dorongan Turbo (BOOST).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. SETTINGS & FIREBASE REALTIME DATABASE CONFIG */}
          {activeModal === 'SETTINGS' && (
            <div className="space-y-6">
              {/* Device Mode Selector */}
              <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-cyan-300 font-display">
                    Mode Optimasi Layar Perangkat (HP, Tablet, Laptop, atau TV
                    Layar Sentuh / IFP)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Menyesuaikan ukuran tombol sentuh, tata letak soal, dan
                    kemudahan jangkauan tangan di berbagai ukuran layar.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(
                    [
                      ['auto', 'Otomatis Pintar'],
                      ['mobile', 'HP (Portrait / Landscape)'],
                      ['tablet_laptop', 'Tablet & Laptop'],
                      ['tv_ifp', 'TV Layar Sentuh / IFP'],
                    ] as const
                  ).map(([modeKey, label]) => (
                    <button
                      key={modeKey}
                      onClick={() =>
                        onUpdateSettings({
                          ...settings,
                          deviceLayoutMode: modeKey,
                        })
                      }
                      className={`min-h-[48px] px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                        (settings.deviceLayoutMode || 'auto') === modeKey
                          ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                          : 'bg-slate-900 text-slate-200 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio & Graphics Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold text-white font-display">
                    Pengaturan Suara & Musik Luar Angkasa
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">
                      Status Audio Utama
                    </span>
                    <button
                      onClick={() =>
                        onUpdateSettings({
                          ...settings,
                          soundEnabled: !settings.soundEnabled,
                        })
                      }
                      className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${
                        settings.soundEnabled
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {settings.soundEnabled ? (
                        <>
                          <Volume2 className="w-4 h-4" />
                          <span>Suara Aktif</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-4 h-4" />
                          <span>Suara Dimatikan (Mute)</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">
                        Volume Musik Latar:
                      </span>
                      <span className="font-mono text-cyan-300 tabular-nums">
                        {Math.round(settings.musicVolume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={settings.musicVolume}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          musicVolume: Number(e.target.value),
                        })
                      }
                      className="w-full h-6 accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">
                        Volume Efek Pertempuran (Laser & Ledakan):
                      </span>
                      <span className="font-mono text-cyan-300 tabular-nums">
                        {Math.round(settings.sfxVolume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={settings.sfxVolume}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          sfxVolume: Number(e.target.value),
                        })
                      }
                      className="w-full h-6 accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold text-white font-display">
                    Kualitas Grafis 3D (Mode Ringan & Cepat)
                  </h3>
                  <div className="space-y-1.5">
                    <span className="text-xs text-slate-400 block">
                      Kualitas Visual WebGL 3D:
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['low', 'medium', 'high'] as const).map((q) => (
                        <button
                          key={q}
                          onClick={() =>
                            onUpdateSettings({
                              ...settings,
                              graphicsQuality: q,
                            })
                          }
                          className={`min-h-[44px] py-2 rounded-lg text-xs font-bold capitalize border ${
                            settings.graphicsQuality === q
                              ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                              : 'bg-slate-900 text-slate-300 border-slate-800'
                          }`}
                        >
                          {q === 'low'
                            ? 'Sangat Ringan'
                            : q === 'medium'
                              ? 'Ringan Cepat'
                              : 'Ultra 3D'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs text-slate-400 block">
                      Mode Menjawab Soal (Bisa diubah juga saat bermain):
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() =>
                          onUpdateSettings({
                            ...settings,
                            inputMode: 'choices',
                          })
                        }
                        className={`min-h-[44px] py-2 px-3 rounded-lg text-xs font-bold border ${
                          settings.inputMode === 'choices'
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}
                      >
                        Pilihan Ganda (A, B, C, D)
                      </button>
                      <button
                        onClick={() =>
                          onUpdateSettings({ ...settings, inputMode: 'keypad' })
                        }
                        className={`min-h-[44px] py-2 px-3 rounded-lg text-xs font-bold border ${
                          settings.inputMode === 'keypad'
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}
                      >
                        Keypad Numerik (Hasil & Sisa)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
