import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  isBefore,
  isToday,
  parseISO,
  getDay,
  startOfWeek,
  addDays,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/New_York';

export function getCurrentDateET(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy');
}

export function getWeekdaysInMonth(date: Date): Date[] {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const days = eachDayOfInterval({ start, end });
  return days.filter((day) => !isWeekend(day));
}

export function getAllDaysInMonth(date: Date): Date[] {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return eachDayOfInterval({ start, end });
}

export function getMonthGridDays(date: Date): (Date | null)[] {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const days = eachDayOfInterval({ start, end });

  // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = getDay(start);
  // Convert to Monday-based (0 = Monday, 6 = Sunday)
  const mondayBasedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Add null placeholders for days before the 1st
  const gridDays: (Date | null)[] = [];
  for (let i = 0; i < mondayBasedFirstDay; i++) {
    gridDays.push(null);
  }

  // Add all days of the month
  days.forEach((day) => gridDays.push(day));

  return gridDays;
}

export function isWeekendDay(date: Date): boolean {
  return isWeekend(date);
}

export function isPastDay(date: Date): boolean {
  const today = getCurrentDateET();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return isBefore(dateStart, todayStart);
}

export function isTodayET(date: Date): boolean {
  const today = getCurrentDateET();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export function parseDate(dateString: string): Date {
  return parseISO(dateString);
}

export const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
export const WEEKDAY_LABELS_NO_WEEKEND = ['M', 'T', 'W', 'T', 'F'];

export function getFirstTrackingDay(logs: Record<string, unknown>): Date | null {
  const dates = Object.keys(logs).sort();
  if (dates.length === 0) return null;
  return parseISO(dates[0]);
}

export function getWeekdaysInRange(start: Date, end: Date): Date[] {
  const days = eachDayOfInterval({ start, end });
  return days.filter((day) => !isWeekend(day));
}
