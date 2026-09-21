import React, { useState } from 'react';
import { Child } from '../types';
import { Trophy, Search, Award, Medal, Star, ChevronLeft } from 'lucide-react';

interface LeaderboardScreenProps {
  childrenList: Child[];
  onOpenTop10: () => void;
  onSelectChild: (child: Child) => void;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  childrenList,
  onOpenTop10,
  onSelectChild
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'boy' | 'girl'>('all');

  // Filter by gender first, then sort descending by total points
  const genderFilteredList = childrenList.filter(c => {
    if (genderFilter === 'all') return true;
    return (c.gender || 'boy') === genderFilter;
  });

  const sortedChildren = [...genderFilteredList].sort((a, b) => b.totalPoints - a.totalPoints);

  const filteredChildren = sortedChildren.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRankDecoration = (rank: number) => {
    if (rank === 1) {
      return {
        badge: '🥇 الأول',
        bg: 'bg-amber-100 text-amber-900 border-amber-300 font-black',
        icon: <Trophy className="w-5 h-5 text-amber-600 inline" />
      };
    }
    if (rank === 2) {
      return {
        badge: '🥈 الثاني',
        bg: 'bg-slate-200 text-slate-800 border-slate-300 font-bold',
        icon: <Medal className="w-5 h-5 text-slate-500 inline" />
      };
    }
    if (rank === 3) {
      return {
        badge: '🥉 الثالث',
        bg: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
        icon: <Medal className="w-5 h-5 text-amber-700 inline" />
      };
    }
    return {
      badge: `${rank}`,
      bg: 'bg-slate-50 text-slate-600 border-slate-200',
      icon: null
    };
  };

  return (
    <div id="leaderboard-view" className="space-y-4">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-xs mb-1">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>لوحة المتصدرين والشرف</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">ترتيب درجات أطفال الفصل</h2>
          <p className="text-xs text-slate-500 font-medium">الترتيب التراكمي المحدث لحظياً لجميع الأطفال</p>
        </div>

        <button
          id="export-top10-image-btn"
          onClick={onOpenTop10}
          className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition active:scale-95 flex items-center justify-center gap-2"
        >
          <Award className="w-4 h-4" />
          <span>تصدير صورة أفضل 10</span>
        </button>
      </div>

      {/* Search Input & Gender Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
          <input
            id="leaderboard-search"
            type="text"
            placeholder="ابحث عن اسم طفل في لوحة الشرف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[44px] pr-10 pl-3 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold"
          />
        </div>

        {/* Gender Filter Buttons */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setGenderFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition ${
              genderFilter === 'all'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الكل ({childrenList.length})
          </button>
          <button
            type="button"
            onClick={() => setGenderFilter('boy')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1 ${
              genderFilter === 'boy'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>👦</span>
            <span>بنين ({childrenList.filter(c => (c.gender || 'boy') === 'boy').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setGenderFilter('girl')}
            className={`px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1 ${
              genderFilter === 'girl'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>👧</span>
            <span>بنات ({childrenList.filter(c => c.gender === 'girl').length})</span>
          </button>
        </div>
      </div>

      {/* Leaderboard Cards / List */}
      {filteredChildren.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <p className="text-base font-bold text-slate-600">لا توجد نتائج مطابقة</p>
          <p className="text-xs text-slate-400 mt-1">جرب تغيير فلتر البحث أو التصنيف</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Mobile-optimized cards */}
          <div className="grid grid-cols-1 gap-2 sm:hidden">
            {filteredChildren.map((child) => {
              const rank = sortedChildren.findIndex(c => c.id === child.id) + 1;
              const rankInfo = getRankDecoration(rank);

              return (
                <div
                  key={child.id}
                  onClick={() => onSelectChild(child)}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 active:bg-amber-50/50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center justify-center min-w-[36px] h-9 px-2 rounded-xl text-xs border font-black ${rankInfo.bg}`}>
                      {rankInfo.badge}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{child.gender === 'girl' ? '👧' : '👦'}</span>
                        <h4 className="font-extrabold text-sm text-slate-900">{child.name}</h4>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mt-0.5">
                        <span className="text-amber-800">قداس: {child.liturgyPoints || 0}</span>
                        <span>•</span>
                        <span className="text-blue-700">حضور: {child.attendancePoints || 0}</span>
                        <span>•</span>
                        <span className="text-emerald-700">مشاركة: {child.participationPoints || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-left">
                      <span className="text-base font-black text-amber-800 px-2.5 py-1 bg-amber-50 rounded-xl border border-amber-200 inline-block">
                        {child.totalPoints}
                      </span>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold text-slate-500">
                  <th className="py-3 px-4">المركز</th>
                  <th className="py-3 px-4">اسم الطفل</th>
                  <th className="py-3 px-3 text-center">القداس</th>
                  <th className="py-3 px-3 text-center">الحضور</th>
                  <th className="py-3 px-3 text-center">المشاركة</th>
                  <th className="py-3 px-4 text-left">المجموع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredChildren.map((child) => {
                  const rank = sortedChildren.findIndex(c => c.id === child.id) + 1;
                  const rankInfo = getRankDecoration(rank);

                  return (
                    <tr
                      key={child.id}
                      onClick={() => onSelectChild(child)}
                      className="hover:bg-amber-50/50 cursor-pointer transition"
                    >
                      <td className="py-3.5 px-4 font-bold">
                        <span className={`inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-xl text-xs border font-black ${rankInfo.bg}`}>
                          {rankInfo.badge}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span>{child.gender === 'girl' ? '👧' : '👦'}</span>
                          <span>{child.name}</span>
                          {rank === 1 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-amber-500 text-white font-black">
                              الأول
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center font-semibold text-amber-700">
                        {child.liturgyPoints || 0}
                      </td>

                      <td className="py-3.5 px-3 text-center font-semibold text-blue-700">
                        {child.attendancePoints || 0}
                      </td>

                      <td className="py-3.5 px-3 text-center font-semibold text-emerald-700">
                        {child.participationPoints || 0}
                      </td>

                      <td className="py-3.5 px-4 text-left font-black text-slate-900 text-base">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-900">
                          {child.totalPoints}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
