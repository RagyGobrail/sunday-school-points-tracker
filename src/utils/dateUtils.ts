import { FridayWeek } from '../types';

// Arabic day and month names
const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

/**
 * Format a Date object into Arabic Friday label
 * e.g., "الجمعة 19 سبتمبر 2026"
 */
export function formatArabicDate(date: Date): string {
  const day = date.getDate();
  const month = ARABIC_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `الجمعة ${day} ${month} ${year}`;
}

/**
 * Format date time to Arabic string
 */
export function formatArabicDateTime(isoOrTimestamp: string | number | Date): string {
  const d = new Date(isoOrTimestamp);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = ARABIC_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const period = hours >= 12 ? 'م' : 'ص';
  hours = hours % 12 || 12;
  return `${day} ${month} ${year} - ${hours}:${minutes} ${period}`;
}

/**
 * Gets the most recent Friday (or today if today is Friday)
 */
export function getCurrentFridayDate(baseDate: Date = new Date()): Date {
  const date = new Date(baseDate);
  const dayOfWeek = date.getDay(); // 0 is Sunday, 5 is Friday
  
  // Difference to reach the previous or current Friday
  // If Friday (5): diff = 0
  // If Saturday (6): diff = -1
  // If Sunday (0): diff = -2
  // If Monday (1): diff = -3
  // If Tuesday (2): diff = -4
  // If Wednesday (3): diff = -5
  // If Thursday (4): diff = -6
  let diff = (dayOfWeek - 5 + 7) % 7;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Creates unique ID for a Friday week: e.g. "2026-09-18"
 */
export function getFridayWeekId(friday: Date): string {
  const year = friday.getFullYear();
  const month = (friday.getMonth() + 1).toString().padStart(2, '0');
  const day = friday.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns a list of past N Fridays including current one
 */
export function getRecentFridays(count: number = 12): FridayWeek[] {
  const currentFriday = getCurrentFridayDate();
  const fridays: FridayWeek[] = [];

  for (let i = 0; i < count; i++) {
    const f = new Date(currentFriday);
    f.setDate(f.getDate() - (i * 7));
    const id = getFridayWeekId(f);
    fridays.push({
      id,
      dateStr: f.toISOString(),
      label: formatArabicDate(f),
      isCurrent: i === 0,
      timestamp: f.getTime()
    });
  }

  return fridays;
}
