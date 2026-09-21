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
  Award,
  List,
  LayoutGrid,
  Filter,
  Plus
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
  
  // Selected child for the Pop-up tab modal
  const [selectedChildId, setSelectedChildId] = useState<string>(initialSelectedChildId);
  
  // 3 Points text boxes for the selected child inside the pop-up modal
  const [liturgyPoints, setLiturgyPoints] = useState<number>(0);
  const [attendancePoints, setAttendancePoints] = useState<number>(0);
  const [participationPoints, setParticipationPoints] = useState<number>(0);

  // Sorting, Filtering & View Mode for mobile/desktop
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'points'>('name');
  const [childSearch, setChildSearch] = useState<string>('');
  const [genderSection, setGenderSection] = useState<'all' | 'boys' | 'girls'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unscored' | 'scored'>('all');

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null);
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

  // Check if a child has been scored this session or on the current Friday
  const isChildScored = (childId: string) => {
    return scoredChildIds.includes(childId);
  };

  // Sort and filter children
  const sortedAndFilteredChildren = useMemo(() => {
    let list = [...childrenList].filter(c => 
      c.name.toLowerCase().includes(childSearch.trim().toLowerCase())
    );

    // Gender filter
    if (genderSection === 'boys') {
      list = list.filter(c => (c.gender || 'boy') === 'boy');
    } else if (genderSection === 'girls') {
      list = list.filter(c => c.gender === 'girl');
    }

    // Status filter
    if (statusFilter === 'unscored') {
      list = list.filter(c => !isChildScored(c.id));
    } else if (statusFilter === 'scored') {
      list = list.filter(c => isChildScored(c.id));
    }

    // Sorting
    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    } else {
      list.sort((a, b) => b.totalPoints - a.totalPoints);
    }
    return list;
  }, [childrenList, childSearch, genderSection, statusFilter, sortBy, scoredChildIds]);

  const boysList = useMemo(() => {
    return sortedAndFilteredChildren.filter(c => (c.gender || 'boy') === 'boy');
  }, [sortedAndFilteredChildren]);

  const girlsList = useMemo(() => {
    return sortedAndFilteredChildren.filter(c => c.gender === 'girl');
  }, [sortedAndFilteredChildren]);

  const selectedChild = childrenList.find(c => c.id === selectedChildId);
  const totalPointsToAdd = (liturgyPoints || 0) + (attendancePoints || 0) + (participationPoints || 0);

  // Open the pop-up modal for a specific child
  const handleOpenScoreModal = (child: Child) => {
    setSelectedChildId(child.id);
    setLiturgyPoints(0);
    setAttendancePoints(0);
    setParticipationPoints(0);
    setErrorMessage(null);
    setModalErrorMessage(null);
  };

  // Close the modal cleanly
  const handleCloseModal = () => {
    if (totalPointsToAdd > 0 && selectedChild) {
      const confirmClose = window.confirm(
        `لديك ${totalPointsToAdd} نقطة مكتوبة غير محفوظة للطفل «${selectedChild.name}». هل أنت متأكد من الإغلاق دون حفظ؟`
      );
      if (!confirmClose) return;
    }
    setSelectedChildId('');
    setLiturgyPoints(0);
    setAttendancePoints(0);
    setParticipationPoints(0);
    setModalErrorMessage(null);
  };

  // Submit points for current selected child
  const handleSavePoints = async (andNext: boolean = false) => {
    if (!selectedChildId || !selectedChild) {
      setModalErrorMessage('من فضلك اختر طفلاً لرصد النقاط');
      return;
    }

    if (totalPointsToAdd <= 0) {
      setModalErrorMessage('من فضلك أدخل درجات في خانة واحدة على الأقل (القداس، الحضور، أو المشاركة)');
      return;
    }

    setIsSubmitting(true);
    setModalErrorMessage(null);
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
        particleCount: 45,
        spread: 60,
        origin: { y: 0.6 }
      });

      // Mark child as scored
      const newScoredIds = Array.from(new Set([...scoredChildIds, selectedChild.id]));
      setScoredChildIds(newScoredIds);

      const details = [
        liturgyPoints > 0 ? `قداس: ${liturgyPoints}` : null,
        attendancePoints > 0 ? `حضور: ${attendancePoints}` : null,
        participationPoints > 0 ? `مشاركة: ${participationPoints}` : null
      ].filter(Boolean).join(' • ');

      setSuccessMessage(
        `تم حفظ +${totalPointsToAdd} نقطة للطفل «${selectedChild.name}» عن ${currentFriday.label} بنجاح! (${details})`
      );

      onScoreAdded?.();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);

      // Reset values
      setLiturgyPoints(0);
      setAttendancePoints(0);
      setParticipationPoints(0);

      if (andNext) {
        // Find next unscored child in current list
        const currentIndex = sortedAndFilteredChildren.findIndex(c => c.id === selectedChild.id);
        const nextChild = sortedAndFilteredChildren.slice(currentIndex + 1).find(c => !newScoredIds.includes(c.id))
          || sortedAndFilteredChildren.find(c => !newScoredIds.includes(c.id) && c.id !== selectedChild.id);

        if (nextChild) {
          setSelectedChildId(nextChild.id);
        } else {
          // All scored! Close modal
          setSelectedChildId('');
        }
      } else {
        setSelectedChildId('');
      }
    } catch (err: any) {
      console.error('Failed to add batch scores:', err);
      setModalErrorMessage(err?.message || 'حدث خطأ أثناء حفظ النقاط، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Progress calculations
  const totalChildrenCount = childrenList.length;
  const scoredCount = scoredChildIds.length;
  const progressPercent = totalChildrenCount > 0 ? Math.round((scoredCount / totalChildrenCount) * 100) : 0;

  return (
    <div id="quick-score-container" className="space-y-4 sm:space-y-6">
      
      {/* 1. Interactive Friday Navigator Header with Arrows */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          
          {/* Arrow to Next Friday (towards current) */}
          <button
            type="button"
            onClick={handleNextFriday}
            disabled={!canGoNext}
            title="الجمعة الأحدث"
            className="min-h-[44px] px-3 sm:px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/50 hover:border-indigo-300 disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1.5 font-bold text-xs sm:text-sm active:scale-95 shadow-2xs shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
            <span className="hidden sm:inline">الأحدث</span>
          </button>

          {/* Central Active Friday Indicator */}
          <div className="flex-1 text-center px-2 min-w-0">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className={`text-[11px] font-black uppercase tracking-wider ${isPastFriday ? 'text-amber-700' : 'text-indigo-700'}`}>
                {isPastFriday ? `جمعة سابقة (${fridayIndex})` : '⭐ الجمعة الحالية'}
              </span>
            </div>
            <div className="text-sm sm:text-lg font-black text-slate-800 truncate">
              {currentFriday.label}
            </div>
          </div>

          {/* Arrow to Past Friday (older) */}
          <button
            type="button"
            onClick={handlePrevFriday}
            disabled={!canGoPrev}
            title="الجمعة السابقة الفائتة"
            className="min-h-[44px] px-3 sm:px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/50 hover:border-indigo-300 disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1.5 font-bold text-xs sm:text-sm active:scale-95 shadow-2xs shrink-0"
          >
            <span className="hidden sm:inline">جمعة سابقة</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Quick jump if in past */}
        {isPastFriday && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
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

        {/* Scoring progress banner */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-600 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">
              تم رصد <strong className="text-indigo-600">{scoredCount}</strong> من <strong className="text-slate-800">{totalChildrenCount}</strong> طفلاً اليوم
            </span>
          </div>
          <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full shrink-0">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 sm:p-4 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-3 animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="flex-1">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 sm:p-4 bg-rose-50 text-rose-900 border border-rose-200 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
        </div>
      )}

      {/* 2. Main Children Listing Container */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-sm space-y-3.5">
        
        {/* Title & Instructions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-black shrink-0">
                1
              </span>
              <span>اختر طفلاً لإضافة النقاط في نافذة منبثقة سريعة:</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5 mr-8">
              اضغط على أي اسم طفل وسيظهر لك تبويب فوري لإدخال درجات القداس والحضور والمشاركة دون الحاجة للنزول لأسفل الشاشة.
            </p>
          </div>

          {/* View Mode Toggle: List vs Grid */}
          <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="عرض قائمة (مثالي للموبايل)"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>قائمة</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="عرض بطاقات شبكية"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>شبكة</span>
            </button>
          </div>
        </div>

        {/* Search Field with Instant Clear Button */}
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" />
          <input
            id="search-child-input"
            type="text"
            placeholder="ابحث بالاسم لتصفية الأطفال فوراً..."
            value={childSearch}
            onChange={(e) => setChildSearch(e.target.value)}
            className="w-full min-h-[46px] pr-10 pl-9 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 font-semibold transition"
          />
          {childSearch && (
            <button
              type="button"
              onClick={() => setChildSearch('')}
              className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 p-1"
              title="مسح البحث"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Badges & Sort Bar (Optimized for thumb tapping on mobile) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
          
          {/* Gender Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-black overflow-x-auto">
            <button
              type="button"
              onClick={() => setGenderSection('all')}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                genderSection === 'all'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({childrenList.length})
            </button>
            <button
              type="button"
              onClick={() => setGenderSection('boys')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 whitespace-nowrap ${
                genderSection === 'boys'
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>👦</span>
              <span>البنين ({childrenList.filter(c => (c.gender || 'boy') === 'boy').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setGenderSection('girls')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 whitespace-nowrap ${
                genderSection === 'girls'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>👧</span>
              <span>البنات ({childrenList.filter(c => c.gender === 'girl').length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-black">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-1 rounded-lg transition ${
                  statusFilter === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                الجميع
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('unscored')}
                className={`px-2 py-1 rounded-lg transition ${
                  statusFilter === 'unscored' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                لم يُرصد ⏳
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('scored')}
                className={`px-2 py-1 rounded-lg transition ${
                  statusFilter === 'scored' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                تم ✅
              </button>
            </div>

            {/* Sorting Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSortBy(sortBy === 'name' ? 'points' : 'name')}
                title="تغيير الترتيب"
                className="px-2.5 py-1 rounded-lg text-xs font-black bg-white text-indigo-700 shadow-xs flex items-center gap-1"
              >
                <ArrowUpDown className="w-3 h-3" />
                <span>{sortBy === 'name' ? 'أبجدياً' : 'بالنقاط'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* 3. The Children List (Optimized for Mobile) */}
        {sortedAndFilteredChildren.length === 0 ? (
          <div className="py-12 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
            لا توجد أسماء مطابقة لخيارات التصفية الحالية
          </div>
        ) : viewMode === 'list' ? (
          /* ========================================================== */
          /* MOBILE-FIRST LIST VIEW: Large touch rows, clear names, icons */
          /* ========================================================== */
          <div className="space-y-2 pt-1">
            {sortedAndFilteredChildren.map((child) => {
              const isScored = isChildScored(child.id);
              const isGirl = child.gender === 'girl';

              return (
                <div
                  key={child.id}
                  onClick={() => handleOpenScoreModal(child)}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer select-none active:scale-[0.99] ${
                    isScored
                      ? 'bg-emerald-50/40 border-emerald-200/80 hover:bg-emerald-50'
                      : isGirl
                      ? 'bg-white hover:bg-rose-50/40 border-slate-200 hover:border-rose-300'
                      : 'bg-white hover:bg-sky-50/40 border-slate-200 hover:border-sky-300'
                  }`}
                >
                  {/* Right side: Avatar and Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-lg sm:text-xl font-bold shrink-0 shadow-2xs ${
                      isGirl ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'
                    }`}>
                      {isGirl ? '👧' : '👦'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-sm sm:text-base text-slate-900 truncate">
                        {child.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isGirl ? 'bg-rose-50 text-rose-700' : 'bg-sky-50 text-sky-700'
                        }`}>
                          {isGirl ? 'بنت' : 'ولد'}
                        </span>
                        {isScored ? (
                          <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" />
                            <span>تم الرصد اليوم</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">
                            لم يُرصد بعد
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Left side: Points Pill & Quick Add Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-left font-black text-xs sm:text-sm text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200">
                      {child.totalPoints} نقطة
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenScoreModal(child);
                      }}
                      className={`min-h-[40px] px-3 sm:px-4 rounded-xl text-xs font-black text-white flex items-center gap-1.5 shadow-xs transition active:scale-95 ${
                        isGirl
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden xs:inline">إضافة نقاط</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ========================================================== */
          /* GRID VIEW: Responsive cards with badges and click targets  */
          /* ========================================================== */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
            {sortedAndFilteredChildren.map((child) => {
              const isScored = isChildScored(child.id);
              const isGirl = child.gender === 'girl';

              return (
                <div
                  key={child.id}
                  onClick={() => handleOpenScoreModal(child)}
                  className={`p-3 rounded-2xl border text-right transition flex flex-col justify-between gap-2 cursor-pointer active:scale-95 relative ${
                    isScored
                      ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs'
                      : isGirl
                      ? 'bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50/30'
                      : 'bg-white border-slate-200 hover:border-sky-300 hover:bg-sky-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-base">{isGirl ? '👧' : '👦'}</span>
                    {isScored ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md font-black bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" />
                        <span>تم</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">
                        {child.totalPoints} ن
                      </span>
                    )}
                  </div>

                  <div className="font-black text-xs sm:text-sm text-slate-900 truncate">
                    {child.name}
                  </div>

                  <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-indigo-600 font-black">+ رصد درجات</span>
                    <span className="text-slate-400 text-[10px]">
                      {isGirl ? 'بنت' : 'ولد'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 4. POP-UP TAB / MODAL: Compact, Clean & Fast for Mobile                  */}
      {/* ========================================================================= */}
      {selectedChild && (
        <div 
          id="score-popup-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn"
          onClick={handleCloseModal}
        >
          <div
            id="score-popup-modal-content"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-zoomIn"
            dir="rtl"
          >
            {/* Modal Header: Compact */}
            <div className={`px-4 py-3 border-b flex items-center justify-between gap-2 ${
              selectedChild.gender === 'girl' 
                ? 'bg-rose-50/70 border-rose-100'
                : 'bg-sky-50/70 border-sky-100'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl shrink-0">
                  {selectedChild.gender === 'girl' ? '👧' : '👦'}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
                    {selectedChild.name}
                  </h3>
                  <div className="text-[11px] font-semibold text-slate-500 truncate">
                    {currentFriday.label} • الحالي: <span className="font-bold text-slate-700">{selectedChild.totalPoints} ن</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition shrink-0"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Only Title + Clean Number-Only Text Boxes */}
            <div className="p-4 space-y-2.5">
              
              {/* Modal Error Message */}
              {modalErrorMessage && (
                <div className="p-2.5 bg-rose-50 text-rose-900 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{modalErrorMessage}</span>
                </div>
              )}

              {/* 1. القداس */}
              <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/80 flex items-center justify-between gap-3">
                <label htmlFor="liturgy-points-input" className="flex items-center gap-1.5 text-amber-950 font-black text-xs sm:text-sm shrink-0">
                  <Church className="w-4 h-4 text-amber-600" />
                  <span>القداس الإلهي</span>
                </label>
                <div className="relative w-28 sm:w-32">
                  <input
                    id="liturgy-points-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    value={liturgyPoints === 0 ? '' : liturgyPoints}
                    onKeyDown={(e) => {
                      if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const cleanDigits = e.target.value.replace(/[^0-9]/g, '');
                      const val = cleanDigits === '' ? 0 : Math.min(200, parseInt(cleanDigits, 10) || 0);
                      setLiturgyPoints(val);
                      setModalErrorMessage(null);
                    }}
                    className="w-full h-10 px-3 text-center text-lg font-black text-amber-950 bg-white border border-amber-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="absolute left-2.5 top-2.5 text-[11px] font-bold text-amber-600 pointer-events-none">
                    ن
                  </span>
                </div>
              </div>

              {/* 2. الحضور */}
              <div className="bg-sky-50/50 p-2.5 rounded-xl border border-sky-200/80 flex items-center justify-between gap-3">
                <label htmlFor="attendance-points-input" className="flex items-center gap-1.5 text-sky-950 font-black text-xs sm:text-sm shrink-0">
                  <UserCheck className="w-4 h-4 text-sky-600" />
                  <span>الحضور في الميعاد</span>
                </label>
                <div className="relative w-28 sm:w-32">
                  <input
                    id="attendance-points-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    value={attendancePoints === 0 ? '' : attendancePoints}
                    onKeyDown={(e) => {
                      if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const cleanDigits = e.target.value.replace(/[^0-9]/g, '');
                      const val = cleanDigits === '' ? 0 : Math.min(200, parseInt(cleanDigits, 10) || 0);
                      setAttendancePoints(val);
                      setModalErrorMessage(null);
                    }}
                    className="w-full h-10 px-3 text-center text-lg font-black text-sky-950 bg-white border border-sky-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                  <span className="absolute left-2.5 top-2.5 text-[11px] font-bold text-sky-600 pointer-events-none">
                    ن
                  </span>
                </div>
              </div>

              {/* 3. المشاركة والتفاعل */}
              <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200/80 flex items-center justify-between gap-3">
                <label htmlFor="participation-points-input" className="flex items-center gap-1.5 text-emerald-950 font-black text-xs sm:text-sm shrink-0">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>المشاركة والتفاعل</span>
                </label>
                <div className="relative w-28 sm:w-32">
                  <input
                    id="participation-points-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    value={participationPoints === 0 ? '' : participationPoints}
                    onKeyDown={(e) => {
                      if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => {
                      const cleanDigits = e.target.value.replace(/[^0-9]/g, '');
                      const val = cleanDigits === '' ? 0 : Math.min(200, parseInt(cleanDigits, 10) || 0);
                      setParticipationPoints(val);
                      setModalErrorMessage(null);
                    }}
                    className="w-full h-10 px-3 text-center text-lg font-black text-emerald-950 bg-white border border-emerald-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute left-2.5 top-2.5 text-[11px] font-bold text-emerald-600 pointer-events-none">
                    ن
                  </span>
                </div>
              </div>

              {/* Total points summary */}
              <div className="flex items-center justify-between px-2 pt-1 text-xs">
                <span className="text-slate-500 font-bold">المجموع المرصود:</span>
                <span className="text-sm font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                  +{totalPointsToAdd} نقطة
                </span>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="h-10 px-3.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl transition"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={() => handleSavePoints(true)}
                disabled={isSubmitting || totalPointsToAdd <= 0}
                title="حفظ والنقل للطفل التالي"
                className="h-10 px-3 rounded-xl text-xs font-black bg-slate-200 hover:bg-slate-300 text-slate-800 transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1"
              >
                <span>حفظ والتالي</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                id="modal-submit-btn"
                type="button"
                onClick={() => handleSavePoints(false)}
                disabled={isSubmitting || totalPointsToAdd <= 0}
                className={`h-10 px-5 rounded-xl text-xs sm:text-sm font-black text-white active:scale-95 transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 ${
                  selectedChild.gender === 'girl'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                }`}
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>
                  {isSubmitting ? 'حفظ...' : 'حفظ'}
                </span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
