import React, { useState, useMemo } from 'react';
import { Child, FridayWeek } from '../types';
import { addBatchScoresForChild } from '../services/childrenService';
import { useAuth } from '../context/AuthContext';
import { 
  PlusCircle, 
  CheckCircle2, 
  Search, 
  Church, 
  UserCheck, 
  Sparkles, 
  AlertCircle, 
  Calendar, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw,
  Zap,
  Check,
  ArrowUpDown,
  User,
  X,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuickScoreFormProps {
  childrenList: Child[];
  fridays: FridayWeek[];
  initialSelectedChildId?: string;
  onScoreAdded?: () => void;
}

export const QuickScoreForm: React.FC<QuickScoreFormProps> = ({
  childrenList,
  fridays,
  initialSelectedChildId = '',
  onScoreAdded
}) => {
  const { leaderProfile } = useAuth();
  
  // Friday navigation (0 is current Friday, 1 is previous, etc.)
  const [fridayIndex, setFridayIndex] = useState<number>(0);
  const [selectedChildId, setSelectedChildId] = useState<string>(initialSelectedChildId);
  
  // 3 Points text boxes for the selected child
  const [liturgyPoints, setLiturgyPoints] = useState<number>(0);
  const [attendancePoints, setAttendancePoints] = useState<number>(0);
  const [participationPoints, setParticipationPoints] = useState<number>(0);

  // Sorting and Filtering
  const [sortBy, setSortBy] = useState<'name' | 'points'>('name');
  const [childSearch, setChildSearch] = useState<string>('');
  const [genderSection, setGenderSection] = useState<'all' | 'boys' | 'girls'>('all');

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scoredChildIds, setScoredChildIds] = useState<string[]>([]);

  const currentFriday = fridays[fridayIndex] || fridays[0];
  const isPastFriday = fridayIndex > 0;
  const canGoNext = fridayIndex > 0; // going towards current (index 0)
  const canGoPrev = fridayIndex < fridays.length - 1; // going towards older past Friday

  const handlePrevFriday = () => {
    if (canGoPrev) setFridayIndex(prev => prev + 1);
  };

  const handleNextFriday = () => {
    if (canGoNext) setFridayIndex(prev => prev - 1);
  };

  const handleResetToCurrent = () => {
    setFridayIndex(0);
  };

  // Sort and filter children
  const sortedAndFilteredChildren = useMemo(() => {
    const list = [...childrenList].filter(c => 
      c.name.toLowerCase().includes(childSearch.toLowerCase())
    );

    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    } else {
      list.sort((a, b) => b.totalPoints - a.totalPoints);
    }
    return list;
  }, [childrenList, childSearch, sortBy]);

  const boysList = useMemo(() => {
    return sortedAndFilteredChildren.filter(c => (c.gender || 'boy') === 'boy');
  }, [sortedAndFilteredChildren]);

  const girlsList = useMemo(() => {
    return sortedAndFilteredChildren.filter(c => c.gender === 'girl');
  }, [sortedAndFilteredChildren]);

  const selectedChild = childrenList.find(c => c.id === selectedChildId);
  const totalPointsToAdd = (liturgyPoints || 0) + (attendancePoints || 0) + (participationPoints || 0);

  // Handle clicking on a child:
  // - If saved or empty: one click opens, another click closes.
  // - If unsaved points are entered: warns user to save first before closing or switching!
  const handleSelectChild = (child: Child) => {
    // If clicking on the currently open child
    if (selectedChildId === child.id) {
      if (totalPointsToAdd > 0) {
        setErrorMessage(`⚠️ لم يتم حفظ النقاط بعد! يرجى حفظ النقاط أولاً للطفل «${child.name}» (${totalPointsToAdd} نقطة مكتوبة) أو تصفير الخانات قبل الإغلاق.`);
        return;
      }
      // If no points or already saved, close the child section
      setSelectedChildId('');
      setErrorMessage(null);
      return;
    }

    // If clicking on another child while having unsaved points on the current child
    if (selectedChildId && totalPointsToAdd > 0 && selectedChild) {
      setErrorMessage(`⚠️ يرجى حفظ نقاط «${selectedChild.name}» أولاً (${totalPointsToAdd} نقطة غير محفوظة) أو تصفير الخانات قبل الانتقال لطفل آخر.`);
      return;
    }

    // Open the clicked child
    setSelectedChildId(child.id);
    setLiturgyPoints(0);
    setAttendancePoints(0);
    setParticipationPoints(0);
    setErrorMessage(null);
  };

  const handleCloseSection = () => {
    if (totalPointsToAdd > 0 && selectedChild) {
      setErrorMessage(`⚠️ لم يتم حفظ النقاط بعد! يرجى حفظ النقاط أولاً للطفل «${selectedChild.name}» (${totalPointsToAdd} نقطة مكتوبة) أو تصفير الخانات قبل الإغلاق.`);
      return;
    }
    setSelectedChildId('');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChildId || !selectedChild) {
      setErrorMessage('من فضلك اضغط على اسم طفل أولاً');
      return;
    }

    if (totalPointsToAdd <= 0) {
      setErrorMessage('من فضلك أدخل درجات في خانة واحدة على الأقل (القداس، الحضور، أو المشاركة)');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const scoresToRecord: Array<{ category: 'liturgy' | 'attendance' | 'participation'; points: number }> = [];
      if (liturgyPoints > 0) scoresToRecord.push({ category: 'liturgy', points: liturgyPoints });
      if (attendancePoints > 0) scoresToRecord.push({ category: 'attendance', points: attendancePoints });
      if (participationPoints > 0) scoresToRecord.push({ category: 'participation', points: participationPoints });

      await addBatchScoresForChild({
        childId: selectedChild.id,
        childName: selectedChild.name,
        scores: scoresToRecord,
        weekId: currentFriday.id,
        weekDate: currentFriday.label,
        leaderId: leaderProfile?.uid || 'guest-leader',
        leaderName: leaderProfile?.displayName || 'خادم الفصل'
      });

      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 }
      });

      // Track child as scored this session
      setScoredChildIds(prev => Array.from(new Set([...prev, selectedChild.id])));

      const details = [
        liturgyPoints > 0 ? `قداس: ${liturgyPoints}` : null,
        attendancePoints > 0 ? `حضور: ${attendancePoints}` : null,
        participationPoints > 0 ? `مشاركة: ${participationPoints}` : null
      ].filter(Boolean).join(' • ');

      setSuccessMessage(
        `تم حفظ +${totalPointsToAdd} نقطة للطفل «${selectedChild.name}» عن ${currentFriday.label} بنجاح! (${details})`
      );

      // Reset inputs for convenience
      setLiturgyPoints(0);
      setAttendancePoints(0);
      setParticipationPoints(0);

      onScoreAdded?.();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error('Failed to add batch scores:', err);
      setErrorMessage(err?.message || 'حدث خطأ أثناء حفظ النقاط، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="quick-score-container" className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
      
      {/* 1. Interactive Friday Navigator Header with Arrows */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-slate-50 to-indigo-50/60 border border-indigo-100/80 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          
          {/* Arrow to Next Friday (towards current) */}
          <button
            type="button"
            onClick={handleNextFriday}
            disabled={!canGoNext}
            title="الجمعة الأحدث"
            className="min-h-[44px] px-3.5 sm:px-4 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1.5 font-bold text-xs sm:text-sm active:scale-95 shadow-2xs"
          >
            <ChevronRight className="w-4 h-4" />
            <span className="hidden sm:inline">الأحدث</span>
          </button>

          {/* Central Active Friday Indicator */}
          <div className="flex-1 text-center px-2">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span className={`text-[11px] font-black uppercase tracking-wider ${isPastFriday ? 'text-amber-700' : 'text-indigo-700'}`}>
                {isPastFriday ? `جمعة سابقة (${fridayIndex})` : '⭐ الجمعة الحالية'}
              </span>
            </div>
            <div className="text-base sm:text-lg font-black text-slate-800">
              {currentFriday.label}
            </div>
          </div>

          {/* Arrow to Past Friday (older) */}
          <button
            type="button"
            onClick={handlePrevFriday}
            disabled={!canGoPrev}
            title="الجمعة السابقة الفائتة"
            className="min-h-[44px] px-3.5 sm:px-4 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1.5 font-bold text-xs sm:text-sm active:scale-95 shadow-2xs"
          >
            <span className="hidden sm:inline">جمعة سابقة</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Quick jump if in past */}
        {isPastFriday && (
          <div className="mt-3 pt-2.5 border-t border-indigo-100/60 flex items-center justify-between text-xs">
            <span className="font-bold text-amber-800 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              تسجيل درجات بأثر رجعي
            </span>
            <button
              type="button"
              onClick={handleResetToCurrent}
              className="font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>العودة للجمعة الحالية</span>
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-3 animate-fadeIn shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="flex-1">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 text-rose-900 border border-rose-200 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-3 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
        </div>
      )}

      {/* 2. Step 1: Sorted Children Selection List */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-black">1</span>
            <h3 className="text-sm font-black text-slate-800">
              اضغط على اسم الطفل لرصد النقاط:
            </h3>
            <span className="text-xs font-bold text-slate-400">
              ({sortedAndFilteredChildren.length} طفل)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Gender Section Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-black">
              <button
                type="button"
                onClick={() => setGenderSection('all')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  genderSection === 'all'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الكل (مفصولين)
              </button>
              <button
                type="button"
                onClick={() => setGenderSection('boys')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                  genderSection === 'boys'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>👦</span>
                <span>البنين ({boysList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setGenderSection('girls')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                  genderSection === 'girls'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>👧</span>
                <span>البنات ({girlsList.length})</span>
              </button>
            </div>

            {/* Sorting Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSortBy('name')}
                title="ترتيب أبجدي"
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition flex items-center gap-1 ${
                  sortBy === 'name' 
                    ? 'bg-white text-indigo-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpDown className="w-3 h-3" />
                <span>أبجدياً</span>
              </button>
              <button
                type="button"
                onClick={() => setSortBy('points')}
                title="ترتيب حسب النقاط"
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition flex items-center gap-1 ${
                  sortBy === 'points' 
                    ? 'bg-white text-indigo-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Award className="w-3 h-3" />
                <span>النقاط</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Field */}
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
          <input
            id="search-child-input"
            type="text"
            placeholder="ابحث بالاسم لتصفية الأطفال سريعاً..."
            value={childSearch}
            onChange={(e) => setChildSearch(e.target.value)}
            className="w-full min-h-[44px] pr-10 pl-3 py-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 font-semibold transition"
          />
        </div>

        {/* Distinct Sections for Boys and Girls */}
        {sortedAndFilteredChildren.length === 0 ? (
          <div className="py-8 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
            لا توجد أسماء مطابقة لبحثك
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Section 1: Boys / قسم البنين */}
            {(genderSection === 'all' || genderSection === 'boys') && (
              <div className="p-3 bg-sky-50/40 rounded-2xl border border-sky-100 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center text-sm font-black">
                      👦
                    </div>
                    <h4 className="text-xs sm:text-sm font-black text-sky-950">
                      قسم الأولاد (البنين)
                    </h4>
                  </div>
                  <span className="text-[11px] font-extrabold text-sky-700 bg-white px-2 py-0.5 rounded-md border border-sky-200">
                    {boysList.length} ولد
                  </span>
                </div>

                {boysList.length === 0 ? (
                  <div className="py-4 text-center text-xs font-bold text-slate-400">
                    لا يوجد أولاد في نتائج البحث
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-52 overflow-y-auto p-1">
                    {boysList.map((child) => {
                      const isSelected = selectedChildId === child.id;
                      const hasBeenScored = scoredChildIds.includes(child.id);

                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => handleSelectChild(child)}
                          className={`p-2.5 rounded-xl border text-right transition flex flex-col justify-between gap-1 relative active:scale-95 text-xs ${
                            isSelected
                              ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/20 ring-2 ring-sky-500/30'
                              : 'bg-white text-slate-800 border-slate-200 hover:border-sky-400 hover:bg-sky-50/60 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className={`font-black truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                              👦 {child.name}
                            </span>
                            {hasBeenScored ? (
                              <span className={`text-[9px] px-1 py-0.5 rounded-md font-bold flex items-center gap-0.5 shrink-0 ${
                                isSelected ? 'bg-sky-700 text-white' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                <Check className="w-2.5 h-2.5" />
                                <span>تم</span>
                              </span>
                            ) : isSelected ? (
                              <span className="text-[9px] px-1 py-0.5 rounded-md font-bold bg-sky-700 text-sky-100 flex items-center gap-0.5 shrink-0">
                                <X className="w-2.5 h-2.5" />
                                <span>إغلاق</span>
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-bold mt-0.5">
                            <span className={isSelected ? 'text-sky-100' : 'text-slate-400'}>
                              {isSelected ? 'اضغط للإغلاق' : 'المجموع:'}
                            </span>
                            <span className={`font-black ${isSelected ? 'text-white' : 'text-sky-700'}`}>
                              {child.totalPoints} نقطة
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Section 2: Girls / قسم البنات */}
            {(genderSection === 'all' || genderSection === 'girls') && (
              <div className="p-3 bg-rose-50/40 rounded-2xl border border-rose-100 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center text-sm font-black">
                      👧
                    </div>
                    <h4 className="text-xs sm:text-sm font-black text-rose-950">
                      قسم البنات
                    </h4>
                  </div>
                  <span className="text-[11px] font-extrabold text-rose-700 bg-white px-2 py-0.5 rounded-md border border-rose-200">
                    {girlsList.length} بنت
                  </span>
                </div>

                {girlsList.length === 0 ? (
                  <div className="py-4 text-center text-xs font-bold text-slate-400">
                    لا توجد بنات في نتائج البحث
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-52 overflow-y-auto p-1">
                    {girlsList.map((child) => {
                      const isSelected = selectedChildId === child.id;
                      const hasBeenScored = scoredChildIds.includes(child.id);

                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => handleSelectChild(child)}
                          className={`p-2.5 rounded-xl border text-right transition flex flex-col justify-between gap-1 relative active:scale-95 text-xs ${
                            isSelected
                              ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20 ring-2 ring-rose-500/30'
                              : 'bg-white text-slate-800 border-slate-200 hover:border-rose-400 hover:bg-rose-50/60 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className={`font-black truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                              👧 {child.name}
                            </span>
                            {hasBeenScored ? (
                              <span className={`text-[9px] px-1 py-0.5 rounded-md font-bold flex items-center gap-0.5 shrink-0 ${
                                isSelected ? 'bg-rose-700 text-white' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                <Check className="w-2.5 h-2.5" />
                                <span>تم</span>
                              </span>
                            ) : isSelected ? (
                              <span className="text-[9px] px-1 py-0.5 rounded-md font-bold bg-rose-700 text-rose-100 flex items-center gap-0.5 shrink-0">
                                <X className="w-2.5 h-2.5" />
                                <span>إغلاق</span>
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-bold mt-0.5">
                            <span className={isSelected ? 'text-rose-100' : 'text-slate-400'}>
                              {isSelected ? 'اضغط للإغلاق' : 'المجموع:'}
                            </span>
                            <span className={`font-black ${isSelected ? 'text-white' : 'text-rose-700'}`}>
                              {child.totalPoints} نقطة
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>

      {/* 3. Step 2: 3 Text Boxes for القداس, الحضور, and المشاركة */}
      {selectedChild ? (
        <form 
          onSubmit={handleSubmit} 
          className={`p-5 sm:p-6 rounded-3xl border-2 shadow-lg space-y-5 animate-fadeIn ${
            selectedChild.gender === 'girl'
              ? 'bg-gradient-to-br from-rose-50/40 via-white to-slate-50 border-rose-200'
              : 'bg-gradient-to-br from-sky-50/40 via-white to-slate-50 border-sky-200'
          }`}
        >
          
          {/* Focused Child Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl text-white font-black text-xl flex items-center justify-center shadow-md ${
                selectedChild.gender === 'girl'
                  ? 'bg-rose-500 shadow-rose-500/25'
                  : 'bg-sky-600 shadow-sky-600/25'
              }`}>
                {selectedChild.gender === 'girl' ? '👧' : '👦'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                    selectedChild.gender === 'girl'
                      ? 'text-rose-700 bg-rose-50 border-rose-200'
                      : 'text-sky-700 bg-sky-50 border-sky-200'
                  }`}>
                    {selectedChild.gender === 'girl' ? 'رصد درجات (بنت)' : 'رصد درجات (ولد)'}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">
                    {currentFriday.label}
                  </span>
                </div>
                <h4 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                  {selectedChild.name}
                </h4>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCloseSection}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              title="إغلاق رصد درجات الطفل"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Unsaved points notification banner */}
          {totalPointsToAdd > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-bold animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>لديك {totalPointsToAdd} نقطة مكتوبة غير محفوظة بعد. يرجى الضغط على «حفظ النقاط».</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLiturgyPoints(0);
                  setAttendancePoints(0);
                  setParticipationPoints(0);
                  setSelectedChildId('');
                  setErrorMessage(null);
                }}
                className="text-[11px] text-amber-700 hover:text-rose-600 underline font-bold px-1 whitespace-nowrap self-end sm:self-auto"
              >
                تجاهل وإغلاق الخانات
              </button>
            </div>
          )}

          <p className="text-xs font-bold text-slate-600">
            أدخل أي نقاط تريدها في الخانات الثلاث (القداس، الحضور، والمشاركة) ثم اضغط حفظ النقاط:
          </p>

          {/* 3 Text Boxes Grid - Clean and Minimal without (+5, +10, +15) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* 1. صندوق القداس */}
            <div className="bg-white p-4 rounded-2xl border-2 border-amber-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-800 font-black text-sm">
                  <Church className="w-4 h-4 text-amber-600" />
                  <span>القداس</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {liturgyPoints > 0 && (
                    <button
                      type="button"
                      onClick={() => setLiturgyPoints(0)}
                      className="text-[10px] text-slate-400 hover:text-rose-600 font-bold px-1"
                      title="مسح"
                    >
                      مسح
                    </button>
                  )}
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Liturgy
                  </span>
                </div>
              </div>

              <div className="relative">
                <input
                  id="liturgy-points-input"
                  type="number"
                  min="0"
                  max="200"
                  value={liturgyPoints === 0 ? '' : liturgyPoints}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                    setLiturgyPoints(val);
                    setErrorMessage(null);
                  }}
                  placeholder="0"
                  className="w-full min-h-[54px] px-3 py-2 text-center text-2xl font-black text-amber-950 bg-amber-50/40 border border-amber-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
                <span className="absolute left-3 top-4 text-xs font-bold text-amber-600 pointer-events-none">
                  نقطة
                </span>
              </div>
            </div>

            {/* 2. صندوق الحضور */}
            <div className="bg-white p-4 rounded-2xl border-2 border-blue-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-blue-800 font-black text-sm">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>الحضور</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {attendancePoints > 0 && (
                    <button
                      type="button"
                      onClick={() => setAttendancePoints(0)}
                      className="text-[10px] text-slate-400 hover:text-rose-600 font-bold px-1"
                      title="مسح"
                    >
                      مسح
                    </button>
                  )}
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    Attendance
                  </span>
                </div>
              </div>

              <div className="relative">
                <input
                  id="attendance-points-input"
                  type="number"
                  min="0"
                  max="200"
                  value={attendancePoints === 0 ? '' : attendancePoints}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                    setAttendancePoints(val);
                    setErrorMessage(null);
                  }}
                  placeholder="0"
                  className="w-full min-h-[54px] px-3 py-2 text-center text-2xl font-black text-blue-950 bg-blue-50/40 border border-blue-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute left-3 top-4 text-xs font-bold text-blue-600 pointer-events-none">
                  نقطة
                </span>
              </div>
            </div>

            {/* 3. صندوق المشاركة */}
            <div className="bg-white p-4 rounded-2xl border-2 border-emerald-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-800 font-black text-sm">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>المشاركة</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {participationPoints > 0 && (
                    <button
                      type="button"
                      onClick={() => setParticipationPoints(0)}
                      className="text-[10px] text-slate-400 hover:text-rose-600 font-bold px-1"
                      title="مسح"
                    >
                      مسح
                    </button>
                  )}
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Participation
                  </span>
                </div>
              </div>

              <div className="relative">
                <input
                  id="participation-points-input"
                  type="number"
                  min="0"
                  max="200"
                  value={participationPoints === 0 ? '' : participationPoints}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                    setParticipationPoints(val);
                    setErrorMessage(null);
                  }}
                  placeholder="0"
                  className="w-full min-h-[54px] px-3 py-2 text-center text-2xl font-black text-emerald-950 bg-emerald-50/40 border border-emerald-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute left-3 top-4 text-xs font-bold text-emerald-600 pointer-events-none">
                  نقطة
                </span>
              </div>
            </div>

          </div>

          {/* Real-time Summary Pill & Submit Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">إجمالي النقاط الجديدة:</span>
              <span className="text-base font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl">
                +{totalPointsToAdd} نقطة
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setLiturgyPoints(0);
                  setAttendancePoints(0);
                  setParticipationPoints(0);
                }}
                className="min-h-[48px] px-4 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
              >
                تصفير الخانات
              </button>

              <button
                id="submit-points-btn"
                type="submit"
                disabled={isSubmitting || totalPointsToAdd <= 0}
                className={`min-h-[52px] px-6 rounded-2xl text-sm font-black text-white active:scale-95 transition shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  selectedChild.gender === 'girl'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25'
                }`}
              >
                <PlusCircle className="w-5 h-5 shrink-0" />
                <span>
                  {isSubmitting 
                    ? 'جاري حفظ النقاط...' 
                    : `حفظ النقاط لـ ${selectedChild.name}`}
                </span>
              </button>
            </div>
          </div>

        </form>
      ) : (
        <div className="p-6 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
          <p className="text-sm font-black text-slate-700 mb-1">
            👆 اضغط على أي طفل من القائمة أعلاه
          </p>
          <p className="text-xs text-slate-400 font-medium">
            ستظهر لك مباشرة الخانات الثلاث للقداس والحضور والمشاركة لكتابة الدرجات وحفظها بلمسة واحدة
          </p>
        </div>
      )}

    </div>
  );
};
