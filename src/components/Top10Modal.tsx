import React, { useRef, useState } from 'react';
import { Child } from '../types';
import { toPng } from 'html-to-image';
import { Download, Share2, Award, Sparkles, X, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Top10ModalProps {
  isOpen: boolean;
  onClose: () => void;
  childrenList: Child[];
  weekLabel: string;
}

export const Top10Modal: React.FC<Top10ModalProps> = ({
  isOpen,
  onClose,
  childrenList,
  weekLabel,
}) => {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  // Sort descending by totalPoints
  const top10 = [...childrenList]
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 10);

  const triggerConfetti = () => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  const handleDownloadImage = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      triggerConfetti();
      const dataUrl = await toPng(exportRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = `top10-sunday-school-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
      
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('حدث خطأ أثناء حفظ الصورة');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareImage = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(exportRef.current, {
        quality: 0.95,
        pixelRatio: 2,
      });

      // Convert dataUrl to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'top10-sunday-school.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: '🏆 أفضل 10 - مدارس الأحد',
          text: `لوحة المتصدرين لأفضل 10 في فصل مدارس الأحد - ${weekLabel}`,
        });
      } else {
        // Fallback to download
        handleDownloadImage();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Share not supported, downloading instead:', err);
        handleDownloadImage();
      }
    } finally {
      setIsExporting(false);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { bg: 'bg-amber-400 text-amber-950 font-black', icon: '🥇', label: 'المركز الأول' };
    if (rank === 2) return { bg: 'bg-slate-300 text-slate-900 font-bold', icon: '🥈', label: 'المركز الثاني' };
    if (rank === 3) return { bg: 'bg-amber-700/20 text-amber-900 font-bold border border-amber-600/30', icon: '🥉', label: 'المركز الثالث' };
    return { bg: 'bg-slate-100 text-slate-700 font-semibold', icon: `${rank}`, label: `المركز ${rank}` };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-slate-50">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-indigo-600/10 text-indigo-600">
              <Award className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">أفضل 10</h2>
              <p className="text-xs text-slate-500 font-medium">{weekLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons Top Bar */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex flex-wrap gap-2.5 items-center justify-between">
          <p className="text-xs text-slate-600 font-medium">
            جاهزة للعرض على الأطفال، مجموعات الواتساب، أو شاشة العرض (Projector)
          </p>
          <div className="flex items-center gap-2">
            <button
              id="save-top10-image-btn"
              onClick={handleDownloadImage}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'جاري التجهيز...' : 'حفظ كصورة'}</span>
            </button>
            <button
              id="share-top10-image-btn"
              onClick={handleShareImage}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              <span>مشاركة</span>
            </button>
          </div>
        </div>

        {exportSuccess && (
          <div className="mx-6 mt-3 p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>تم حفظ صورة أفضل 10 بنجاح في جهازك!</span>
          </div>
        )}

        {/* Exportable Canvas Container */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[70vh]">
          <div
            ref={exportRef}
            id="top10-exportable-card"
            className="w-full bg-gradient-to-b from-amber-50 via-white to-amber-50/60 p-6 sm:p-8 rounded-2xl border-2 border-amber-300/80 shadow-lg text-slate-900 relative"
            dir="rtl"
          >
            {/* Church Top Ornament */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 text-amber-950 font-black text-2xl shadow-md mb-2">
                ✟
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                🏆 أفضل 10
              </h1>
            </div>

            {/* List */}
            {top10.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-medium">
                لم يتم تسجيل أي نقاط حتى الآن
              </div>
            ) : (
              <div className="space-y-2.5">
                {top10.map((child, idx) => {
                  const rank = idx + 1;
                  const badge = getRankBadge(rank);
                  const isPodium = rank <= 3;

                  return (
                    <div
                      key={child.id}
                      className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl transition-all ${
                        isPodium
                          ? 'bg-white shadow-sm border border-amber-200/90 ring-1 ring-amber-300/40'
                          : 'bg-white/80 border border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shadow-xs ${badge.bg}`}
                        >
                          {badge.icon}
                        </span>
                        <div>
                          <div className="font-extrabold text-base sm:text-lg text-slate-800 flex items-center gap-1.5">
                            <span>{child.gender === 'girl' ? '👧' : '👦'}</span>
                            <span>{child.name}</span>
                          </div>
                          <div className="text-[11px] font-semibold text-slate-500">
                            {badge.label}
                          </div>
                        </div>
                      </div>

                      <div className="text-left">
                        <span className="text-lg sm:text-xl font-black text-amber-600">
                          {child.totalPoints}
                        </span>
                        <span className="text-xs font-bold text-slate-500 mr-1">نقطة</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
