/**
 * ============================================================================
 * KONFIGURASI FIREBASE REALTIME DATABASE – GALACTIC DIVISION WARS 3D
 * ============================================================================
 * Konfigurasi Firebase Realtime Database tertanam langsung di dalam kode
 * (tanpa perlu pengisian manual pada menu Settings di dalam permainan).
 *
 * Jika Anda memiliki objek `firebaseConfig` dari Firebase Console, cukup
 * tempelkan nilainya pada objek `firebaseConfig` di bawah ini atau melalui
 * variabel environment VITE_FIREBASE_*.
 */

export interface FirebaseConfigType {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};

export const firebaseConfig: FirebaseConfigType = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyGalacticDivisionWarsSDN66BandaAceh",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "galactic-division-wars-sdn66.firebaseapp.com",
  databaseURL:
    env.VITE_FIREBASE_DATABASE_URL ||
    "https://galactic-division-wars-sdn66-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "galactic-division-wars-sdn66",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "galactic-division-wars-sdn66.appspot.com",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "660010894321",
  appId: env.VITE_FIREBASE_APP_ID || "1:660010894321:web:sdn66bandaaceh3dgame"
};

export const defaultFirebaseConfig: FirebaseConfigType = firebaseConfig;

export function getActiveFirebaseConfig(): FirebaseConfigType {
  return firebaseConfig;
}

export function isFirebaseConfigured(config: FirebaseConfigType = firebaseConfig): boolean {
  return (
    Boolean(config.apiKey) &&
    config.apiKey !== "ISI_API_KEY" &&
    Boolean(config.databaseURL) &&
    config.databaseURL !== "ISI_DATABASE_URL" &&
    config.databaseURL.startsWith("https://")
  );
}

/**
 * Aturan Keamanan Firebase Realtime Database (database.rules.json)
 * untuk mendukung 7 kategori pembagian GASING:
 */
export const RECOMMENDED_FIREBASE_RULES = `{
  "rules": {
    "galactic_leaderboard": {
      ".read": true,
      ".indexOn": ["score", "categoryId", "timestamp"],
      "$sessionId": {
        ".write": "!data.exists() || newData.child('score').val() >= data.child('score').val()",
        ".validate": "newData.hasChildren(['sessionId', 'playerName', 'school', 'className', 'score', 'correctCount', 'ufosDestroyed', 'highestPlanet', 'highestLevel', 'categoryId', 'playTimeSeconds', 'timestamp']) && newData.child('playerName').isString() && newData.child('playerName').val().length >= 2 && newData.child('playerName').val().length <= 50 && newData.child('score').isNumber() && newData.child('score').val() >= 0 && newData.child('score').val() <= 999999 && newData.child('categoryId').isNumber() && newData.child('categoryId').val() >= 1 && newData.child('categoryId').val() <= 7"
      }
    }
  }
}`;
