import React from 'react';
import { Wifi, WifiOff, CloudCheck, AlertTriangle } from 'lucide-react';

interface ConnectionStatusBadgeProps {
  isOnline: boolean;
  pendingSyncCount?: number;
}

export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({ isOnline, pendingSyncCount = 0 }) => {
  return (
    <div 
      id="connection-status-badge"
      title={isOnline ? 'متزامن ومباشر مع قاعدة البيانات' : 'غير متصل (حفظ محلي)'}
      className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold transition-all shrink-0 ${
        isOnline 
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70' 
          : 'bg-amber-50 text-amber-700 border border-amber-200'
      }`}
    >
      {isOnline ? (
        <>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
          <span className="hidden sm:inline">متزامن ومباشر</span>
          <span className="sm:hidden text-[10px]">مباشر</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="hidden sm:inline">غير متصل (حفظ محلي)</span>
          <span className="sm:hidden text-[10px]">أوفلاين</span>
          {pendingSyncCount > 0 && (
            <span className="bg-amber-200 text-amber-900 rounded-full px-1.5 py-0.2 text-[10px] font-black">
              {pendingSyncCount}
            </span>
          )}
        </>
      )}
    </div>
  );
};
