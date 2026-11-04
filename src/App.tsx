import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Rocket,
  Trophy,
  BookOpen,
  Settings,
  Wrench,
  Layers,
  Heart,
  Shield,
  Flame,
  Lightbulb,
  Volume2,
  VolumeX,
  Pause,
  Play,
  ChevronDown,
  ChevronUp,
  Keyboard,
  MousePointerClick,
  CheckCircle2,
  XCircle,
  Sparkles,
  RotateCcw,
  Home,
  Maximize2,
  Minimize2,
  Smartphone,
  Monitor,
  Tv,
  Crosshair,
  Zap,
  GraduationCap,
} from 'lucide-react';
import {
  ActiveEnemyInstance,
  DivisionCategoryId,
  GameScreenState,
  GameSettings,
  LeaderboardEntry,
  MathQuestion,
  ModalType,
  PlayerProfile,
  QuestionAttempt,
} from './types/game';
import {
  ALIEN_TYPES,
  DIVISION_CATEGORIES,
  PLANETS,
  PLAYER_SPACESHIPS,
  UFO_TYPES,
} from './data/gameData';
import { formatAnswerText, generateMathQuestion } from './utils/mathGenerator';
import { soundEngine } from './utils/soundEngine';
import {
  getLocalLeaderboard,
  submitScoreToLeaderboard,
  subscribeLeaderboardTop100,
} from './services/leaderboardService';
import { SpaceCanvas3D } from './components/SpaceCanvas3D';
import { GasingHintModal } from './components/GasingHintModal';
import { GameModals } from './components/GameModals';
import { CaptainAstroTutorialModal } from './components/CaptainAstroTutorialModal';

const PROFILE_STORAGE_KEY = 'gdw_player_profile_v2';
const SETTINGS_STORAGE_KEY = 'gdw_game_settings_v2';

const DEFAULT_PROFILE: PlayerProfile = {
  name: '',
  school: 'SDN 66 Banda Aceh',
  className: '',
  coins: 250,
  highScore: 0,
  unlockedShips: ['ship_rookie'],
  selectedShipId: 'ship_rookie',
  upgrades: {
    laserLevel: 1,
    armorLevel: 1,
    maxHealth: 3,
    speedLevel: 1,
    megaBombs: 1,
    shieldCharges: 1,
  },
  highestPlanet: 1,
  highestLevel: 1,
};

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicVolume: 0.35,
  sfxVolume: 0.75,
  graphicsQuality: 'medium', // Default lightweight mode for smooth 60fps across all devices
  inputMode: 'choices',
  deviceLayoutMode: 'auto',
};

export default function App() {
  // Persistent Profile & Settings
  const [profile, setProfile] = useState<PlayerProfile>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_PROFILE,
          ...parsed,
          school: parsed.school || 'SDN 66 Banda Aceh',
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_PROFILE;
  });

  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  // Track viewport size to auto-optimize layout across HP, Tablet, Laptop, and TV/IFP
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    const onFsChange = () =>
      setIsFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener('resize', onResize);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // Compute effective device layout mode
  const effectiveDeviceMode: 'mobile' | 'tablet_laptop' | 'tv_ifp' = (() => {
    const mode = settings.deviceLayoutMode || 'auto';
    if (mode !== 'auto') return mode;
    if (viewportWidth < 680) return 'mobile';
    if (viewportWidth >= 1650) return 'tv_ifp';
    return 'tablet_laptop';
  })();

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
    soundEngine.setMuted(!settings.soundEnabled);
    soundEngine.setVolumes(settings.musicVolume, settings.sfxVolume);
  }, [settings]);

  // Navigation & Modal State
  const [screenState, setScreenState] = useState<GameScreenState>('MAIN_MENU');
  const [activeModal, setActiveModal] = useState<ModalType>('NONE');
  const [initialGarageTab, setInitialGarageTab] = useState<
    'ships' | 'weapons' | 'codex'
  >('ships');
  const [formError, setFormError] = useState<string>('');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);

  // Selected Category (1..7) & Planet (1..8)
  const [selectedCategory, setSelectedCategory] =
    useState<DivisionCategoryId>(1);
  const [currentPlanetId, setCurrentPlanetId] = useState<number>(1);
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [currentWave, setCurrentWave] = useState<number>(1);

  // Arena Transition Hologram Banner
  const [arenaBanner, setArenaBanner] = useState<{
    arenaName: string;
    subtitle: string;
  } | null>(null);

  // 3D Action Triggers for SpaceCanvas3D
  const [laserFireTrigger, setLaserFireTrigger] = useState<{
    id: number;
    targetEnemyId: string;
    weaponLevel: number;
    isDestroy: boolean;
  } | null>(null);
  const [enemyAttackTrigger, setEnemyAttackTrigger] = useState<{
    id: number;
    attackerId: string;
  } | null>(null);
  const [warpTrigger, setWarpTrigger] = useState<number>(0);
  const [boostTrigger, setBoostTrigger] = useState<number>(0);

  // Combat & Session State
  const [sessionId, setSessionId] = useState<string>('');
  const [lives, setLives] = useState<number>(3);
  const [score, setScore] = useState<number>(0);
  const [sessionCoins, setSessionCoins] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [wrongCount, setWrongCount] = useState<number>(0);
  const [ufosDestroyed, setUfosDestroyed] = useState<number>(0);
  const [playTimeSeconds, setPlayTimeSeconds] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [shieldActive, setShieldActive] = useState<boolean>(false);
  const [emergencyRevivePrompt, setEmergencyRevivePrompt] =
    useState<boolean>(false);

  // Question & Answer State
  const [currentQuestion, setCurrentQuestion] = useState<MathQuestion>(() =>
    generateMathQuestion(1, 1)
  );
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number>(20);
  const [questionMaxTime, setQuestionMaxTime] = useState<number>(20);
  const [showGasingHint, setShowGasingHint] = useState<boolean>(false);
  const [combatFeedback, setCombatFeedback] = useState<{
    type: 'correct' | 'wrong' | 'combo' | 'boss';
    message: string;
    detail?: string;
  } | null>(null);
  const [attemptHistory, setAttemptHistory] = useState<QuestionAttempt[]>([]);

  // Auto-hide combat feedback after 2.4s so it never blocks the 3D battle view
  useEffect(() => {
    if (!combatFeedback) return;
    const t = window.setTimeout(() => setCombatFeedback(null), 2400);
    return () => clearTimeout(t);
  }, [combatFeedback]);

  // Keypad State
  const [keypadQuotient, setKeypadQuotient] = useState<string>('');
  const [keypadRemainder, setKeypadRemainder] = useState<string>('0');
  const [activeKeypadField, setActiveKeypadField] = useState<
    'quotient' | 'remainder'
  >('quotient');

  // Active 3D Enemies & Locked Target
  const [activeEnemies, setActiveEnemies] = useState<ActiveEnemyInstance[]>([]);
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null);

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() =>
    getLocalLeaderboard()
  );
  const [isFirebaseLive, setIsFirebaseLive] = useState<boolean>(false);
  const [achievedRank, setAchievedRank] = useState<number | null>(null);
  const [showResultsPanelOnEnd, setShowResultsPanelOnEnd] =
    useState<boolean>(true);

  const questionStartTimeRef = useRef<number>(Date.now());

  const currentPlanet =
    PLANETS.find((p) => p.id === currentPlanetId) || PLANETS[0];
  const selectedShip =
    PLAYER_SPACESHIPS.find((s) => s.id === profile.selectedShipId) ||
    PLAYER_SPACESHIPS[0];
  const currentCategoryObj =
    DIVISION_CATEGORIES.find((c) => c.id === selectedCategory) ||
    DIVISION_CATEGORIES[0];

  // Show Arena Transition Banner when switching categories
  const handleSelectCategoryWithTransition = useCallback(
    (catId: DivisionCategoryId) => {
      setSelectedCategory(catId);
      const cat =
        DIVISION_CATEGORIES.find((c) => c.id === catId) ||
        DIVISION_CATEGORIES[0];
      setWarpTrigger((w) => w + 1);
      setArenaBanner({
        arenaName: `ENTERING ${cat.environment.arenaName}`,
        subtitle: `${cat.title} · ${cat.environment.arenaSubtitle}`,
      });
      setTimeout(() => {
        setArenaBanner(null);
      }, 2600);
    },
    []
  );

  // Subscribe to Top 100 Leaderboard
  const refreshLeaderboard = useCallback(() => {
    const unsub = subscribeLeaderboardTop100((entries, live) => {
      setLeaderboard(entries);
      setIsFirebaseLive(live);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = refreshLeaderboard();
    return () => unsub();
  }, [refreshLeaderboard]);

  // Spawn a Wave of UFOs for a given Planet, Level, and Wave (1..5)
  const spawnEnemyWave = useCallback(
    (planetId: number, levelNum: number, waveNum: number) => {
      const isBossWave = waveNum === 5;
      const planetCfg = PLANETS.find((p) => p.id === planetId) || PLANETS[0];

      if (isBossWave) {
        soundEngine.startMusic('boss');
        const bossUfo =
          UFO_TYPES.find((u) => u.id === planetCfg.bossUfoId) ||
          UFO_TYPES[Math.min(UFO_TYPES.length - 1, planetId + 3)];
        const bossAlien =
          ALIEN_TYPES.find((a) => a.id === planetCfg.bossAlienId) ||
          ALIEN_TYPES[Math.min(ALIEN_TYPES.length - 1, planetId + 3)];

        const bossHp = Math.max(3, bossUfo.hp + Math.floor(planetId / 2));
        const bossId = `boss_${planetId}_${levelNum}_${Date.now()}`;
        setActiveEnemies([
          {
            instanceId: bossId,
            ufoId: bossUfo.id,
            alienId: bossAlien.id,
            maxHp: bossHp,
            currentHp: bossHp,
            x: 0,
            y: 1.8,
            z: -11,
            speed: bossUfo.speed,
            isBoss: true,
          },
        ]);
        setSelectedEnemyId(bossId);
        setCombatFeedback({
          type: 'boss',
          message: `PERINGATAN BOSS: ${planetCfg.bossName} MUNCUL!`,
          detail:
            'Jawab soal pembagian dengan tepat untuk menembus armor Boss!',
        });
        return;
      }

      soundEngine.startMusic('battle');
      const count = Math.min(5, waveNum + (levelNum % 2));
      const maxUfoIdx = Math.min(
        UFO_TYPES.length - 2,
        planetId + Math.floor(waveNum / 2)
      );
      const newEnemies: ActiveEnemyInstance[] = [];

      for (let i = 0; i < count; i++) {
        const ufoIdx = (planetId - 1 + i) % (maxUfoIdx + 1);
        const uType = UFO_TYPES[ufoIdx];
        const aType =
          ALIEN_TYPES.find((a) => a.id === uType.alienId) ||
          ALIEN_TYPES[ufoIdx];
        const spreadX = (i - (count - 1) / 2) * 3.8;
        const spreadY = 1.0 + (i % 2) * 1.3;
        const spreadZ = -8.5 - (i % 3) * 1.8;

        newEnemies.push({
          instanceId: `ufo_${planetId}_${levelNum}_${waveNum}_${i}_${Date.now()}`,
          ufoId: uType.id,
          alienId: aType.id,
          maxHp: uType.hp,
          currentHp: uType.hp,
          x: spreadX,
          y: spreadY,
          z: spreadZ,
          speed: uType.speed,
          isBoss: false,
        });
      }
      setActiveEnemies(newEnemies);
      setSelectedEnemyId(newEnemies[0]?.instanceId || null);
    },
    []
  );

  // Load next math question
  const loadNextQuestion = useCallback(
    (catId: DivisionCategoryId, lvl: number) => {
      const cat =
        DIVISION_CATEGORIES.find((c) => c.id === catId) ||
        DIVISION_CATEGORIES[0];
      const q = generateMathQuestion(catId, lvl);
      setCurrentQuestion(q);
      setKeypadQuotient('');
      setKeypadRemainder('0');
      setActiveKeypadField('quotient');

      const speedBonusSeconds = (profile.upgrades.speedLevel - 1) * 2;
      const levelPenalty = Math.min(8, Math.floor((lvl - 1) * 0.3));
      const totalSec = Math.max(
        12,
        cat.baseTimeSeconds + speedBonusSeconds - levelPenalty
      );
      setQuestionMaxTime(totalSec);
      setQuestionTimeLeft(totalSec);
      questionStartTimeRef.current = Date.now();
    },
    [profile.upgrades.speedLevel]
  );

  // End Game / Finalize Session & Submit to Leaderboard
  const finalizeMission = useCallback(
    async (
      victory: boolean,
      finalScoreVal: number,
      finalCorrect: number,
      finalUfos: number
    ) => {
      setEmergencyRevivePrompt(false);
      setShowGasingHint(false);

      const totalUpgradesCount =
        profile.upgrades.laserLevel +
        profile.upgrades.armorLevel +
        profile.upgrades.speedLevel +
        profile.upgrades.maxHealth;

      const result = await submitScoreToLeaderboard({
        sessionId: sessionId || `sess_${Date.now()}`,
        playerName: profile.name || 'Pilot Galaksi',
        school: profile.school || 'SDN 66 Banda Aceh',
        className: profile.className || '6A',
        score: finalScoreVal,
        correctCount: finalCorrect,
        ufosDestroyed: finalUfos,
        highestPlanet: currentPlanetId,
        highestLevel: currentLevel,
        categoryId: selectedCategory,
        playTimeSeconds: Math.max(1, playTimeSeconds),
        selectedShipId: profile.selectedShipId,
        ownedShipsCount: profile.unlockedShips.length,
        totalUpgrades: totalUpgradesCount,
        totalCoins: profile.coins,
      });

      setLeaderboard(result.entries);
      setAchievedRank(result.rank);
      setShowResultsPanelOnEnd(true);

      setProfile((prev) => ({
        ...prev,
        highScore: Math.max(prev.highScore, finalScoreVal),
        highestPlanet: Math.max(prev.highestPlanet, currentPlanetId),
        highestLevel: Math.max(prev.highestLevel, currentLevel),
      }));

      if ((victory || finalScoreVal >= 1500) && result.rank <= 100) {
        setScreenState('CHAMPION');
        soundEngine.startMusic('victory');
        confetti({
          particleCount: result.rank <= 3 ? 120 : 65,
          spread: 80,
          origin: { y: 0.55 },
        });
      } else {
        setScreenState('GAME_OVER');
        soundEngine.startMusic('gameover');
      }
    },
    [
      currentLevel,
      currentPlanetId,
      playTimeSeconds,
      profile.className,
      profile.coins,
      profile.name,
      profile.school,
      profile.selectedShipId,
      profile.unlockedShips.length,
      profile.upgrades.armorLevel,
      profile.upgrades.laserLevel,
      profile.upgrades.maxHealth,
      profile.upgrades.speedLevel,
      selectedCategory,
      sessionId,
    ]
  );

  // Start New Game Session
  const handleStartMission = () => {
    if (
      !profile.name.trim() ||
      !profile.school.trim() ||
      !profile.className.trim()
    ) {
      setFormError(
        'Wajib mengisi Nama Pemain, Asal Sekolah, dan Kelas sebelum meluncurkan pesawat!'
      );
      soundEngine.playWrong();
      return;
    }
    setFormError('');
    setActiveModal('NONE');

    const newSessId = `gdw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setSessionId(newSessId);
    setLives(profile.upgrades.maxHealth);
    setScore(0);
    setSessionCoins(0);
    setCombo(0);
    setMaxCombo(0);
    setCorrectCount(0);
    setWrongCount(0);
    setUfosDestroyed(0);
    setPlayTimeSeconds(0);
    setAttemptHistory([]);
    setCombatFeedback(null);
    setAchievedRank(null);
    setIsPaused(false);
    setShieldActive(false);
    setEmergencyRevivePrompt(false);

    const startLvl = (currentPlanetId - 1) * 4 + 1;
    setCurrentLevel(startLvl);
    setCurrentWave(1);
    setScreenState('PLAYING');
    setWarpTrigger((w) => w + 1);

    setArenaBanner({
      arenaName: `ENTERING ${currentCategoryObj.environment.arenaName}`,
      subtitle: `${currentCategoryObj.title} · ${currentCategoryObj.environment.arenaSubtitle}`,
    });
    setTimeout(() => setArenaBanner(null), 2400);

    spawnEnemyWave(currentPlanetId, startLvl, 1);
    loadNextQuestion(selectedCategory, startLvl);
  };

  // Trigger Spaceship Acceleration Boost (Dorongan Turbo)
  const handleTriggerBoost = useCallback(() => {
    soundEngine.playHyperspace();
    setBoostTrigger((b) => b + 1);
    setCombatFeedback({
      type: 'combo',
      message: 'DORONGAN TURBO (BOOST) AKTIF! Kecepatan & Fokus Meningkat!',
    });
  }, []);

  // Handle Player Damage When Wrong or Timed Out
  const triggerEnemyAttackPlayer = useCallback(
    (reasonText: string, gasingHintText: string) => {
      soundEngine.playWrong();
      soundEngine.playAlienLaugh();
      setCombo(0);

      const attacker = activeEnemies[0];
      if (attacker) {
        setEnemyAttackTrigger({
          id: Date.now(),
          attackerId: attacker.instanceId,
        });
      }

      if (shieldActive) {
        setShieldActive(false);
        setCombatFeedback({
          type: 'wrong',
          message: 'PERISAI SHIELD MENAHAN SERANGAN UFO!',
          detail: `${reasonText} · ${gasingHintText}`,
        });
        loadNextQuestion(selectedCategory, currentLevel);
        return;
      }

      const absorbChance = (profile.upgrades.armorLevel - 1) * 0.14;
      if (Math.random() < absorbChance) {
        setCombatFeedback({
          type: 'wrong',
          message: 'ARMOR 3D MENYERAP BENTURAN LASER ALIEN!',
          detail: `${reasonText} · ${gasingHintText}`,
        });
        loadNextQuestion(selectedCategory, currentLevel);
        return;
      }

      setLives((prevLives) => {
        const nextLives = prevLives - 1;
        if (nextLives <= 0) {
          if (profile.coins >= 100) {
            setEmergencyRevivePrompt(true);
            return 0;
          } else {
            finalizeMission(false, score, correctCount, ufosDestroyed);
            return 0;
          }
        }
        return nextLives;
      });

      setCombatFeedback({
        type: 'wrong',
        message: reasonText,
        detail: gasingHintText,
      });
      loadNextQuestion(selectedCategory, currentLevel);
    },
    [
      activeEnemies,
      correctCount,
      currentLevel,
      finalizeMission,
      loadNextQuestion,
      profile.coins,
      profile.upgrades.armorLevel,
      score,
      selectedCategory,
      shieldActive,
      ufosDestroyed,
    ]
  );

  // Advance Wave / Level / Planet when all UFOs in current wave are destroyed
  const advanceWaveOrPlanet = useCallback(
    (latestScore: number, latestCorrect: number, latestUfos: number) => {
      if (currentWave < 5) {
        const nextW = currentWave + 1;
        setCurrentWave(nextW);
        spawnEnemyWave(currentPlanetId, currentLevel, nextW);
      } else {
        const nextLevel = currentLevel + 1;
        const nextPlanetId = Math.min(8, Math.floor((nextLevel - 1) / 4) + 1);

        if (nextLevel > 32) {
          finalizeMission(true, latestScore + 1500, latestCorrect, latestUfos);
          return;
        }

        if (nextPlanetId !== currentPlanetId) {
          soundEngine.playHyperspace();
          setWarpTrigger((w) => w + 1);
          setScreenState('HYPERSPACE');
          setTimeout(() => {
            setCurrentPlanetId(nextPlanetId);
            setCurrentLevel(nextLevel);
            setCurrentWave(1);
            setScreenState('PLAYING');
            spawnEnemyWave(nextPlanetId, nextLevel, 1);
          }, 1800);
        } else {
          setCurrentLevel(nextLevel);
          setCurrentWave(1);
          spawnEnemyWave(currentPlanetId, nextLevel, 1);
        }
      }
    },
    [
      currentLevel,
      currentPlanetId,
      currentWave,
      finalizeMission,
      spawnEnemyWave,
    ]
  );

  // Submit Answer Handler (Works for both Multiple Choice and Numeric Keypad)
  const handleAnswerSubmission = useCallback(
    (
      submittedQuotient: number,
      submittedRemainder: number,
      rawLabel?: string
    ) => {
      if (screenState !== 'PLAYING' || isPaused || emergencyRevivePrompt)
        return;

      const timeSpent = Math.max(
        1,
        Math.round((Date.now() - questionStartTimeRef.current) / 1000)
      );
      const isCorrect =
        submittedQuotient === currentQuestion.quotient &&
        submittedRemainder === currentQuestion.remainder;

      const userFormatted =
        rawLabel ||
        formatAnswerText(
          submittedQuotient,
          submittedRemainder,
          currentQuestion.hasRemainder ||
            selectedCategory === 1 ||
            selectedCategory === 3
        );

      setAttemptHistory((prev) => [
        {
          question: `${currentQuestion.dividend.toLocaleString('id-ID')} ÷ ${currentQuestion.divisor}`,
          userAnswer: userFormatted,
          correctAnswer: currentQuestion.correctOptionText,
          isCorrect,
          timeSpentSeconds: timeSpent,
          categoryId: selectedCategory,
        },
        ...prev,
      ]);

      if (isCorrect) {
        const nextCombo = combo + 1;
        setCombo(nextCombo);
        setMaxCombo((m) => Math.max(m, nextCombo));
        const nextCorrect = correctCount + 1;
        setCorrectCount(nextCorrect);

        soundEngine.playCorrect(nextCombo);
        soundEngine.playLaser(profile.upgrades.laserLevel);

        const speedRatio = Math.max(0.2, questionTimeLeft / questionMaxTime);
        const comboBonus =
          nextCombo >= 10
            ? 2.5
            : nextCombo >= 5
              ? 1.75
              : nextCombo >= 3
                ? 1.35
                : 1.0;

        // Attack the user's locked UFO target (or first enemy if none locked)
        const targetIdx = Math.max(
          0,
          activeEnemies.findIndex((e) => e.instanceId === selectedEnemyId)
        );
        const targetEnemy = activeEnemies[targetIdx] || activeEnemies[0];

        // Bonus damage for Titan Destroyer or Quantum Phoenix
        const shipBonusDmg =
          profile.selectedShipId === 'ship_titan_destroyer' ||
          profile.selectedShipId === 'ship_quantum_phoenix'
            ? 1
            : 0;
        const laserDmg =
          Math.max(1, Math.ceil(profile.upgrades.laserLevel * 0.75)) +
          shipBonusDmg;

        let killedUfo = false;
        let earnedScore = Math.round(
          120 *
            currentCategoryObj.scoreMultiplier *
            (0.7 + speedRatio * 0.6) *
            comboBonus
        );
        let earnedCoins = Math.round(
          12 * currentCategoryObj.scoreMultiplier * comboBonus
        );

        let updatedEnemies = [...activeEnemies];
        if (targetEnemy) {
          const ufoCfg =
            UFO_TYPES.find((u) => u.id === targetEnemy.ufoId) || UFO_TYPES[0];
          const remainingHp = targetEnemy.currentHp - laserDmg;
          killedUfo = remainingHp <= 0;

          setLaserFireTrigger({
            id: Date.now(),
            targetEnemyId: targetEnemy.instanceId,
            weaponLevel: profile.upgrades.laserLevel,
            isDestroy: killedUfo,
          });

          if (killedUfo) {
            soundEngine.playExplosion(targetEnemy.isBoss);
            soundEngine.playCoin();
            earnedScore += ufoCfg.scoreReward;
            earnedCoins += ufoCfg.coinReward;
            updatedEnemies.splice(targetIdx, 1);

            // Quantum Phoenix Special Ability: Quantum Burst damages a second nearby UFO!
            if (
              profile.selectedShipId === 'ship_quantum_phoenix' &&
              updatedEnemies.length > 0
            ) {
              const splashTarget = updatedEnemies[0];
              if (splashTarget.currentHp <= 1) {
                updatedEnemies.shift();
                earnedScore += 80;
                earnedCoins += 10;
              } else {
                updatedEnemies[0] = {
                  ...splashTarget,
                  currentHp: splashTarget.currentHp - 1,
                };
              }
            }

            setSelectedEnemyId(updatedEnemies[0]?.instanceId || null);
          } else {
            updatedEnemies[targetIdx] = {
              ...targetEnemy,
              currentHp: remainingHp,
            };
          }
        }

        const nextScore = score + earnedScore;
        const nextUfos = killedUfo ? ufosDestroyed + 1 : ufosDestroyed;
        setScore(nextScore);
        setSessionCoins((c) => c + earnedCoins);
        setUfosDestroyed(nextUfos);
        setProfile((prev) => ({ ...prev, coins: prev.coins + earnedCoins }));

        const comboTitle =
          nextCombo >= 10
            ? 'GALACTIC COMBO 10x!'
            : nextCombo >= 5
              ? `SUPER COMBO ${nextCombo}x!`
              : nextCombo >= 3
                ? `COMBO ${nextCombo}x!`
                : 'TEMBAKAN LASER TEPAT SASARAN!';

        setCombatFeedback({
          type: nextCombo >= 3 ? 'combo' : 'correct',
          message: `${comboTitle} +${earnedScore.toLocaleString('id-ID')} Skor · +${earnedCoins} Koin`,
          detail: currentQuestion.gasingSummary,
        });

        if (updatedEnemies.length === 0) {
          advanceWaveOrPlanet(nextScore, nextCorrect, nextUfos);
        } else {
          setActiveEnemies(updatedEnemies);
        }

        loadNextQuestion(selectedCategory, currentLevel);
      } else {
        setWrongCount((w) => w + 1);
        triggerEnemyAttackPlayer(
          `Jawaban ${userFormatted} kurang tepat! Senjata gagal menembak.`,
          currentQuestion.gasingSummary
        );
      }
    },
    [
      activeEnemies,
      advanceWaveOrPlanet,
      combo,
      correctCount,
      currentCategoryObj.scoreMultiplier,
      currentLevel,
      currentQuestion,
      emergencyRevivePrompt,
      isPaused,
      loadNextQuestion,
      profile.selectedShipId,
      profile.upgrades.laserLevel,
      questionMaxTime,
      questionTimeLeft,
      score,
      screenState,
      selectedCategory,
      selectedEnemyId,
      triggerEnemyAttackPlayer,
      ufosDestroyed,
    ]
  );

  // Cycle Locked Target UFO
  const handleCycleTargetUfo = useCallback(() => {
    if (activeEnemies.length <= 1) return;
    const idx = activeEnemies.findIndex(
      (e) => e.instanceId === selectedEnemyId
    );
    const nextIdx = (idx + 1) % activeEnemies.length;
    setSelectedEnemyId(activeEnemies[nextIdx].instanceId);
  }, [activeEnemies, selectedEnemyId]);

  // 1-Second Game & Question Countdown Timer
  useEffect(() => {
    if (
      screenState !== 'PLAYING' ||
      isPaused ||
      showGasingHint ||
      activeModal !== 'NONE' ||
      emergencyRevivePrompt
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setPlayTimeSeconds((t) => t + 1);
      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          setWrongCount((w) => w + 1);
          triggerEnemyAttackPlayer(
            'Waktu menjawab habis! UFO Alien menyerang terlebih dahulu!',
            currentQuestion.gasingSummary
          );
          return questionMaxTime;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [
    activeModal,
    currentQuestion.gasingSummary,
    emergencyRevivePrompt,
    isPaused,
    questionMaxTime,
    screenState,
    showGasingHint,
    triggerEnemyAttackPlayer,
  ]);

  // Full Laptop / Desktop Keyboard Support (Choices 1-4, A-D, Numpad/Digits in Keypad mode, Shift for Boost, G, P/Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screenState !== 'PLAYING' || activeModal !== 'NONE') return;
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        setIsPaused((p) => !p);
        return;
      }
      if (e.key.toLowerCase() === 'g') {
        setShowGasingHint((h) => !h);
        return;
      }
      if (e.key === 'Shift') {
        handleTriggerBoost();
        return;
      }
      if (settings.inputMode === 'choices') {
        const keyMap: Record<string, number> = {
          '1': 0,
          '2': 1,
          '3': 2,
          '4': 3,
          a: 0,
          b: 1,
          c: 2,
          d: 3,
        };
        const idx = keyMap[e.key.toLowerCase()];
        if (idx !== undefined) {
          const opt = currentQuestion.options[idx];
          if (opt) {
            handleAnswerSubmission(opt.quotient, opt.remainder, opt.text);
          }
        } else if (e.key === 'Tab') {
          e.preventDefault();
          handleCycleTargetUfo();
        }
      } else if (settings.inputMode === 'keypad') {
        if (/^[0-9]$/.test(e.key)) {
          if (activeKeypadField === 'quotient') {
            setKeypadQuotient((prev) => (prev + e.key).slice(0, 5));
          } else {
            setKeypadRemainder((prev) =>
              prev === '0' ? e.key : (prev + e.key).slice(0, 3)
            );
          }
        } else if (e.key === 'Backspace') {
          if (activeKeypadField === 'quotient') {
            setKeypadQuotient((prev) => prev.slice(0, -1));
          } else {
            setKeypadRemainder((prev) =>
              prev.length <= 1 ? '0' : prev.slice(0, -1)
            );
          }
        } else if (e.key === 'Tab') {
          e.preventDefault();
          setActiveKeypadField((f) =>
            f === 'quotient' ? 'remainder' : 'quotient'
          );
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleAnswerSubmission(
            Number(keypadQuotient || 0),
            Number(keypadRemainder || 0)
          );
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeKeypadField,
    activeModal,
    currentQuestion.options,
    handleAnswerSubmission,
    handleCycleTargetUfo,
    handleTriggerBoost,
    keypadQuotient,
    keypadRemainder,
    screenState,
    settings.inputMode,
  ]);

  // Tactical Mega Bomb Activation
  const handleUseMegaBomb = () => {
    if (profile.upgrades.megaBombs <= 0 || activeEnemies.length === 0) return;
    soundEngine.playExplosion(true);
    setLaserFireTrigger({
      id: Date.now(),
      targetEnemyId: activeEnemies[0].instanceId,
      weaponLevel: 5,
      isDestroy: true,
    });

    const bonusScore = activeEnemies.length * 200;
    const bonusCoins = activeEnemies.length * 20;
    const nextScore = score + bonusScore;
    const nextUfos = ufosDestroyed + activeEnemies.length;

    setProfile((prev) => ({
      ...prev,
      coins: prev.coins + bonusCoins,
      upgrades: { ...prev.upgrades, megaBombs: prev.upgrades.megaBombs - 1 },
    }));
    setScore(nextScore);
    setSessionCoins((c) => c + bonusCoins);
    setUfosDestroyed(nextUfos);
    setCombatFeedback({
      type: 'combo',
      message: `MEGA BOMB DILUNCURKAN! ${activeEnemies.length} UFO HANCUR SEKALIGUS!`,
      detail: `+${bonusScore} Skor · +${bonusCoins} Koin`,
    });

    advanceWaveOrPlanet(nextScore, correctCount, nextUfos);
  };

  // Tactical Shield Power Activation
  const handleUseShieldPower = () => {
    if (profile.upgrades.shieldCharges <= 0 || shieldActive) return;
    soundEngine.playCorrect(3);
    setShieldActive(true);
    setProfile((prev) => ({
      ...prev,
      upgrades: {
        ...prev.upgrades,
        shieldCharges: prev.upgrades.shieldCharges - 1,
      },
    }));
    setCombatFeedback({
      type: 'correct',
      message:
        'SHIELD POWER AKTIF! Pesawat terlindungi dari serangan berikutnya.',
    });
  };

  // Buy +1 Health mid-battle or during Emergency Revive
  const handleBuyEmergencyHealth = () => {
    if (profile.coins < 100 || lives >= 5) return;
    soundEngine.playCoin();
    setProfile((prev) => ({ ...prev, coins: prev.coins - 100 }));
    setLives((l) => Math.min(5, l + 1));
    setEmergencyRevivePrompt(false);
    setCombatFeedback({
      type: 'correct',
      message: 'SISTEM DARURAT AKTIF: +1 Nyawa berhasil dipulihkan!',
    });
  };

  const openGarageWithTab = (tab: 'ships' | 'weapons' | 'codex') => {
    setInitialGarageTab(tab);
    setActiveModal('SPACE_GARAGE');
  };

  const totalAttempts = correctCount + wrongCount;
  const accuracyPercent =
    totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 100;

  const isTvMode = effectiveDeviceMode === 'tv_ifp';
  const isMobileMode = effectiveDeviceMode === 'mobile';

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden select-none">
      {/* FULL-BLEED 3D THREE.JS SPACE VIEWPORT (LIGHTWEIGHT & OPTIMIZED) */}
      <SpaceCanvas3D
        selectedShipId={profile.selectedShipId}
        currentPlanetIndex={currentPlanetId - 1}
        activeCategoryId={selectedCategory}
        activeEnemies={activeEnemies}
        targetEnemyId={selectedEnemyId}
        laserFireTrigger={laserFireTrigger}
        enemyAttackTrigger={enemyAttackTrigger}
        warpTrigger={warpTrigger}
        boostTrigger={boostTrigger}
        playerLives={lives}
        shieldActive={shieldActive}
        isPaused={isPaused || activeModal !== 'NONE'}
        graphicsQuality={settings.graphicsQuality}
        onSelectEnemy={(id) => setSelectedEnemyId(id)}
      />

      {/* HOLOGRAM ARENA TRANSITION BANNER */}
      {arenaBanner && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none px-6 py-3 rounded-2xl bg-slate-950/90 border-2 border-cyan-400 shadow-2xl text-center">
          <div className="text-[11px] font-mono text-amber-300 tracking-widest">
            HOLOGRAM SECTOR TRANSITION
          </div>
          <div className="text-lg sm:text-2xl font-extrabold font-display text-white tracking-wider">
            {arenaBanner.arenaName}
          </div>
          <div className="text-xs font-mono text-cyan-300">
            {arenaBanner.subtitle}
          </div>
        </div>
      )}

      {/* =====================================================================
          SCREEN 1: MAIN MENU (WITH PROMINENT SDN 66 BANDA ACEH SUB-TITLE)
          ===================================================================== */}
      {screenState === 'MAIN_MENU' && (
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-3 sm:p-6 lg:p-8 overflow-y-auto pointer-events-auto">
          {/* Top Perimeter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
            <div className="flex flex-wrap items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-950/90 border border-slate-800">
              <Rocket className="w-5 h-5 text-cyan-400 shrink-0" />
              <span className="text-xs font-mono text-slate-300">
                PESAWAT:{' '}
                <strong className="text-white">{selectedShip.name}</strong> ·{' '}
                <strong className="text-amber-300 tabular-nums">
                  {profile.coins.toLocaleString('id-ID')} Koin
                </strong>
              </span>
              <span className="hidden sm:inline text-slate-600">|</span>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-display font-bold text-cyan-300">
                <GraduationCap className="w-4 h-4 text-amber-400" />
                Media Pembelajaran SDN 66 Banda Aceh
              </span>
            </div>

            {/* Quick Device Layout Mode & Fullscreen Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/90 border border-slate-800">
                <button
                  onClick={() =>
                    setSettings((s) => ({ ...s, deviceLayoutMode: 'mobile' }))
                  }
                  className={`min-h-[38px] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                    effectiveDeviceMode === 'mobile'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Optimasi Layar HP"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>HP</span>
                </button>
                <button
                  onClick={() =>
                    setSettings((s) => ({
                      ...s,
                      deviceLayoutMode: 'tablet_laptop',
                    }))
                  }
                  className={`min-h-[38px] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                    effectiveDeviceMode === 'tablet_laptop'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Optimasi Layar Tablet & Laptop"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Tablet / Laptop</span>
                </button>
                <button
                  onClick={() =>
                    setSettings((s) => ({ ...s, deviceLayoutMode: 'tv_ifp' }))
                  }
                  className={`min-h-[38px] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                    effectiveDeviceMode === 'tv_ifp'
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Optimasi Layar TV Sentuh / Interactive Flat Panel Kelas"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>TV Sentuh / IFP</span>
                </button>
              </div>

              <button
                onClick={toggleFullscreen}
                className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold flex items-center gap-1.5"
                title="Layar Penuh (Fullscreen)"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-cyan-400" />
                )}
                <span className="hidden sm:inline">Layar Penuh</span>
              </button>

              <button
                onClick={() =>
                  setSettings((s) => ({
                    ...s,
                    soundEnabled: !s.soundEnabled,
                  }))
                }
                className="min-h-[42px] min-w-[42px] p-2.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-slate-200 flex items-center justify-center"
                aria-label="Toggle Mute"
              >
                {settings.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {/* Center Hero Lockup & Pilot Registration Deck */}
          <div className="my-auto max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center py-3">
            {/* Left 7 Cols: Bespoke Inline SVG Title Lockup, Official School Subtitle & Mission Brief */}
            <div className="lg:col-span-7 space-y-3 sm:space-y-4 text-left">
              <div className="inline-flex flex-wrap items-center gap-2 text-xs font-mono text-cyan-300 tracking-wider">
                <span>METODE PEMBAGIAN GASING 3D</span>
                <span>·</span>
                <span>7 KATEGORI & 8 PLANET</span>
                <span>·</span>
                <span>RINGAN & CEPAT</span>
              </div>

              {/* Bespoke SVG Title Lockup + Prominent Official School Sub-title */}
              <div className="space-y-2">
                <svg
                  viewBox="0 0 680 110"
                  className="w-full max-w-xl h-auto drop-shadow-[0_4px_24px_rgba(6,182,212,0.35)]"
                  role="img"
                  aria-label="GALACTIC DIVISION WARS 3D"
                >
                  <defs>
                    <linearGradient
                      id="gdwTitleGrad"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="50%" stopColor="#f8fafc" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                  </defs>
                  <text
                    x="0"
                    y="52"
                    fill="url(#gdwTitleGrad)"
                    fontFamily="Oxanium, sans-serif"
                    fontWeight="800"
                    fontSize="52"
                    letterSpacing="2"
                  >
                    GALACTIC DIVISION
                  </text>
                  <text
                    x="0"
                    y="100"
                    fill="#fbbf24"
                    fontFamily="Oxanium, sans-serif"
                    fontWeight="800"
                    fontSize="44"
                    letterSpacing="6"
                  >
                    WARS 3D
                  </text>
                </svg>

                {/* Official School Subtitle Banner */}
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-cyan-950/80 border-2 border-cyan-400/70 shadow-lg shadow-cyan-500/15">
                  <GraduationCap className="w-5 h-5 text-amber-300 shrink-0" />
                  <span className="text-sm sm:text-lg font-display font-extrabold tracking-wide text-white">
                    Media Pembelajaran SDN 66 Banda Aceh
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-display font-bold tracking-widest text-amber-300 pt-0.5">
                  MASTER DIVISION, SAVE THE GALAXY!
                </p>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                Kendalikan pesawat tempur luar angkasa, pelajari pembagian
                bersisa maupun tanpa sisa bersama{' '}
                <strong className="text-amber-300">Captain Astro</strong>{' '}
                menggunakan <strong className="text-white">Metode GASING</strong>
                , dan hancurkan armada UFO Alien!
              </p>

              {/* Current Active Category & Arena Summary + Captain Astro Tutorial Trigger */}
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/90 max-w-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-mono text-amber-300">
                      ARENA AKTIF: {currentCategoryObj.environment.arenaName}
                    </div>
                    <div className="text-sm font-bold text-white">
                      {currentCategoryObj.title}
                    </div>
                    <div className="text-xs text-cyan-300">
                      Sektor: Planet {currentPlanet.id} – {currentPlanet.name}{' '}
                      (Boss: {currentPlanet.bossName})
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveModal('CATEGORY_SELECT')}
                    className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-300 transition-colors shrink-0"
                  >
                    Pilih 7 Kategori / Planet
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-300">
                    Ingin belajar cara mudah pembagian bersisa?
                  </span>
                  <button
                    onClick={() => setActiveModal('GASING_TUTORIAL')}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tutorial GASING Captain Astro</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Pilot Identity Form & Main Command Buttons */}
            <div className="lg:col-span-5 p-4 sm:p-6 rounded-2xl bg-slate-950/92 border border-cyan-500/35 shadow-2xl space-y-4">
              <div className="border-b border-slate-800 pb-2.5 flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-bold font-display text-white">
                    Registrasi Pilot Astronot
                  </h2>
                  <p className="text-xs text-slate-400">
                    Media Pembelajaran SDN 66 Banda Aceh · Leaderboard Top 100
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nama Pemain
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => {
                      setFormError('');
                      setProfile({ ...profile, name: e.target.value });
                    }}
                    placeholder="Contoh: Teuku Farhan"
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Asal Sekolah
                    </label>
                    <input
                      type="text"
                      value={profile.school}
                      onChange={(e) => {
                        setFormError('');
                        setProfile({ ...profile, school: e.target.value });
                      }}
                      placeholder="SDN 66 Banda Aceh"
                      className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Kelas
                    </label>
                    <input
                      type="text"
                      value={profile.className}
                      onChange={(e) => {
                        setFormError('');
                        setProfile({ ...profile, className: e.target.value });
                      }}
                      placeholder="Contoh: 5A"
                      className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {formError && (
                  <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/50 text-xs text-rose-200">
                    {formError}
                  </div>
                )}
              </div>

              {/* Primary CTA: 1. PLAY GAME */}
              <button
                onClick={handleStartMission}
                className="w-full min-h-[52px] py-3.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-[0.99] text-slate-950 font-display font-extrabold text-base sm:text-lg tracking-wider flex items-center justify-center gap-2.5 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>PLAY GAME</span>
              </button>

              {/* Secondary Command Grid */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={() => setActiveModal('CATEGORY_SELECT')}
                  className="min-h-[48px] py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-100 flex items-center justify-center gap-2 transition-colors"
                >
                  <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate">7 KATEGORI SOAL</span>
                </button>

                <button
                  onClick={() => setActiveModal('GASING_TUTORIAL')}
                  className="min-h-[48px] py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-xs font-bold text-amber-300 flex items-center justify-center gap-2 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">TUTORIAL GASING</span>
                </button>

                <button
                  onClick={() => openGarageWithTab('ships')}
                  className="min-h-[48px] py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-100 flex items-center justify-center gap-2 transition-colors"
                >
                  <Wrench className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">SPACE GARAGE (9 SHIP)</span>
                </button>

                <button
                  onClick={() => setActiveModal('LEADERBOARD')}
                  className="min-h-[48px] py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-amber-300 flex items-center justify-center gap-2 transition-colors"
                >
                  <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">LEADERBOARD TOP 100</span>
                </button>

                <button
                  onClick={() => setActiveModal('HOW_TO_PLAY')}
                  className="min-h-[48px] py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-100 flex items-center justify-center gap-2 transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="truncate">HOW TO PLAY</span>
                </button>

                <button
                  onClick={() => setActiveModal('SETTINGS')}
                  className="min-h-[48px] py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition-colors"
                >
                  <Settings className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate">SETTINGS & RINGAN</span>
                </button>
              </div>
            </div>
          </div>

          {/* Flat Control Hint Line */}
          <div className="text-center text-[11px] sm:text-xs font-mono text-slate-400">
            Media Pembelajaran SDN 66 Banda Aceh · Sentuh Pilihan A/B/C/D atau
            Tombol 1–4 Menembak · Ketuk UFO Kunci Target · Shift Boost Turbo
          </div>
        </div>
      )}

      {/* =====================================================================
          SCREEN 2: HYPERSPACE JUMP TRANSITION
          ===================================================================== */}
      {screenState === 'HYPERSPACE' && (
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-6 pointer-events-none text-center">
          <div className="px-8 py-6 rounded-2xl bg-slate-950/90 border border-cyan-400/50 space-y-2 shadow-2xl">
            <div className="text-xs font-mono text-cyan-300 tracking-widest">
              HYPERSPACE JUMP INITIATED
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-white">
              Menuju Sektor Berikutnya...
            </h2>
            <p className="text-sm text-amber-300 font-medium">
              Bersiaplah menghadapi armada UFO yang lebih kuat!
            </p>
          </div>
        </div>
      )}

      {/* =====================================================================
          SCREEN 3: ACTIVE 3D SPACE COMBAT HUD (SLEEK & COMPACT FOR WIDE 3D VIEW)
          ===================================================================== */}
      {screenState === 'PLAYING' && (
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-1.5 sm:p-3 pointer-events-none">
          {/* TOP COMPACT STATUS + SLIM QUESTION BAR */}
          <div className="space-y-1.5">
            {/* Compact Perimeter Status Row */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 pointer-events-auto">
              {/* Left: Lives (up to 5) + Planet/Level/Wave */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/75 border border-slate-800/80">
                <div
                  className="flex items-center gap-0.5"
                  aria-label={`Nyawa: ${lives}`}
                >
                  {Array.from({ length: profile.upgrades.maxHealth }).map(
                    (_, idx) => (
                      <Heart
                        key={idx}
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                          idx < lives
                            ? 'text-rose-500 fill-rose-500'
                            : 'text-slate-700'
                        }`}
                      />
                    )
                  )}
                </div>
                <span className="text-slate-600 text-xs">·</span>
                <span className="text-[11px] sm:text-xs font-bold font-display text-cyan-300 truncate max-w-[130px] sm:max-w-none">
                  {isMobileMode
                    ? `P${currentPlanet.id}: ${currentPlanet.name}`
                    : `${currentCategoryObj.environment.arenaName}`}
                </span>
                <span className="text-slate-600 text-xs">·</span>
                <span className="text-[11px] font-mono text-slate-300 tabular-nums">
                  Lv{currentLevel} ·{' '}
                  {currentWave === 5 ? 'BOSS' : `W${currentWave}/5`}
                </span>
              </div>

              {/* Right: Score, Coins, Combo, Audio & Pause */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/75 border border-slate-800/80">
                {combo >= 2 && (
                  <span className="text-[11px] font-mono font-bold text-amber-300 pr-1.5 border-r border-slate-800 tabular-nums">
                    {combo}x
                  </span>
                )}
                <div className="text-[11px] font-mono tabular-nums">
                  <strong className="text-white">
                    {score.toLocaleString('id-ID')}
                  </strong>
                  <span className="text-slate-400"> pts</span>
                </div>
                <span className="text-slate-600 text-xs">·</span>
                <div className="text-[11px] font-mono tabular-nums">
                  <strong className="text-amber-300">
                    {profile.coins.toLocaleString('id-ID')}
                  </strong>
                  <span className="text-amber-300/80"> koin</span>
                </div>

                <button
                  onClick={toggleFullscreen}
                  className="w-7 h-7 rounded-md bg-slate-900/90 hover:bg-slate-800 text-slate-300 hidden sm:flex items-center justify-center"
                  title="Layar Penuh"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                </button>

                <button
                  onClick={() =>
                    setSettings((s) => ({
                      ...s,
                      soundEnabled: !s.soundEnabled,
                    }))
                  }
                  className="w-7 h-7 rounded-md bg-slate-900/90 hover:bg-slate-800 text-slate-300 flex items-center justify-center"
                  title="Mute / Unmute"
                >
                  {settings.soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </button>
                <button
                  onClick={() => setIsPaused((p) => !p)}
                  className="w-7 h-7 rounded-md bg-slate-900/90 hover:bg-slate-800 text-slate-300 flex items-center justify-center"
                  title="Jeda Permainan"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* SLEEK SINGLE-ROW MATH QUESTION BAR (Does not block 3D battle!) */}
            {!isTvMode && (
              <div className="max-w-lg mx-auto w-full pointer-events-auto">
                <div className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-950/80 border border-cyan-500/45 shadow-lg">
                  <div className="flex items-center justify-between gap-2">
                    {/* Left: Category & Timer */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-[10px] font-mono font-bold text-cyan-300">
                        K{selectedCategory}
                      </span>
                      <span
                        className={`text-xs font-mono font-bold tabular-nums ${
                          questionTimeLeft <= 5
                            ? 'text-rose-400'
                            : 'text-amber-300'
                        }`}
                      >
                        ⏱{questionTimeLeft}s
                      </span>
                    </div>

                    {/* Center: Compact High-Contrast Equation */}
                    <div className="text-lg sm:text-2xl font-extrabold font-mono tabular-nums tracking-wide text-white text-center">
                      {currentQuestion.displayText}
                    </div>

                    {/* Right: Slim GASING Hint Button */}
                    <button
                      onClick={() => setShowGasingHint(true)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    >
                      <Lightbulb className="w-3 h-3" />
                      <span>GASING</span>
                    </button>
                  </div>

                  {/* Ultra-thin 3px Countdown Line */}
                  <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden mt-1">
                    <div
                      className={`h-full transition-all duration-300 ${
                        questionTimeLeft <= 5 ? 'bg-rose-500' : 'bg-cyan-400'
                      }`}
                      style={{
                        width: `${Math.max(0, (questionTimeLeft / questionMaxTime) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Compact Floating Feedback Pill (Auto-hides after 2.4s) */}
                {combatFeedback && (
                  <div
                    className={`mt-1 px-2.5 py-1 rounded-lg text-[11px] flex items-center justify-between gap-2 ${
                      combatFeedback.type === 'wrong'
                        ? 'bg-rose-950/85 border border-rose-500/40 text-rose-200'
                        : 'bg-emerald-950/85 border border-emerald-500/40 text-emerald-200'
                    }`}
                  >
                    <span className="font-bold truncate">
                      {combatFeedback.message}
                    </span>
                    {combatFeedback.detail && (
                      <span className="font-mono text-amber-300 truncate hidden sm:inline">
                        {combatFeedback.detail}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SLEEK COMPACT BOTTOM CONTROL DOCK (LEAVES >75% OF SCREEN OPEN FOR 3D SPACE WAR) */}
          <div
            className={`w-full mx-auto pointer-events-auto ${
              isTvMode ? 'max-w-4xl' : 'max-w-xl'
            }`}
          >
            {/* TV Sentuh / IFP Mode Question Bar */}
            {isTvMode && !dockCollapsed && (
              <div className="mb-2 px-4 py-2.5 rounded-xl bg-slate-950/85 border border-amber-400 shadow-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-amber-300">
                    K{selectedCategory} · ⏱{questionTimeLeft}s
                  </span>
                  <div className="text-2xl lg:text-3xl font-extrabold font-mono tabular-nums text-white">
                    {currentQuestion.displayText}
                  </div>
                </div>
                <button
                  onClick={() => setShowGasingHint(true)}
                  className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span>PETUNJUK GASING</span>
                </button>
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={() => setDockCollapsed((c) => !c)}
                className="px-3 py-0.5 rounded-t-lg bg-slate-950/80 border-t border-x border-slate-700/80 text-[10px] font-mono text-slate-300 hover:text-white flex items-center gap-1"
              >
                {dockCollapsed ? (
                  <>
                    <ChevronUp className="w-3 h-3 text-cyan-400" />
                    <span>▴ Panel Jawaban</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3 text-cyan-400" />
                    <span>▾ Sembunyikan</span>
                  </>
                )}
              </button>
            </div>

            {!dockCollapsed && (
              <div className="p-1.5 sm:p-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 shadow-xl space-y-1.5">
                {/* Single-Row Slim Tactical Strip */}
                <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() =>
                        setSettings({
                          ...settings,
                          inputMode:
                            settings.inputMode === 'choices'
                              ? 'keypad'
                              : 'choices',
                        })
                      }
                      className="h-7 px-2 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] sm:text-[11px] font-bold text-cyan-300 flex items-center gap-1"
                      title="Ganti Pilihan Ganda / Keypad"
                    >
                      {settings.inputMode === 'choices' ? (
                        <>
                          <Keyboard className="w-3 h-3" />
                          <span>Keypad</span>
                        </>
                      ) : (
                        <>
                          <MousePointerClick className="w-3 h-3" />
                          <span>Pilihan</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleTriggerBoost}
                      className="h-7 px-2 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 active:scale-95 border border-cyan-400/40 text-cyan-300 text-[10px] sm:text-[11px] font-bold flex items-center gap-1"
                      title="Dorongan Turbo (Shift)"
                    >
                      <Zap className="w-3 h-3 text-amber-300" />
                      <span>Boost</span>
                    </button>

                    {activeEnemies.length > 1 && (
                      <button
                        onClick={handleCycleTargetUfo}
                        className="h-7 px-2 rounded-md bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-700 text-[10px] sm:text-[11px] font-bold text-amber-300 flex items-center gap-1"
                        title="Ganti Target UFO"
                      >
                        <Crosshair className="w-3 h-3" />
                        <span>Target</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setActiveModal('GASING_TUTORIAL')}
                      className="h-7 px-2 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-[10px] sm:text-[11px] font-bold flex items-center gap-1"
                      title="Tutorial Captain Astro"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span className="hidden sm:inline">Astro</span>
                    </button>

                    <button
                      onClick={handleUseMegaBomb}
                      disabled={profile.upgrades.megaBombs <= 0}
                      className="h-7 px-2 rounded-md bg-orange-500/20 hover:bg-orange-500/30 disabled:opacity-40 border border-orange-500/40 text-orange-300 text-[10px] sm:text-[11px] font-bold flex items-center gap-1"
                      title="Mega Bomb"
                    >
                      <Flame className="w-3 h-3" />
                      <span>{profile.upgrades.megaBombs}</span>
                    </button>

                    <button
                      onClick={handleUseShieldPower}
                      disabled={
                        profile.upgrades.shieldCharges <= 0 || shieldActive
                      }
                      className="h-7 px-2 rounded-md bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 border border-sky-500/40 text-sky-300 text-[10px] sm:text-[11px] font-bold flex items-center gap-1"
                      title="Shield Pelindung"
                    >
                      <Shield className="w-3 h-3" />
                      <span>{profile.upgrades.shieldCharges}</span>
                    </button>

                    <button
                      onClick={handleBuyEmergencyHealth}
                      disabled={profile.coins < 100 || lives >= 5}
                      className="h-7 px-2 rounded-md bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-40 border border-rose-500/40 text-rose-300 text-[10px] sm:text-[11px] font-bold flex items-center gap-1"
                      title="Beli +1 Nyawa (100 Koin)"
                    >
                      <Heart className="w-3 h-3" />
                      <span>+1</span>
                    </button>
                  </div>
                </div>

                {/* MODE A: COMPACT, SLEEK 4 MULTIPLE-CHOICE BUTTONS (A., B., C., D.) */}
                {settings.inputMode === 'choices' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                    {currentQuestion.options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() =>
                          handleAnswerSubmission(
                            opt.quotient,
                            opt.remainder,
                            opt.text
                          )
                        }
                        className={`${
                          isTvMode
                            ? 'h-12 px-3 text-base sm:text-lg'
                            : 'h-9 sm:h-10 px-2.5 text-xs sm:text-sm'
                        } rounded-lg bg-slate-900/90 hover:bg-cyan-500 hover:text-slate-950 active:scale-95 border border-cyan-500/45 text-white font-mono font-bold tabular-nums transition-all flex items-center justify-between gap-1.5 cursor-pointer shadow`}
                      >
                        <span className="text-[11px] font-mono text-amber-300 font-extrabold shrink-0">
                          {opt.labelPrefix || ['A', 'B', 'C', 'D'][idx]}.
                        </span>
                        <span className="mx-auto truncate">{opt.text}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* MODE B: COMPACT NUMERIC KEYPAD FOR QUOTIENT & REMAINDER */}
                {settings.inputMode === 'keypad' && (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setActiveKeypadField('quotient')}
                        className={`h-9 px-2.5 rounded-lg border text-left flex items-center justify-between transition-colors ${
                          activeKeypadField === 'quotient'
                            ? 'bg-cyan-950/70 border-cyan-400'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      >
                        <span className="text-[10px] text-slate-400">
                          Hasil:
                        </span>
                        <span className="text-sm sm:text-base font-mono font-bold text-white tabular-nums">
                          {keypadQuotient || '0'}
                        </span>
                      </button>

                      <button
                        onClick={() => setActiveKeypadField('remainder')}
                        className={`h-9 px-2.5 rounded-lg border text-left flex items-center justify-between transition-colors ${
                          activeKeypadField === 'remainder'
                            ? 'bg-amber-950/70 border-amber-400'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      >
                        <span className="text-[10px] text-slate-400">
                          Sisa:
                        </span>
                        <span className="text-sm sm:text-base font-mono font-bold text-amber-300 tabular-nums">
                          {keypadRemainder || '0'}
                        </span>
                      </button>
                    </div>

                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(
                        (digit) => (
                          <button
                            key={digit}
                            onClick={() => {
                              if (activeKeypadField === 'quotient') {
                                setKeypadQuotient((prev) =>
                                  (prev + digit).slice(0, 5)
                                );
                              } else {
                                setKeypadRemainder((prev) =>
                                  prev === '0'
                                    ? digit
                                    : (prev + digit).slice(0, 3)
                                );
                              }
                            }}
                            className="h-8 sm:h-9 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-700 font-mono font-bold text-xs sm:text-sm text-white"
                          >
                            {digit}
                          </button>
                        )
                      )}
                      <button
                        onClick={() => {
                          if (activeKeypadField === 'quotient')
                            setKeypadQuotient('');
                          else setKeypadRemainder('0');
                        }}
                        className="h-8 sm:h-9 rounded-lg bg-rose-950/80 hover:bg-rose-900 active:scale-95 border border-rose-500/40 text-[10px] font-bold text-rose-200"
                      >
                        Hps
                      </button>
                      <button
                        onClick={() =>
                          handleAnswerSubmission(
                            Number(keypadQuotient || 0),
                            Number(keypadRemainder || 0)
                          )
                        }
                        className="h-8 sm:h-9 rounded-lg bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-bold text-[10px]"
                      >
                        Tembak
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          PAUSE OVERLAY MODAL
          ===================================================================== */}
      {screenState === 'PLAYING' && isPaused && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/85 pointer-events-auto">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-700 text-center space-y-4">
            <h3 className="text-2xl font-bold font-display text-white">
              Permainan Dijeda
            </h3>
            <p className="text-xs text-slate-400">
              {currentCategoryObj.environment.arenaName} · Planet{' '}
              {currentPlanet.id}: {currentPlanet.name}
            </p>
            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => setIsPaused(false)}
                className="w-full min-h-[48px] py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm"
              >
                Lanjutkan Pertempuran
              </button>
              <button
                onClick={() => openGarageWithTab('ships')}
                className="w-full min-h-[48px] py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm"
              >
                Beli / Ganti Pesawat (Space Garage)
              </button>
              <button
                onClick={() => openGarageWithTab('weapons')}
                className="w-full min-h-[48px] py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
              >
                Upgrade Senjata & Armor
              </button>
              <button
                onClick={() => setActiveModal('SETTINGS')}
                className="w-full min-h-[48px] py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-sm"
              >
                Pengaturan Layar & Grafis Ringan
              </button>
              <button
                onClick={() =>
                  finalizeMission(false, score, correctCount, ufosDestroyed)
                }
                className="w-full min-h-[48px] py-3 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-500/40 text-rose-200 font-bold text-sm"
              >
                Akhiri Misi & Simpan Skor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          EMERGENCY HEALTH REVIVE PROMPT (BEFORE GAME OVER)
          ===================================================================== */}
      {emergencyRevivePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 pointer-events-auto">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border-2 border-amber-400 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-400 flex items-center justify-center mx-auto">
              <Heart className="w-7 h-7 text-rose-400" />
            </div>
            <h3 className="text-2xl font-extrabold font-display text-white">
              NYAWA PESAWAT KRITIS!
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Pesawat Anda mengalami kerusakan berat! Anda memiliki{' '}
              <strong className="text-amber-300 font-mono">
                {profile.coins.toLocaleString('id-ID')} Koin
              </strong>
              . Gunakan 100 Koin sekarang untuk mengaktifkan Perbaikan Darurat
              (+1 Nyawa) dan melanjutkan pertempuran?
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleBuyEmergencyHealth}
                className="min-h-[48px] py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                Gunakan 100 Koin (+1 Nyawa)
              </button>
              <button
                onClick={() =>
                  finalizeMission(false, score, correctCount, ufosDestroyed)
                }
                className="min-h-[48px] py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Akhiri Pertempuran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SCREEN 4 & 5: GAME OVER & GALACTIC CHAMPION (WITH UPGRADE & BUY NEW SHIP)
          ===================================================================== */}
      {(screenState === 'GAME_OVER' || screenState === 'CHAMPION') && (
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-4 sm:p-6 overflow-y-auto pointer-events-auto">
          {/* Top Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 max-w-5xl w-full mx-auto">
            <div>
              {screenState === 'CHAMPION' ? (
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-amber-300">
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {achievedRank === 1
                        ? 'GELAR TERTINGGI: SUPREME GALAXY HERO (#1 TOP LEADERBOARD)'
                        : achievedRank && achievedRank <= 3
                          ? `PODIUM UTAMA PERINGKAT #${achievedRank} TOP LEADERBOARD!`
                          : `MASUK PERINGKAT #${achievedRank || 1} TOP 100 GALAKSI!`}
                    </span>
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-extrabold font-display tracking-wider text-amber-300">
                    GALACTIC CHAMPION!
                  </h1>
                  <div className="text-sm sm:text-base font-mono text-cyan-300">
                    HOLOGRAM KOMANDAN:{' '}
                    <strong className="text-white">{profile.name}</strong> ·{' '}
                    {profile.school} (Kelas {profile.className})
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-xs font-mono text-rose-400">
                    LAPORAN PERTEMPURAN ANTARIKSA · MEDIA PEMBELAJARAN SDN 66
                    BANDA ACEH
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-extrabold font-display text-white">
                    MISSION COMPLETED / GALAXY LOST
                  </h1>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowResultsPanelOnEnd((v) => !v)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-950/90 border border-slate-700 text-xs font-mono text-cyan-300 hover:text-white"
            >
              {showResultsPanelOnEnd
                ? 'Sembunyikan Panel (Lihat Adegan 3D Penuh)'
                : 'Tampilkan Panel Hasil & Riwayat Soal'}
            </button>
          </div>

          {/* Comprehensive Results & Question Review Panel */}
          {showResultsPanelOnEnd && (
            <div className="my-auto max-w-5xl w-full mx-auto p-4 sm:p-6 rounded-2xl bg-slate-950/92 border border-slate-800 shadow-2xl space-y-5">
              {/* Pilot Info & Primary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">
                    Pilot Astronot
                  </div>
                  <div className="text-sm font-bold text-white truncate">
                    {profile.name}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {profile.school} · {profile.className}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Total Skor</div>
                  <div className="text-xl font-extrabold font-mono text-amber-300 tabular-nums">
                    {score.toLocaleString('id-ID')}
                  </div>
                  <div className="text-[11px] text-cyan-300 font-mono">
                    Peringkat #{achievedRank || '-'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">
                    Koin Diperoleh
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-300 tabular-nums">
                    +{sessionCoins.toLocaleString('id-ID')}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Total: {profile.coins.toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">
                    Benar / Salah
                  </div>
                  <div className="text-base font-bold font-mono text-white tabular-nums">
                    <span className="text-emerald-400">{correctCount}</span> /{' '}
                    <span className="text-rose-400">{wrongCount}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Akurasi: {accuracyPercent}%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">
                    UFO Dihancurkan
                  </div>
                  <div className="text-xl font-bold font-mono text-cyan-300 tabular-nums">
                    {ufosDestroyed} UFO
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Max Combo: {maxCombo}x
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">
                    Pesawat & Level
                  </div>
                  <div className="text-sm font-bold font-mono text-white truncate">
                    {selectedShip.name}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Planet {currentPlanetId} · Lv {currentLevel}
                  </div>
                </div>
              </div>

              {/* Answered Questions History Log */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-bold text-slate-300">
                  DAFTAR RIWAYAT SOAL PEMBAGIAN YANG DIJAWAB (
                  {attemptHistory.length} Soal)
                </h3>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/80">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono bg-slate-950/60">
                        <th className="py-2 px-3">SOAL PEMBAGIAN</th>
                        <th className="py-2 px-3">JAWABAN PEMAIN</th>
                        <th className="py-2 px-3">JAWABAN BENAR</th>
                        <th className="py-2 px-3 text-right">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {attemptHistory.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-4 text-center text-slate-500"
                          >
                            Belum ada soal yang tercatat pada sesi ini.
                          </td>
                        </tr>
                      ) : (
                        attemptHistory.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-bold text-white tabular-nums">
                              {item.question}
                            </td>
                            <td className="py-2 px-3 text-slate-300 tabular-nums">
                              {item.userAnswer}
                            </td>
                            <td className="py-2 px-3 text-cyan-300 tabular-nums">
                              {item.correctAnswer}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {item.isCorrect ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Benar
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                                  <XCircle className="w-3.5 h-3.5" /> Salah
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5 Action Buttons as Required in Bagian 6 */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                <button
                  onClick={() => openGarageWithTab('weapons')}
                  className="min-h-[48px] py-3 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Wrench className="w-4 h-4 shrink-0" />
                  <span>UPGRADE SPACESHIP</span>
                </button>

                <button
                  onClick={() => openGarageWithTab('ships')}
                  className="min-h-[48px] py-3 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Rocket className="w-4 h-4 shrink-0" />
                  <span>BUY NEW SPACESHIP</span>
                </button>

                <button
                  onClick={handleStartMission}
                  className="min-h-[48px] py-3 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 shrink-0" />
                  <span>RETURN TO GAME</span>
                </button>

                <button
                  onClick={() => {
                    soundEngine.startMusic('menu');
                    setScreenState('MAIN_MENU');
                  }}
                  className="min-h-[48px] py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Home className="w-4 h-4 shrink-0" />
                  <span>MAIN MENU</span>
                </button>

                <button
                  onClick={() => setActiveModal('LEADERBOARD')}
                  className="col-span-2 sm:col-span-1 min-h-[48px] py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-400/50 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trophy className="w-4 h-4 shrink-0" />
                  <span>LEADERBOARD</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          INTERACTIVE GASING HINT MODAL
          ===================================================================== */}
      {showGasingHint && (
        <GasingHintModal
          question={currentQuestion}
          onClose={() => setShowGasingHint(false)}
          onOpenCaptainAstroTutorial={() => {
            setShowGasingHint(false);
            setActiveModal('GASING_TUTORIAL');
          }}
        />
      )}

      {/* =====================================================================
          INTERACTIVE CAPTAIN ASTRO GASING TUTORIAL MODAL
          ===================================================================== */}
      {activeModal === 'GASING_TUTORIAL' && (
        <CaptainAstroTutorialModal
          onClose={() => setActiveModal('NONE')}
          onStartCategory1Battle={() => {
            handleSelectCategoryWithTransition(1);
            setActiveModal('NONE');
            if (screenState === 'MAIN_MENU') {
              handleStartMission();
            }
          }}
        />
      )}

      {/* =====================================================================
          ALL MENU, GARAGE & UPGRADE MODALS
          ===================================================================== */}
      <GameModals
        activeModal={activeModal}
        onClose={() => setActiveModal('NONE')}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategoryWithTransition}
        selectedPlanetId={currentPlanetId}
        onSelectPlanet={(pId) => setCurrentPlanetId(pId)}
        profile={profile}
        onUpdateProfile={setProfile}
        leaderboard={leaderboard}
        isFirebaseLive={isFirebaseLive}
        onRefreshLeaderboard={refreshLeaderboard}
        settings={settings}
        onUpdateSettings={setSettings}
        onStartGameFromModal={handleStartMission}
        initialGarageTab={initialGarageTab}
        onOpenCaptainAstroTutorial={() => setActiveModal('GASING_TUTORIAL')}
      />
    </div>
  );
}
