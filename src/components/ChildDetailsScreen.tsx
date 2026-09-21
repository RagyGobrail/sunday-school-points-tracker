import React, { useEffect, useState } from 'react';
import { Child, ScoreRecord, ScoreCategory, CATEGORY_NAMES_AR, FridayWeek } from '../types';
import { subscribeToChildScores, updateScoreRecord, deleteScoreRecord, addScoreRecord, addBatchScoresForChild } from '../services/childrenService';
import { formatArabicDateTime, getRecentFridays } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowRight, 
  Church, 
  UserCheck, 
  Sparkles,
  Star, 
  Trash2, 
  Edit2, 
  History, 
  Award, 
  AlertCircle, 
  PlusCircle, 
  Calendar, 
  X, 
  CheckCircle 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ChildDetailsScreenProps {
  child: Child;
  onBack: () => void;
}

export const ChildDetailsScreen: React.FC<ChildDetailsScreenProps> = ({ child, onBack }) => {
  const { leaderProfile } = useAuth();
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  
  // Edit existing score
  const [editingScore, setEditingScore] = useState<ScoreRecord | null>(null);
  const [editPoints, setEditPoints] = useState<number>(0);
  const [editCategory, setEditCategory] = useState<ScoreCategory>('liturgy');
  
  // Delete existing score
  const [deletingScore, setDeletingScore] = useState<ScoreRecord | null>(null);
  
  // Add score (for current or past Fridays)
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const fridays = getRecentFridays(12);
  const [selectedFridayId, setSelectedFridayId] = useState<string>(fridays[0].id);
  const [addLiturgyPoints, setAddLiturgyPoints] = useState<number>(0);
  const [addAttendancePoints, setAddAttendancePoints] = useState<number>(0);
  const [addParticipationPoints, setAddParticipationPoints] = useState<number>(0);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToChildScores(child.id, (list) => {
      setScores(list);
    });
    return () => unsub();
  }, [child.id]);

  const filteredScores = scores.filter(s => {
    if (selectedCategoryFilter === 'all') return true;
    return s.category === selectedCategoryFilter;
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalToAdd = (addLiturgyPoints || 0) + (addAttendancePoints || 0) + (addParticipationPoints || 0);
    if (totalToAdd <= 0) {
      setErrorMsg('من فضلك أدخل درجات في خانة واحدة على الأقل');
      return;
    }
    const chosenFriday = fridays.find(f => f.id === selectedFridayId) || fridays[0];
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const scoresToRecord: Array<{ category: ScoreCategory; points: number }> = [];
      if (addLiturgyPoints > 0) scoresToRecord.push({ category: 'liturgy', points: addLiturgyPoints });
      if (addAttendancePoints > 0) scoresToRecord.push({ category: 'attendance', points: addAttendancePoints });
      if (addParticipationPoints > 0) scoresToRecord.push({ category: 'participation', points: addParticipationPoints });

      await addBatchScoresForChild({
        childId: child.id,
        childName: child.name,
        scores: scoresToRecord,
        weekId: chosenFriday.id,
        weekDate: chosenFriday.label,
        leaderId: leaderProfile?.uid || 'leader',
        leaderName: leaderProfile?.displayName || 'خادم الفصل'
      });
      confetti({ particleCount: 30, spread: 45 });
      setSuccessMsg(`تمت إضافة ${totalToAdd} نقطة عن ${chosenFriday.label} بنجاح!`);
      setShowAddModal(false);
      setAddLiturgyPoints(0);
      setAddAttendancePoints(0);
      setAddParticipationPoints(0);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'حدث خطأ أثناء إضافة النقاط');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScore) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      await updateScoreRecord({
        childId: child.id,
        scoreId: editingScore.id,
        newPoints: Number(editPoints),
        newCategory: editCategory
      });
      setSuccessMsg('تم تحديث النقاط بنجاح');
      setEditingScore(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg('حدث خطأ أثناء تعديل النقاط');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteScore = async () => {
    if (!deletingScore) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      await deleteScoreRecord(child.id, deletingScore.id);
      setSuccessMsg('تم حذف السجل وإعادة حساب المجموع');
      setDeletingScore(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg('حدث خطأ أثناء حذف السجل');
    } finally {
      setIsProcessing(false);
    }
  };

  const getCategoryBadge = (cat: ScoreCategory) => {
    if (cat === 'liturgy') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <Church className="w-3.5 h-3.5" />
          <span>القداس</span>
        </span>
      );
    }
    if (cat === 'attendance') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
          <UserCheck className="w-3.5 h-3.5" />
          <span>الحضور</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <Star className="w-3.5 h-3.5" />
        <span>المشاركة</span>
      </span>
    );
  };

  return (
    <div id="child-details-view" className="space-y-4">
      
      {/* Toast Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-sm font-bold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Back Button & Child Name Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95 shrink-0"
            title="رجوع"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-indigo-600">سجل درجات الطفل</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold border ${
                child.gender === 'girl'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-sky-50 text-sky-700 border-sky-200'
              }`}>
                {child.gender === 'girl' ? '👧 بنت' : '👦 ولد'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">{child.name}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end">
          <div className="text-center sm:text-left bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
            <div className="text-[11px] font-black text-indigo-700">إجمالي النقاط</div>
            <div className="text-2xl font-black text-indigo-950">{child.totalPoints}</div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="min-h-[44px] px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-md shadow-indigo-600/20 transition active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إضافة نقاط للطفل</span>
          </button>
        </div>
      </div>

      {/* Category Breakdown Cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs text-center">
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-amber-700 mb-1">
            <Church className="w-3.5 h-3.5" />
            <span>القداس</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-800">{child.liturgyPoints || 0}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs text-center">
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-blue-700 mb-1">
            <UserCheck className="w-3.5 h-3.5" />
            <span>الحضور</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-800">{child.attendancePoints || 0}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs text-center">
          <div className="flex items-center justify-center gap-1 text-xs font-bold text-emerald-700 mb-1">
            <Star className="w-3.5 h-3.5" />
            <span>المشاركة</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-800">{child.participationPoints || 0}</div>
        </div>
      </div>

      {/* Scoring Records History */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-600" />
            <h3 className="font-black text-base text-slate-800">
              سجل الجمعات والنقاط التاريخية ({scores.length})
            </h3>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1 flex-wrap">
            {['all', 'liturgy', 'attendance', 'participation'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95 ${
                  selectedCategoryFilter === cat
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'all' ? 'الكل' : CATEGORY_NAMES_AR[cat as ScoreCategory]}
              </button>
            ))}
          </div>
        </div>

        {/* Scores List */}
        {filteredScores.length === 0 ? (
          <div className="py-10 text-center text-slate-400 font-medium text-sm">
            لا توجد سجلات نقاط مسجلة لهذا الطفل حتى الآن
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredScores.map((record) => (
              <div key={record.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {getCategoryBadge(record.category)}
                    <span className="font-black text-base text-slate-800">
                      +{record.points} نقطة
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-500 flex flex-wrap items-center gap-2">
                    <span className="text-amber-800 font-bold bg-amber-50/70 px-2 py-0.5 rounded-md">
                      {record.weekDate}
                    </span>
                    <span>•</span>
                    <span>بواسطة: {record.leaderName || 'الخادم'}</span>
                    <span>•</span>
                    <span className="text-slate-400">{formatArabicDateTime(record.createdAt)}</span>
                  </div>
                </div>

                {/* Edit / Delete actions with mobile touch-friendly targets */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    onClick={() => {
                      setEditingScore(record);
                      setEditPoints(record.points);
                      setEditCategory(record.category);
                    }}
                    title="تعديل النقاط"
                    className="min-h-[40px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                    <span>تعديل</span>
                  </button>
                  <button
                    onClick={() => setDeletingScore(record)}
                    title="حذف هذا السجل"
                    className="min-h-[40px] px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Points Modal for this Child */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-800">إضافة نقاط لـ {child.name}</h3>
                <p className="text-xs text-slate-500">اختر الجمعة الحالية أو جمعة فائتة</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">الجمعة المستهدفة:</label>
                <div className="relative">
                  <select
                    value={selectedFridayId}
                    onChange={(e) => setSelectedFridayId(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white"
                  >
                    {fridays.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.isCurrent ? `⭐ الجمعة الحالية (${f.label})` : `جمعة سابقة: ${f.label}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3 Text Boxes for القداس, الحضور, and المشاركة */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-600">
                  اكتب الدرجات المطلوبة في أي من الخانات الثلاث:
                </p>

                {/* Liturgy Box */}
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-black text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <Church className="w-4 h-4 text-amber-600" />
                      القداس
                    </span>
                    <span className="text-[10px] font-bold text-amber-700">Liturgy</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    value={addLiturgyPoints === 0 ? '' : addLiturgyPoints}
                    onChange={(e) => setAddLiturgyPoints(e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0))}
                    placeholder="0"
                    className="w-full min-h-[46px] px-3 text-center text-xl font-black text-amber-950 bg-white border border-amber-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Attendance Box */}
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-black text-blue-900">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                      الحضور
                    </span>
                    <span className="text-[10px] font-bold text-blue-700">Attendance</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    value={addAttendancePoints === 0 ? '' : addAttendancePoints}
                    onChange={(e) => setAddAttendancePoints(e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0))}
                    placeholder="0"
                    className="w-full min-h-[46px] px-3 text-center text-xl font-black text-blue-950 bg-white border border-blue-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Participation Box */}
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-black text-emerald-900">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      المشاركة
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700">Participation</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    value={addParticipationPoints === 0 ? '' : addParticipationPoints}
                    onChange={(e) => setAddParticipationPoints(e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0))}
                    placeholder="0"
                    className="w-full min-h-[46px] px-3 text-center text-xl font-black text-emerald-950 bg-white border border-emerald-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Total Counter */}
                <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-600">
                  <span>المجموع الإجمالي:</span>
                  <span className="text-sm font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                    +{(addLiturgyPoints || 0) + (addAttendancePoints || 0) + (addParticipationPoints || 0)} نقطة
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 min-h-[48px] rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 min-h-[48px] rounded-xl text-sm font-black bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 transition disabled:opacity-50"
                >
                  {isProcessing ? 'جاري الحفظ...' : 'حفظ النقاط'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Score Modal */}
      {editingScore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-800">تعديل سجل النقاط</h3>
                <p className="text-xs text-amber-800 font-bold">{editingScore.weekDate}</p>
              </div>
              <button onClick={() => setEditingScore(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع النقاط:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditCategory('liturgy')}
                    className={`min-h-[44px] py-2 px-1 rounded-xl text-xs font-bold transition active:scale-95 ${
                      editCategory === 'liturgy' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    قداس
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCategory('attendance')}
                    className={`min-h-[44px] py-2 px-1 rounded-xl text-xs font-bold transition active:scale-95 ${
                      editCategory === 'attendance' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    حضور
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCategory('participation')}
                    className={`min-h-[44px] py-2 px-1 rounded-xl text-xs font-bold transition active:scale-95 ${
                      editCategory === 'participation' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    مشاركة
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">النقاط المعدلة:</label>
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={editPoints}
                  onChange={(e) => setEditPoints(Number(e.target.value))}
                  className="w-full min-h-[46px] px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingScore(null)}
                  className="flex-1 min-h-[48px] rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 min-h-[48px] rounded-xl text-sm font-extrabold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {isProcessing ? 'جاري التعديل...' : 'تحديث النقاط'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Score Confirmation Modal */}
      {deletingScore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 sm:p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-800 mb-1">تأكيد حذف النقاط</h3>
            <p className="text-sm font-bold text-slate-700 mb-1">
              +{deletingScore.points} نقطة ({CATEGORY_NAMES_AR[deletingScore.category]})
            </p>
            <p className="text-xs text-slate-500 mb-6">{deletingScore.weekDate}</p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingScore(null)}
                className="flex-1 min-h-[44px] rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteScore}
                disabled={isProcessing}
                className="flex-1 min-h-[44px] rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isProcessing ? 'جاري الحذف...' : 'حذف السجل'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
