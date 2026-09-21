export type ScoreCategory = 'liturgy' | 'attendance' | 'participation';

export const CATEGORY_NAMES_AR: Record<ScoreCategory, string> = {
  liturgy: 'القداس',
  attendance: 'الحضور',
  participation: 'المشاركة'
};

export interface LeaderUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'leader';
  isAuthorized: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Child {
  id: string;
  name: string;
  photoUrl?: string;
  totalPoints: number;
  liturgyPoints: number;
  attendancePoints: number;
  participationPoints: number;
  lastScoreDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScoreRecord {
  id: string;
  childId: string;
  childName?: string;
  category: ScoreCategory;
  points: number;
  weekId: string; // e.g. "2026-W38-09-18"
  weekDate: string; // e.g. "الجمعة 18 سبتمبر 2026"
  leaderId: string;
  leaderName: string;
  createdAt: string;
  note?: string;
}

export interface FridayWeek {
  id: string;
  dateStr: string;
  label: string;
  isCurrent: boolean;
  timestamp: number;
}
