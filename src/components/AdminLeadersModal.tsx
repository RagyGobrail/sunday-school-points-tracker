import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LeaderUser } from '../types';
import { Shield, UserCheck, UserX, Trash2, KeyRound, Check, AlertCircle } from 'lucide-react';

export const AdminLeadersModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const { allLeaders, updateLeaderStatus, deleteLeader, leaderProfile } = useAuth();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  if (!isOpen) return null;

  const handleToggleAuth = async (leader: LeaderUser) => {
    setIsUpdating(leader.uid);
    setMsg(null);
    try {
      await updateLeaderStatus(leader.uid, !leader.isAuthorized);
      setMsg({ text: `تم تحديث صلاحية ${leader.displayName} بنجاح` });
    } catch (e: any) {
      setMsg({ text: 'حدث خطأ أثناء تعديل الصلاحية', error: true });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleRoleToggle = async (leader: LeaderUser) => {
    if (leader.uid === leaderProfile?.uid) {
      alert('لا يمكنك إلغاء دور المشرف لنفسك');
      return;
    }
    setIsUpdating(leader.uid);
    setMsg(null);
    try {
      const newRole = leader.role === 'admin' ? 'leader' : 'admin';
      await updateLeaderStatus(leader.uid, leader.isAuthorized, newRole);
      setMsg({ text: `تم تغيير دور ${leader.displayName} إلى ${newRole === 'admin' ? 'مشرف' : 'خادم'}` });
    } catch (e) {
      setMsg({ text: 'حدث خطأ أثناء تعديل الدور', error: true });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDelete = async (leader: LeaderUser) => {
    if (leader.uid === leaderProfile?.uid) {
      alert('لا يمكنك حذف حسابك الحالي');
      return;
    }
    if (!confirm(`هل أنت متأكد من إزالة الخادم ${leader.displayName}؟`)) return;
    setIsUpdating(leader.uid);
    try {
      await deleteLeader(leader.uid);
      setMsg({ text: 'تمت إزالة حساب الخادم' });
    } catch (e) {
      setMsg({ text: 'حدث خطأ أثناء الحذف', error: true });
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-indigo-50 text-indigo-600">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">إدارة قادة الفصل والصلاحيات</h3>
              <p className="text-xs text-slate-500 font-medium">التحكم في من يحق له تسجيل النقاط وإدارة الأطفال</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>

        {msg && (
          <div className={`mt-3 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${msg.error ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`}>
            {msg.error ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            <span>{msg.text}</span>
          </div>
        )}

        <div className="mt-4 max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
          {allLeaders.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              لا يوجد قادة آخرين مسجلين
            </div>
          ) : (
            allLeaders.map(leader => (
              <div key={leader.uid} className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                    {leader.displayName?.charAt(0) || 'خ'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-800">{leader.displayName}</span>
                      {leader.role === 'admin' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-purple-100 text-purple-800">
                          مشرف
                        </span>
                      )}
                      {leader.isAuthorized ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800">
                          مفعل ومصرح
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-800">
                          بانتظار الموافقة
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{leader.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleAuth(leader)}
                    disabled={isUpdating === leader.uid}
                    title={leader.isAuthorized ? 'إلغاء التفعيل' : 'تفعيل الخادم'}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      leader.isAuthorized
                        ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {leader.isAuthorized ? 'إيقاف' : 'قبول وتفعيل'}
                  </button>

                  <button
                    onClick={() => handleRoleToggle(leader)}
                    disabled={isUpdating === leader.uid}
                    title="تغيير الدور"
                    className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>

                  {leader.uid !== leaderProfile?.uid && (
                    <button
                      onClick={() => handleDelete(leader)}
                      disabled={isUpdating === leader.uid}
                      title="حذف"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
