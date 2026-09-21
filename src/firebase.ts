import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED 
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import configJson from '../firebase-applet-config.json';

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp({
  apiKey: configJson.apiKey,
  authDomain: configJson.authDomain,
  projectId: configJson.projectId,
  storageBucket: configJson.storageBucket,
  messagingSenderId: configJson.messagingSenderId,
  appId: configJson.appId,
});

// Initialize Firestore (default database for standard Firebase projects)
export const db = configJson.firestoreDatabaseId && configJson.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, configJson.firestoreDatabaseId)
  : getFirestore(app);

// Enable offline persistence gracefully
try {
  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db, { forceOwnership: false }).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence failed: Multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence is not supported in this browser environment');
      }
    });
  }
} catch (e) {
  console.warn('Offline persistence initialization error:', e);
}

// Authentication and Google Auth Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
