import React, { useEffect, useState } from 'react';
import { Child, ScoreRecord, FridayWeek, ScoreCategory, CATEGORY_NAMES_AR } from '../types';
import { fetchAllScoresForWeek, updateScoreRecord, deleteScoreRecord, addScoreRecord } from '../services/childrenService';
import { formatArabicDateTime } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, 
  Filter, 
  User, 
  Church, 
  UserCheck, 
  Star, 
  RefreshCw, 
  PlusCircle, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  AlertCircle,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface WeeklyHistoryScreenProps {
  fridays: FridayWeek[];
  childrenList: Child[];
  onSelectChild: (child: Child) => void;
}

export const WeeklyHistoryScreen: React.FC<WeeklyHistoryScreenProps> = ({
  fridays,
  childrenList,
  onSelectChild
}) => {
  const { leaderProfile } = useAuth();
  const [selectedWeekId, setSelectedWeekId] = useState<string>(fridays[0]?.id || '');
  const [selectedChildFilter, setSelectedChildFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Quick Add Point for this specific Friday modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalChildId, setAddModalChildId] = useState('');
  const [addModalCategory, setAddModalCategory] = useState<ScoreCategory>('liturgy');
  const [addModalPoints, setAddModalPoints] = useState<number>(10);
  const [isAdding, setIsAdding] = useState(false);

  // Edit Score modal state
  const [editingScore, setEditingScore] = useState<ScoreRecord | null>(null);
  const [editPoints, setEditPoints] = useState<number>(10);
  const [editCategory, setEditCategory] = useState<ScoreCategory>('liturgy');
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Score confirm state
  const [deletingScore, setDeletingScore] = useState<ScoreRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const selectedFriday = fridays.find(f => f.id === selectedWeekId) || fridays[0];

  const loadScores = async () => {
    setLoading(true);
    try {
      const records = await fetchAllScoresForWeek(selectedWeekId);
      setScores(records);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScores();
  }, [selectedWeekId]);

  const filteredScores = scores.filter(s => {
    if (selectedChildFilter !== 'all' && s.childId !== selectedChildFilter) return false;
    if (selectedCategoryFilter !== 'all' && s.category !== selectedCategoryFilter) return false;
    return true;
  });

  // Calculate totals for filtered scores
  const totalPointsGiven = filteredScores.reduce((acc, curr) => acc + curr.points, 0);
  const liturgyTotal = filteredScores.filter(s => s.category === 'liturgy').reduce((a, b) => a + b.points, 0);
  const attendanceTotal = filteredScores.filter(s => s.category === 'attendance').reduce((a, b) => a + b.points, 0);
  const participationTotal = filteredScores.filter(s => s.category === 'participation').reduce((a, b) => a + b.points, 0);

  // Handle Add Score for this past/current Friday
  const handleAddForWeek = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addModalChildId) {
      setNotification({ type: 'error', message: 'يرجى اختيار اسم الطفل' });
      return;
    }
    const matchedChild = childrenList.find(c => c.id === addModalChildId);
    setIsAdding(true);
    try {
      await addScoreRecord({
        childId: addModalChildId,
        childName: matchedChild?.name,
        category: addModalCategory,
        points: Number(addModalPoints),
        weekId: selectedFriday.id,
        weekDate: selectedFriday.label,
        leaderId: leaderProfile?.uid || 'leader',
        leaderName: leaderProfile?.displayName || 'خادم الفصل'
      });
      confetti({ particleCount: 25, spread: 35 });
      setNotification({ type: 'success', message: `تمت إضافة النقاط لـ ${matchedChild?.name} عن ${selectedFriday.label}` });
      setShowAddModal(false);
      setAddModalChildId('');
      await loadScores();
    } catch (err) {
      setNotification({ type: 'error', message: 'تعذر إضافة النقاط' });
    } finally {
      setIsAdding(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Handle Edit Score
  const handleUpdateScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScore) return;
    setIsUpdating(true);
    try {
      await updateScoreRecord({
        childId: editingScore.childId,
        scoreId: editingScore.id,
        newPoints: Number(editPoints),
        newCategory: editCategory
      });
      setNotification({ type: 'success', message: 'تم تحديث النقاط بنجاح' });
      setEditingScore(null);
      await loadScores();
    } catch (err) {
      setNotification({ type: 'error', message: 'حدث خطأ أثناء تعديل السجل' });
    } finally {
      setIsUpdating(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Handle Delete Score
  const handleDeleteScore = async () => {
    if (!deletingScore) return;
    setIsDeleting(true);
    try {
      await deleteScoreRecord(deletingScore.childId, deletingScore.id);
      setNotification({ type: 'success', message: 'تم حذف سجل النقاط وإعادة ضبط مجموع الطفل' });
      setDeletingScore(null);
      await loadScores();
    } catch (err) {
      setNotification({ type: 'error', message: 'تعذر حذف السجل' });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div id="weekly-history-view" className="space-y-4">
      
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-sm font-bold flex items-center justify-between shadow-md transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Week Selector */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-1.5 text-indigo-600 font-extrabold text-xs mb-1">
              <Calendar className="w-4 h-4" />
              <span>سجل النقاط والجمعات الفائتة</span>
            </div>
            <h2 className="text-xl font-black text-slate-900">متابعة وتعديل الجمعات</h2>
            <p className="text-xs text-slate-500 font-medium">اختر أي جمعة فائتة لتعديل أو إضافة نقاط لأي طفل بالأسهم أو القائمة</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Arrow Navigation for Fridays */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  const currentIndex = fridays.findIndex(f => f.id === selectedWeekId);
                  if (currentIndex < fridays.length - 1) {
                    setSelectedWeekId(fridays[currentIndex + 1].id);
                  }
                }}
                disabled={fridays.findIndex(f => f.id === selectedWeekId) >= fridays.length - 1}
                className="p-2 rounded-xl text-slate-700 hover:bg-white hover:shadow-xs disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95 flex items-center gap-1 text-xs font-bold"
                title="الجمعة السابقة"
              >
                <span>السابقة</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const currentIndex = fridays.findIndex(f => f.id === selectedWeekId);
                  if (currentIndex > 0) {
                    setSelectedWeekId(fridays[currentIndex - 1].id);
                  }
                }}
                disabled={fridays.findIndex(f => f.id === selectedWeekId) <= 0}
                className="p-2 rounded-xl text-slate-700 hover:bg-white hover:shadow-xs disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95 flex items-center gap-1 text-xs font-bold"
                title="الجمعة الأحدث"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>الأحدث</span>
              </button>
            </div>

            <select
              id="select-friday-week"
              value={selectedWeekId}
              onChange={(e) => setSelectedWeekId(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-black text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 max-w-[200px]"
            >
              {fridays.map(f => (
                <option key={f.id} value={f.id}>
                  {f.isCurrent ? `⭐ الحالي: ${f.label}` : `جمعة: ${f.label}`}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowAddModal(true)}
              className="min-h-[44px] px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة نقاط</span>
            </button>

            <button
              onClick={loadScores}
              title="تحديث البيانات"
              className="min-h-[44px] min-w-[44px] p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center justify-center"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">تصفية حسب الطفل:</label>
            <select
              value={selectedChildFilter}
              onChange={(e) => setSelectedChildFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="all">جميع الأطفال ({childrenList.length})</option>
              {childrenList.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">تصفية حسب نوع النقاط:</label>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="all">جميع الفئات</option>
              <option value="liturgy">القداس</option>
              <option value="attendance">الحضور</option>
              <option value="participation">المشاركة</option>
            </select>
          </div>
        </div>
      </div>

      {/* Week Summary Cards - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
          <div className="text-[11px] font-semibold text-slate-500">إجمالي نقاط الجمعة</div>
          <div className="text-xl sm:text-2xl font-black text-amber-600">{totalPointsGiven}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
          <div className="text-[11px] font-semibold text-slate-500">نقاط القداس</div>
          <div className="text-xl sm:text-2xl font-black text-amber-800">{liturgyTotal}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
          <div className="text-[11px] font-semibold text-slate-500">نقاط الحضور</div>
          <div className="text-xl sm:text-2xl font-black text-blue-700">{attendanceTotal}</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
          <div className="text-[11px] font-semibold text-slate-500">نقاط المشاركة</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">{participationTotal}</div>
        </div>
      </div>

      {/* Records List */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
          <h3 className="font-black text-sm text-slate-800">
            سجلات {selectedFriday.label} ({filteredScores.length})
          </h3>
          <span className="text-xs text-slate-400 font-semibold">
            يمكنك تعديل أو حذف أي درجة مباشرة
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 font-semibold text-sm">
            جاري تحميل سجلات الجمعة...
          </div>
        ) : filteredScores.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <p className="text-sm font-bold text-slate-600">لم يتم تسجيل أي درجات في هذه الجمعة بعد</p>
            <p className="text-xs text-slate-400">هل نسيت رصد هذه الجمعة؟ اضغط على زر "إضافة نقاط للجمعة" بالأعلى للرصد الآن.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredScores.map(score => {
              const matchedChild = childrenList.find(c => c.id === score.childId);
              return (
                <div key={score.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        onClick={() => matchedChild && onSelectChild(matchedChild)}
                        className="font-black text-sm sm:text-base text-slate-800 hover:text-amber-700 cursor-pointer transition"
                      >
                        {score.childName || matchedChild?.name || 'طفل'}
                      </span>
                      <span className="text-xs font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                        +{score.points} نقطة
                      </span>
                      <span className="text-xs font-bold text-slate-600 px-2 py-0.5 rounded-md bg-slate-100">
                        {CATEGORY_NAMES_AR[score.category]}
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-400 flex items-center gap-2">
                      <span>سجلها الخادم: {score.leaderName || 'خادم الفصل'}</span>
                      <span>•</span>
                      <span>{formatArabicDateTime(score.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete (Mobile-friendly min 44px tap area) */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingScore(score);
                        setEditPoints(score.points);
                        setEditCategory(score.category);
                      }}
                      className="min-h-[40px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                      <span>تعديل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingScore(score)}
                      className="min-h-[40px] px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Add Points specifically for this chosen Friday */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full border border-slate-200 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-800">إضافة درجات عن {selectedFriday.label}</h3>
                <p className="text-xs text-amber-700 font-bold">تسجيل بأثر رجعي للجمعة المحددة</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddForWeek} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الطفل:</label>
                <select
                  value={addModalChildId}
                  onChange={(e) => setAddModalChildId(e.target.value)}
                  required
                  className="w-full min-h-[46px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white"
                >
                  <option value="">-- اختر الطفل --</option>
                  {childrenList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع النقاط:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddModalCategory('liturgy')}
                    className={`min-h-[44px] py-2 px-1 rounded-xl text-xs font-bold transition ${
                      addModalCategory === 'liturgy' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    قداس
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddModalCategory('attendance')}
                    className={`min-h-[44px] py-2 px-1 rounded-xl text-xs font-bold transition ${
                      addModalCategory === 'attendance' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    حضور
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddModalCategory('participation')}
                    className={`min-h-[44px] py-2 px-1 rounded-xl text-xs font-bold transition ${
                      addModalCategory === 'participation' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    مشاركة
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عدد النقاط:</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={addModalPoints}
                  onChange={(e) => setAddModalPoints(Number(e.target.value))}
                  required
                  className="w-full min-h-[46px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={isAdding}
                className="w-full min-h-[48px] bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-sm transition shadow-md shadow-indigo-600/20 active:scale-95"
              >
                {isAdding ? 'جاري الحفظ...' : 'حفظ النقاط للجمعة'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Existing Score */}
      {editingScore && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-800">تعديل سجل نقاط</h3>
                <p className="text-xs text-slate-500">{editingScore.childName}</p>
              </div>
              <button onClick={() => setEditingScore(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateScore} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع النقاط:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditCategory('liturgy')}
                    className={`min-h-[44px] py-2 px-1 rounded-xl text-xs font-bold transition ${
                      editCategory === 'liturgy' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    قداس
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCategory('attendance')}
                    className={`min-h-[44px] py-2 px-1 rounded-xl text-xs font-bold transition ${
                      editCategory === 'attendance' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    حضور
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCategory('participation')}
                    className={`min-h-[44px] py-2 px-1 rounded-xl text-xs font-bold transition ${
                      editCategory === 'participation' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    مشاركة
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">النقاط الجديدة:</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={editPoints}
                  onChange={(e) => setEditPoints(Number(e.target.value))}
                  required
                  className="w-full min-h-[46px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-800"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingScore(null)}
                  className="flex-1 min-h-[48px] bg-slate-100 text-slate-700 font-bold rounded-xl text-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 min-h-[48px] bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-sm shadow-md shadow-indigo-600/20 active:scale-95 transition"
                >
                  {isUpdating ? 'جاري الحفظ...' : 'حفظ التعديل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Score */}
      {deletingScore && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full border border-slate-200 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-800 mb-1">تأكيد حذف النقاط</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              هل أنت متأكد من حذف {deletingScore.points} نقطة ({CATEGORY_NAMES_AR[deletingScore.category]}) للطفل {deletingScore.childName}؟ سيتم خصمها تلقائياً من المجموع الكلي للطفل.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingScore(null)}
                className="flex-1 min-h-[44px] bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteScore}
                disabled={isDeleting}
                className="flex-1 min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs"
              >
                {isDeleting ? 'جاري الحذف...' : 'نعم، احذف'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
