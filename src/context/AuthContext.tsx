import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  collection, 
  getDocs,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';
import { LeaderUser } from '../types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  leaderProfile: LeaderUser | null;
  loading: boolean;
  isAdmin: boolean;
  isAuthorized: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateLeaderStatus: (uid: string, isAuthorized: boolean, role?: 'admin' | 'leader') => Promise<void>;
  deleteLeader: (uid: string) => Promise<void>;
  allLeaders: LeaderUser[];
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define default master admin emails if applicable
const ADMIN_EMAILS = ['eskander.ragy@gmail.com'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [leaderProfile, setLeaderProfile] = useState<LeaderUser | null>(null);
  const [allLeaders, setAllLeaders] = useState<LeaderUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);

          const isKnownAdmin = !!user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

          if (!userSnap.exists()) {
            const newProfile: LeaderUser = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'خادم',
              photoURL: user.photoURL || '',
              role: isKnownAdmin ? 'admin' : 'leader',
              isAuthorized: isKnownAdmin, // Master admin is immediately authorized
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString()
            };

            await setDoc(userRef, newProfile);
            setLeaderProfile(newProfile);
          } else {
            const data = userSnap.data() as LeaderUser;
            // If email is master admin but role isn't admin yet, promote
            if (isKnownAdmin && (!data.isAuthorized || data.role !== 'admin')) {
              data.isAuthorized = true;
              data.role = 'admin';
              await updateDoc(userRef, { isAuthorized: true, role: 'admin', lastLoginAt: new Date().toISOString() });
            } else {
              await updateDoc(userRef, { lastLoginAt: new Date().toISOString() }).catch(() => {});
            }
            setLeaderProfile(data);
          }
        } catch (err: any) {
          console.error('Error fetching or initializing user profile:', err);
          // Fallback profile so authenticated users aren't locked out due to transient permission race
          const isKnownAdmin = !!user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
          setLeaderProfile({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'خادم',
            photoURL: user.photoURL || '',
            role: isKnownAdmin ? 'admin' : 'leader',
            isAuthorized: isKnownAdmin,
            createdAt: new Date().toISOString()
          });
        }
      } else {
        setLeaderProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen to profile changes in real-time
  useEffect(() => {
    if (!firebaseUser) return;
    const userRef = doc(db, 'users', firebaseUser.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as LeaderUser;
        const isKnownAdmin = !!firebaseUser.email && ADMIN_EMAILS.includes(firebaseUser.email.toLowerCase());
        if (isKnownAdmin) {
          data.isAuthorized = true;
          data.role = 'admin';
        }
        setLeaderProfile(data);
      }
    }, (err) => {
      console.warn('Realtime profile listener error:', err);
    });
    return () => unsub();
  }, [firebaseUser]);

  // If user is Admin or authorized, fetch all leaders in real-time
  useEffect(() => {
    if (!leaderProfile?.isAuthorized) {
      setAllLeaders([]);
      return;
    }
    const leadersCol = collection(db, 'users');
    const unsub = onSnapshot(leadersCol, (snap) => {
      const list: LeaderUser[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as LeaderUser);
      });
      setAllLeaders(list);
    }, (err) => {
      console.warn('Could not fetch all leaders:', err);
    });
    return () => unsub();
  }, [leaderProfile?.isAuthorized]);

  const loginWithGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة في المتصفح لتسجيل الدخول.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        // User closed popup
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('تسجيل الدخول بحساب Google مقيّد على نطاق Vercel الخارجي لعدم توفر صلاحية مالك المشروع في Google Cloud. يرجى تسجيل الدخول أو إنشاء حسابك بالبريد الإلكتروني وكلمة المرور بالأسفل للدخول الفوري كمسؤول كامل الصلاحيات.');
      } else {
        setError('تعذر تسجيل الدخول بواسطة جوجل: ' + (err.message || ''));
      }
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      console.error('Email signin error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('تسجيل الدخول بالبريد الإلكتروني غير مفعّل في مشروع Firebase. يرجى استخدام تسجيل الدخول بواسطة Google المعتمد.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else {
        setError('حدث خطأ أثناء تسجيل الدخول: ' + (err.message || 'حاول مرة أخرى'));
      }
      throw err;
    }
  };

  const registerWithEmail = async (name: string, email: string, pass: string) => {
    setError(null);
    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      await updateProfile(res.user, { displayName: name });
      
      const isKnownAdmin = ADMIN_EMAILS.includes(email.trim().toLowerCase());
      const newProfile: LeaderUser = {
        uid: res.user.uid,
        email: email.trim(),
        displayName: name,
        role: isKnownAdmin ? 'admin' : 'leader',
        isAuthorized: isKnownAdmin,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', res.user.uid), newProfile);
      setLeaderProfile(newProfile);
    } catch (err: any) {
      console.error('Email register error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('تسجيل الدخول بالبريد الإلكتروني غير مفعّل في إعدادات Firebase. يرجى استخدام زر تسجيل الدخول بواسطة Google.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('هذا البريد الإلكتروني مسجل بالفعل. يرجى التبديل لتسجيل الدخول بدلاً من إنشاء حساب جديد، أو استخدام Google.');
      } else if (err.code === 'auth/weak-password') {
        setError('كلمة المرور ضعيفة جداً (يجب ألا تقل عن 6 أحرف)');
      } else {
        setError('حدث خطأ أثناء إنشاء الحساب: ' + (err.message || ''));
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
      setFirebaseUser(null);
      setLeaderProfile(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const updateLeaderStatus = async (uid: string, isAuthorized: boolean, role?: 'admin' | 'leader') => {
    try {
      const ref = doc(db, 'users', uid);
      const updates: any = { isAuthorized };
      if (role) {
        updates.role = role;
      }
      await updateDoc(ref, updates);
    } catch (err: any) {
      console.error('Error updating leader status:', err);
      throw err;
    }
  };

  const deleteLeader = async (uid: string) => {
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (err: any) {
      console.error('Error deleting leader profile:', err);
      throw err;
    }
  };

  const isAdmin = leaderProfile?.role === 'admin' || (!!firebaseUser?.email && ADMIN_EMAILS.includes(firebaseUser.email.toLowerCase()));
  const isAuthorized = !!leaderProfile?.isAuthorized || isAdmin;

  return (
    <AuthContext.Provider value={{
      firebaseUser,
      leaderProfile,
      loading,
      isAdmin,
      isAuthorized,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      logout,
      updateLeaderStatus,
      deleteLeader,
      allLeaders,
      error,
      clearError: () => setError(null)
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
