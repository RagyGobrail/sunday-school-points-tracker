import React, { useState } from 'react';
import { Child } from '../types';
import { addChild, updateChild, deleteChild } from '../services/childrenService';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, Search, Edit2, Trash2, UserPlus, AlertCircle, ChevronLeft } from 'lucide-react';

interface ChildrenManagementScreenProps {
  childrenList: Child[];
  onSelectChild: (child: Child) => void;
}

export const ChildrenManagementScreen: React.FC<ChildrenManagementScreenProps> = ({
  childrenList,
  onSelectChild,
}) => {
  const { isAdmin, isAuthorized } = useAuth();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [editChild, setEditChild] = useState<Child | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirmChild, setDeleteConfirmChild] = useState<Child | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredChildren = childrenList.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildName.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await addChild(newChildName);
      setNewChildName('');
      setShowAddModal(false);
    } catch (err: any) {
      console.error('Failed to add child:', err);
      setErrorMessage('حدث خطأ أثناء إضافة الطفل، تأكد من الاتصال والصلاحية');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editChild || !editName.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await updateChild(editChild.id, { name: editName.trim() });
      setEditChild(null);
    } catch (err: any) {
      console.error('Failed to update child:', err);
      setErrorMessage('حدث خطأ أثناء تعديل الاسم');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmChild) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await deleteChild(deleteConfirmChild.id);
      setDeleteConfirmChild(null);
    } catch (err: any) {
      console.error('Failed to delete child:', err);
      setErrorMessage('حدث خطأ أثناء حذف الطفل');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="children-management-screen" className="space-y-4">
      {/* Top Header & Actions */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-xs mb-1">
            <Users className="w-4 h-4" />
            <span>قائمة الفصل</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">الأطفال ({childrenList.length})</h2>
          <p className="text-xs text-slate-500 font-medium">إدارة أسماء الأطفال وتفاصيل مشاركتهم ونقاطهم</p>
        </div>

        <button
          id="open-add-child-modal-btn"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-md shadow-indigo-600/20 transition active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة طفل جديد</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
        <input
          id="search-children-list"
          type="text"
          placeholder="ابحث بالاسم عن أي طفل في الفصل..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pr-10 pl-4 py-2.5 bg-white rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Empty State */}
      {filteredChildren.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-3">
            <Users className="w-6 h-6" />
          </div>
          <p className="text-base font-black text-slate-800 mb-1">
            {search ? 'لا توجد نتائج تطابق بحثك' : 'لا يوجد أطفال حتى الآن'}
          </p>
          <p className="text-xs text-slate-400 mb-4 font-medium">
            {search ? 'جرب البحث باسم آخر' : 'ابدأ بإضافة أول طفل في الفصل لتسجيل النقاط له'}
          </p>
          {!search && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white font-black rounded-xl text-sm hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition active:scale-95"
            >
              إضافة طفل
            </button>
          )}
        </div>
      ) : (
        /* Children Grid / List */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredChildren.map((child) => (
            <div
              key={child.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-amber-400 transition flex items-center justify-between"
            >
              <div 
                onClick={() => onSelectChild(child)}
                className="cursor-pointer flex-1 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-base shrink-0">
                  {child.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base hover:text-amber-700 transition">
                    {child.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-0.5">
                    <span className="text-amber-700 font-bold">{child.totalPoints} نقطة</span>
                    <span>•</span>
                    <span>قداس: {child.liturgyPoints}</span>
                    <span>•</span>
                    <span>حضور: {child.attendancePoints}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  title="تعديل اسم الطفل"
                  onClick={() => {
                    setEditChild(child);
                    setEditName(child.name);
                  }}
                  className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  title="حذف طفل"
                  onClick={() => setDeleteConfirmChild(child)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onSelectChild(child)}
                  title="عرض سجل الطفل"
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Child Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2">إضافة طفل جديد إلى الفصل</h3>
            <p className="text-xs text-slate-500 mb-4">أدخل الاسم ثلاثي أو ثنائي لتسهيل تمييز الطفل</p>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم الطفل:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد مينا سامي"
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newChildName.trim()}
                  className="px-5 py-2 rounded-xl text-sm font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الإضافة...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Child Modal */}
      {editChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2">تعديل اسم الطفل</h3>
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم الطفل:</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditChild(null)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !editName.trim()}
                  className="px-5 py-2 rounded-xl text-sm font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري التعديل...' : 'تعديل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmChild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">هل أنت متأكد من حذف هذا الطفل؟</h3>
            <p className="text-sm text-slate-600 mb-1 font-semibold">{deleteConfirmChild.name}</p>
            <p className="text-xs text-rose-600 mb-6">
              سيتم حذف الطفل وجميع سجلات نقاطه التاريخية نهائياً.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmChild(null)}
                className="px-5 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الحذف...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
