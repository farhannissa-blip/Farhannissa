import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  runTransaction,
  query,
  orderByChild,
  limitToLast,
  Database,
  off,
} from 'firebase/database';
import { LeaderboardEntry } from '../types/game';
import { getActiveFirebaseConfig, isFirebaseConfigured } from '../config/firebaseConfig';

const LOCAL_LEADERBOARD_KEY = 'gdw_leaderboard_entries_v2';
const SUBMITTED_SESSIONS_KEY = 'gdw_submitted_sessions_v2';

const INITIAL_COMPETITION_ENTRIES: LeaderboardEntry[] = [
  {
    id: 'seed_1',
    sessionId: 'seed_session_1',
    playerName: 'Teuku Farhan Syahputra',
    school: 'SDN 66 Banda Aceh',
    className: '6A',
    score: 15680,
    correctCount: 50,
    ufosDestroyed: 48,
    highestPlanet: 8,
    highestLevel: 30,
    categoryId: 7,
    playTimeSeconds: 398,
    timestamp: Date.now() - 3600000 * 3,
    selectedShipId: 'ship_quantum_phoenix',
  },
  {
    id: 'seed_2',
    sessionId: 'seed_session_2',
    playerName: 'Cut Nadia Meutia',
    school: 'SDN 66 Banda Aceh',
    className: '5A',
    score: 14850,
    correctCount: 48,
    ufosDestroyed: 46,
    highestPlanet: 8,
    highestLevel: 30,
    categoryId: 6,
    playTimeSeconds: 412,
    timestamp: Date.now() - 3600000 * 5,
    selectedShipId: 'ship_titan_destroyer',
  },
  {
    id: 'seed_3',
    sessionId: 'seed_session_3',
    playerName: 'Raka Pratama',
    school: 'SDN Menteng 01 Jakarta',
    className: '6B',
    score: 13420,
    correctCount: 44,
    ufosDestroyed: 42,
    highestPlanet: 7,
    highestLevel: 27,
    categoryId: 5,
    playTimeSeconds: 385,
    timestamp: Date.now() - 3600000 * 8,
    selectedShipId: 'ship_phantom_x9',
  },
  {
    id: 'seed_4',
    sessionId: 'seed_session_4',
    playerName: 'Muhammad Zikri Al-Fatih',
    school: 'SDN 66 Banda Aceh',
    className: '4B',
    score: 12190,
    correctCount: 41,
    ufosDestroyed: 39,
    highestPlanet: 7,
    highestLevel: 25,
    categoryId: 4,
    playTimeSeconds: 360,
    timestamp: Date.now() - 3600000 * 12,
    selectedShipId: 'ship_quantum',
  },
  {
    id: 'seed_5',
    sessionId: 'seed_session_5',
    playerName: 'Alya Zahra',
    school: 'SD Negeri 1 Denpasar',
    className: '5A',
    score: 10640,
    correctCount: 37,
    ufosDestroyed: 35,
    highestPlanet: 6,
    highestLevel: 22,
    categoryId: 3,
    playTimeSeconds: 310,
    timestamp: Date.now() - 3600000 * 18,
  },
  {
    id: 'seed_6',
    sessionId: 'seed_session_6',
    playerName: 'Siti Sarah Humaira',
    school: 'SDN 66 Banda Aceh',
    className: '3A',
    score: 9480,
    correctCount: 34,
    ufosDestroyed: 32,
    highestPlanet: 5,
    highestLevel: 19,
    categoryId: 1,
    playTimeSeconds: 295,
    timestamp: Date.now() - 3600000 * 24,
  },
];

let firebaseApp: FirebaseApp | null = null;
let realtimeDb: Database | null = null;

function initFirebaseIfReady(): Database | null {
  const cfg = getActiveFirebaseConfig();
  if (!isFirebaseConfigured(cfg)) {
    return null;
  }
  try {
    if (!getApps().length) {
      firebaseApp = initializeApp(cfg);
    } else {
      firebaseApp = getApps()[0];
    }
    realtimeDb = getDatabase(firebaseApp, cfg.databaseURL);
    return realtimeDb;
  } catch (err) {
    console.warn('Firebase initialization warning:', err);
    return null;
  }
}

export function getLocalLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(INITIAL_COMPETITION_ENTRIES));
      return [...INITIAL_COMPETITION_ENTRIES];
    }
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...INITIAL_COMPETITION_ENTRIES];
  } catch {
    return [...INITIAL_COMPETITION_ENTRIES];
  }
}

function saveLocalLeaderboard(entries: LeaderboardEntry[]) {
  try {
    const sorted = [...entries]
      .sort((a, b) => b.score - a.score || a.playTimeSeconds - b.playTimeSeconds)
      .slice(0, 100);
    localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(sorted));
  } catch {
    // ignore storage errors
  }
}

function hasSessionSubmitted(sessionId: string): boolean {
  try {
    const raw = localStorage.getItem(SUBMITTED_SESSIONS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return list.includes(sessionId);
  } catch {
    return false;
  }
}

function markSessionSubmitted(sessionId: string) {
  try {
    const raw = localStorage.getItem(SUBMITTED_SESSIONS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(sessionId)) {
      list.push(sessionId);
      localStorage.setItem(SUBMITTED_SESSIONS_KEY, JSON.stringify(list.slice(-200)));
    }
  } catch {
    // ignore
  }
}

export async function submitScoreToLeaderboard(
  entry: Omit<LeaderboardEntry, 'id' | 'timestamp'>
): Promise<{ rank: number; entries: LeaderboardEntry[]; mode: 'firebase' | 'local' }> {
  // Validate data integrity
  const sanitizedEntry: LeaderboardEntry = {
    ...entry,
    id: entry.sessionId,
    playerName: entry.playerName.trim().slice(0, 40) || 'Pilot Galaksi',
    school: entry.school.trim().slice(0, 60) || 'SDN 66 Banda Aceh',
    className: entry.className.trim().slice(0, 20) || 'Umum',
    score: Math.max(0, Math.min(999999, Math.floor(entry.score))),
    correctCount: Math.max(0, Math.floor(entry.correctCount)),
    ufosDestroyed: Math.max(0, Math.floor(entry.ufosDestroyed)),
    highestPlanet: Math.max(1, Math.min(8, Math.floor(entry.highestPlanet))),
    highestLevel: Math.max(1, Math.floor(entry.highestLevel)),
    playTimeSeconds: Math.max(1, Math.floor(entry.playTimeSeconds)),
    timestamp: Date.now(),
  };

  // Prevent duplicate writes from the same game session
  const localEntries = getLocalLeaderboard();
  const existingIdx = localEntries.findIndex((e) => e.sessionId === sanitizedEntry.sessionId);
  if (existingIdx >= 0) {
    if (sanitizedEntry.score > localEntries[existingIdx].score) {
      localEntries[existingIdx] = sanitizedEntry;
    }
  } else if (!hasSessionSubmitted(sanitizedEntry.sessionId)) {
    localEntries.push(sanitizedEntry);
    markSessionSubmitted(sanitizedEntry.sessionId);
  }
  saveLocalLeaderboard(localEntries);

  const db = initFirebaseIfReady();
  if (db) {
    try {
      const entryRef = ref(db, `galactic_leaderboard/${sanitizedEntry.sessionId}`);
      const transactionPromise = runTransaction(entryRef, (currentData) => {
        if (currentData === null) {
          return sanitizedEntry;
        }
        if (sanitizedEntry.score > (currentData.score || 0)) {
          return sanitizedEntry;
        }
        return currentData;
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Firebase write timeout')), 2500);
      });

      await Promise.race([transactionPromise, timeoutPromise]);
      const sortedLocal = getLocalLeaderboard();
      const rank = sortedLocal.findIndex((e) => e.sessionId === sanitizedEntry.sessionId) + 1;
      return { rank: rank > 0 ? rank : 1, entries: sortedLocal, mode: 'firebase' };
    } catch {
      // Non-blocking fallback to local storage so gameplay never stutters or fails
    }
  }

  const sorted = getLocalLeaderboard();
  const rank = sorted.findIndex((e) => e.sessionId === sanitizedEntry.sessionId) + 1;
  return { rank: rank > 0 ? rank : sorted.length, entries: sorted, mode: 'local' };
}

export function subscribeLeaderboardTop100(
  onUpdate: (entries: LeaderboardEntry[], isFirebaseLive: boolean) => void
): () => void {
  // Always emit local entries immediately so UI renders without waiting
  onUpdate(getLocalLeaderboard(), false);

  const db = initFirebaseIfReady();
  if (!db) {
    return () => {};
  }

  try {
    const topQuery = query(ref(db, 'galactic_leaderboard'), orderByChild('score'), limitToLast(100));
    const connectedRef = ref(db, '.info/connected');
    let isConnected = false;

    const connUnsub = onValue(
      connectedRef,
      (snap) => {
        isConnected = Boolean(snap.val());
      },
      () => {
        isConnected = false;
      }
    );

    const dataUnsub = onValue(
      topQuery,
      (snapshot) => {
        const val = snapshot.val();
        if (!val) {
          onUpdate(getLocalLeaderboard(), isConnected);
          return;
        }
        const list: LeaderboardEntry[] = Object.values(val);
        const sorted = list
          .filter((item) => item && typeof item.score === 'number')
          .sort((a, b) => b.score - a.score || a.playTimeSeconds - b.playTimeSeconds)
          .slice(0, 100);
        saveLocalLeaderboard(sorted);
        onUpdate(sorted, true);
      },
      () => {
        onUpdate(getLocalLeaderboard(), false);
      }
    );

    return () => {
      try {
        connUnsub();
        dataUnsub();
        off(topQuery);
      } catch {
        // ignore cleanup errors
      }
    };
  } catch {
    return () => {};
  }
}
