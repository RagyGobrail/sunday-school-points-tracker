import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Church, LogIn, AlertCircle, ShieldAlert } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { 
    loginWithGoogle, 
    loginWithEmail, 
    registerWithEmail, 
    leaderProfile, 
    firebaseUser, 
    logout,
    error, 
    clearError 
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [authMethod, setAuthMethod] = useState<'email' | 'google'>(() => {
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
      return 'email';
    }
    return 'email';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(displayName, email, password);
      }
    } catch (e) {
      // error set in context
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user is authenticated but not yet approved by an admin
  if (firebaseUser && leaderProfile && !leaderProfile.isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">في انتظار موافقة المشرف</h2>
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">
            أهلاً بك يا <strong>{leaderProfile.displayName}</strong>. تم إنشاء حسابك بنجاح، ولأمان بيانات الأطفال، يجب على أمين الخدمة أو المشرف تفعيل حسابك كخادم مصرح له قبل الدخول للفصل.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 font-mono mb-6">
            {leaderProfile.email}
          </div>
          <button
            onClick={logout}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
          >
            تسجيل الخروج أو استخدام حساب آخر
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xl shadow-slate-200/50">
        
        {/* Church Emblem */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black text-2xl shadow-md shadow-indigo-600/20 mb-3">
            ✟
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            فصل مدارس الأحد
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            الكنيسة القبطية الأرثوذكسية • بوابة القادة والخدام
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Method Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-5 border border-slate-200 text-xs font-black">
          <button
            type="button"
            onClick={() => {
              setAuthMethod('email');
              clearError();
            }}
            className={`flex-1 py-2 rounded-xl transition ${
              authMethod === 'email'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            البريد وكلمة المرور
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod('google');
              clearError();
            }}
            className={`flex-1 py-2 rounded-xl transition ${
              authMethod === 'google'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            حساب Google
          </button>
        </div>

        {/* Content for Google Sign-In */}
        {authMethod === 'google' && (
          <div className="space-y-4">
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 text-center">
              <p className="text-xs text-indigo-900 font-bold mb-3">
                تسجيل الدخول السريع بحساب Google
              </p>
              <button
                id="google-signin-btn"
                type="button"
                onClick={loginWithGoogle}
                className="w-full py-3.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-sm shadow-sm flex items-center justify-center gap-3 transition active:scale-[0.99]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>دخول فوري بحساب Google</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 text-center font-medium leading-relaxed">
              إذا ظهر لك تنبيه النطاق غير مصرح به على روابط Vercel، يمكنك التبديل فوراً لتبويب «البريد وكلمة المرور» للدخول المباشر.
            </p>
          </div>
        )}

        {/* Content for Email & Password Form */}
        {authMethod === 'email' && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-xs text-slate-600 font-medium text-center">
              الدخول بالبريد الإلكتروني يعمل على كافة الروابط بدون أي متطلبات صلاحيات.
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل (الخادم):</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: الخادم اسكندر"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني:</label>
                <input
                  type="email"
                  required
                  placeholder="eskander.ragy@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور:</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 text-left"
                  dir="ltr"
                />
              </div>

              <button
                id="email-auth-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {isSubmitting
                  ? 'جاري التحقق...'
                  : mode === 'login'
                  ? 'تسجيل الدخول'
                  : 'إنشاء حساب خادم جديد'}
              </button>
            </form>

            {/* Toggle Login / Register */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  clearError();
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
              >
                {mode === 'login'
                  ? 'أول مرة تستخدم التطبيق؟ اضغط هنا لإنشاء حسابك'
                  : 'لديك حساب بالفعل؟ العودة لتسجيل الدخول'}
              </button>
            </div>
          </div>
        )}

        {/* Footer note */}
        <div className="mt-8 pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
          تطبيق مخصص لقادة الفصل فقط لحفظ نقاط القداس والحضور والمشاركة
        </div>
      </div>
    </div>
  );
};
