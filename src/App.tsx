import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Child, FridayWeek } from './types';
import { subscribeToChildren } from './services/childrenService';
import { getRecentFridays, getCurrentFridayDate } from './utils/dateUtils';
import { LoginScreen } from './components/LoginScreen';
import { QuickScoreForm } from './components/QuickScoreForm';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { ChildrenManagementScreen } from './components/ChildrenManagementScreen';
import { ChildDetailsScreen } from './components/ChildDetailsScreen';
import { WeeklyHistoryScreen } from './components/WeeklyHistoryScreen';
import { Top10Modal } from './components/Top10Modal';
import { AdminLeadersModal } from './components/AdminLeadersModal';
import { ConnectionStatusBadge } from './components/ConnectionStatusBadge';
import { 
  Home, 
  PlusCircle, 
  Users, 
  Trophy, 
  Award, 
  History, 
  Shield, 
  LogOut, 
  Sparkles,
  Church,
  Calendar,
  Layers,
  ChevronLeft
} from 'lucide-react';

export default function App() {
  const { firebaseUser, leaderProfile, loading, isAuthorized, isAdmin, logout } = useAuth();

  // Navigation State: 'dashboard' | 'addScore' | 'children' | 'leaderboard' | 'history'
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'addScore' | 'children' | 'leaderboard' | 'history'>('dashboard');
  
  // Realtime Data State
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [showTop10Modal, setShowTop10Modal] = useState<boolean>(false);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Friday week calculation
  const fridays = getRecentFridays(12);
  const currentFriday = fridays[0];

  // Online status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Subscribe to Children in realtime
  useEffect(() => {
    if (!firebaseUser || !isAuthorized) {
      setChildrenList([]);
      return;
    }

    const unsubscribe = subscribeToChildren((list) => {
      setChildrenList(list);
      // Update selected child object if currently viewing
      if (selectedChild) {
        const updated = list.find(c => c.id === selectedChild.id);
        if (updated) setSelectedChild(updated);
      }
    });

    return () => unsubscribe();
  }, [firebaseUser, isAuthorized, selectedChild?.id]);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-slate-600">جاري الاتصال بقاعدة البيانات...</span>
        </div>
      </div>
    );
  }

  // Not logged in or not authorized
  if (!firebaseUser || !isAuthorized) {
    return <LoginScreen />;
  }

  // Aggregate stats
  const totalClassPoints = childrenList.reduce((acc, c) => acc + (c.totalPoints || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 sm:pb-12" dir="rtl">
      
      {/* Top Header / App Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg sm:text-xl shadow-xs shrink-0">
              ✟
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate">
                مدارس الأحد
              </h1>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate max-w-[130px] sm:max-w-none">
                {leaderProfile?.displayName} {isAdmin && '• مشرف'}
              </p>
            </div>
          </div>

          {/* Status & Quick Action Buttons */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <ConnectionStatusBadge isOnline={isOnline} />

            {isAdmin && (
              <button
                onClick={() => setShowAdminModal(true)}
                title="إدارة القادة"
                className="p-2 sm:p-2.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition min-w-[38px] min-h-[38px] flex items-center justify-center"
              >
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}

            <button
              onClick={() => logout()}
              title="تسجيل الخروج"
              className="p-2 sm:p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition min-w-[38px] min-h-[38px] flex items-center justify-center"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-3.5 sm:py-6">
        
        {/* Child Details View takes priority when a child is opened */}
        {selectedChild ? (
          <ChildDetailsScreen
            child={selectedChild}
            onBack={() => setSelectedChild(null)}
          />
        ) : (
          <>
            {/* Tab: Dashboard / الرئيسية */}
            {currentTab === 'dashboard' && (
              <div className="space-y-4 sm:space-y-6">
                
                {/* Friday Welcome Card */}
                <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-lg sm:shadow-xl shadow-indigo-950/15 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />

                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-white/15 backdrop-blur-md rounded-full text-[11px] sm:text-xs font-black text-indigo-100 mb-1.5 sm:mb-2 border border-white/10">
                        <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>الأسبوع الحالي: {currentFriday.label}</span>
                      </div>
                      <h2 className="text-base sm:text-2xl font-black">رصد ومتابعة درجات الأطفال</h2>
                      <p className="text-xs text-indigo-200/90 mt-1 max-w-md font-medium hidden sm:block">
                        سجل درجات القداس والحضور والمشاركة بسهولة وسرعة، مع إمكانية التنقل بين الجمعة الحالية والجمعات السابقة بالأسهم.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentTab('addScore')}
                        className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white text-indigo-900 font-black text-xs sm:text-sm shadow-sm hover:bg-indigo-50 transition active:scale-95"
                      >
                        إضافة نقاط سريعة
                      </button>
                      <button
                        onClick={() => setShowTop10Modal(true)}
                        className="p-2 sm:p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition active:scale-95 min-w-[36px] min-h-[36px] flex items-center justify-center"
                        title="أفضل 10"
                      >
                        <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Scoring Section on Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <QuickScoreForm
                      childrenList={childrenList}
                      fridays={fridays}
                    />
                  </div>

                  {/* Top 3 Quick Preview */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                        <div className="flex items-center gap-2 text-slate-800 font-black text-sm">
                          <Trophy className="w-4 h-4 text-amber-500" />
                          <span>المتصدرون حالياً</span>
                        </div>
                        <button
                          onClick={() => setCurrentTab('leaderboard')}
                          className="text-xs text-indigo-600 font-black hover:underline"
                        >
                          عرض الكل
                        </button>
                      </div>

                      {childrenList.length === 0 ? (
                        <p className="text-xs text-slate-400 py-6 text-center">لا يوجد أطفال بعد</p>
                      ) : (
                        <div className="space-y-2">
                          {[...childrenList]
                            .sort((a, b) => b.totalPoints - a.totalPoints)
                            .slice(0, 4)
                            .map((c, i) => (
                              <div
                                key={c.id}
                                onClick={() => setSelectedChild(c)}
                                className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 cursor-pointer transition border border-transparent hover:border-slate-100"
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-800 text-xs font-black flex items-center justify-center">
                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                                  </span>
                                  <span className="font-bold text-sm text-slate-800">{c.name}</span>
                                </div>
                                <span className="font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl text-xs">
                                  {c.totalPoints} نقطة
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setShowTop10Modal(true)}
                      className="mt-4 w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition active:scale-95"
                    >
                      <Award className="w-4 h-4 text-amber-600" />
                      <span>تصدير صورة أفضل 10</span>
                    </button>
                  </div>
                </div>

                {/* Shortcuts Grid */}
                <div className="pt-2">
                  <h3 className="text-xs font-bold text-slate-400 mb-3">اختصارات سريعة</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button
                      onClick={() => setCurrentTab('addScore')}
                      className="p-3.5 bg-white hover:bg-amber-50/50 rounded-2xl border border-slate-200 text-right transition flex items-center gap-3"
                    >
                      <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                        <PlusCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-slate-800">إضافة نقاط</div>
                        <div className="text-[11px] text-slate-400">تسجيل نقاط جديدة</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setCurrentTab('children')}
                      className="p-3.5 bg-white hover:bg-amber-50/50 rounded-2xl border border-slate-200 text-right transition flex items-center gap-3"
                    >
                      <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-slate-800">الأطفال</div>
                        <div className="text-[11px] text-slate-400">قائمة الفصل والتعديل</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setCurrentTab('leaderboard')}
                      className="p-3.5 bg-white hover:bg-amber-50/50 rounded-2xl border border-slate-200 text-right transition flex items-center gap-3"
                    >
                      <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-slate-800">لوحة المتصدرين</div>
                        <div className="text-[11px] text-slate-400">ترتيب الفصل الكلي</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setCurrentTab('history')}
                      className="p-3.5 bg-white hover:bg-amber-50/50 rounded-2xl border border-slate-200 text-right transition flex items-center gap-3"
                    >
                      <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                        <History className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-slate-800">سجل النقاط</div>
                        <div className="text-[11px] text-slate-400">سجلات الجمعات السابقة</div>
                      </div>
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* Tab: Add Points / إضافة نقاط */}
            {currentTab === 'addScore' && (
              <div className="space-y-6">
                <QuickScoreForm
                  childrenList={childrenList}
                  fridays={fridays}
                  onScoreAdded={() => {
                    // Optional redirect or stay
                  }}
                />
              </div>
            )}

            {/* Tab: Children / الأطفال */}
            {currentTab === 'children' && (
              <ChildrenManagementScreen
                childrenList={childrenList}
                onSelectChild={(child) => setSelectedChild(child)}
              />
            )}

            {/* Tab: Leaderboard / لوحة المتصدرين */}
            {currentTab === 'leaderboard' && (
              <LeaderboardScreen
                childrenList={childrenList}
                onOpenTop10={() => setShowTop10Modal(true)}
                onSelectChild={(child) => setSelectedChild(child)}
              />
            )}

            {/* Tab: History / سجل النقاط */}
            {currentTab === 'history' && (
              <WeeklyHistoryScreen
                fridays={fridays}
                childrenList={childrenList}
                onSelectChild={(child) => setSelectedChild(child)}
              />
            )}
          </>
        )}

      </main>

      {/* Bottom Navigation Bar (Mandatory RTL friendly) */}
      <nav 
        id="bottom-navigation-bar" 
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg"
      >
        <div className="max-w-md mx-auto grid grid-cols-5 h-16 px-1">
          <button
            onClick={() => {
              setSelectedChild(null);
              setCurrentTab('dashboard');
            }}
            className={`flex flex-col items-center justify-center gap-1 transition ${
              currentTab === 'dashboard' && !selectedChild
                ? 'text-indigo-600 font-black'
                : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[11px]">الرئيسية</span>
          </button>

          <button
            onClick={() => {
              setSelectedChild(null);
              setCurrentTab('addScore');
            }}
            className={`flex flex-col items-center justify-center gap-1 transition ${
              currentTab === 'addScore' && !selectedChild
                ? 'text-indigo-600 font-black'
                : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            <span className="text-[11px]">إضافة نقاط</span>
          </button>

          <button
            onClick={() => {
              setSelectedChild(null);
              setCurrentTab('children');
            }}
            className={`flex flex-col items-center justify-center gap-1 transition ${
              currentTab === 'children' && !selectedChild
                ? 'text-indigo-600 font-black'
                : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[11px]">الأطفال</span>
          </button>

          <button
            onClick={() => {
              setSelectedChild(null);
              setCurrentTab('leaderboard');
            }}
            className={`flex flex-col items-center justify-center gap-1 transition ${
              currentTab === 'leaderboard' && !selectedChild
                ? 'text-indigo-600 font-black'
                : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <Trophy className="w-5 h-5" />
            <span className="text-[11px]">المتصدرين</span>
          </button>

          <button
            onClick={() => {
              setSelectedChild(null);
              setCurrentTab('history');
            }}
            className={`flex flex-col items-center justify-center gap-1 transition ${
              currentTab === 'history' && !selectedChild
                ? 'text-indigo-600 font-black'
                : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <History className="w-5 h-5" />
            <span className="text-[11px]">السجل</span>
          </button>
        </div>
      </nav>

      {/* Top 10 Shareable Modal */}
      <Top10Modal
        isOpen={showTop10Modal}
        onClose={() => setShowTop10Modal(false)}
        childrenList={childrenList}
        weekLabel={currentFriday.label}
      />

      {/* Admin Leaders Modal */}
      <AdminLeadersModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
      />

    </div>
  );
}
