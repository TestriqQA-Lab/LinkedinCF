import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatInTimeZone } from "date-fns-tz";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, timezone?: string): string {
  if (timezone) {
    return formatInTimeZone(new Date(date), timezone, "MMM d, yyyy");
  }
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getWeekDates(weekNumber: number, year: number, month: number): Date[] {
  const firstDay = new Date(year, month - 1, 1);
  const dayOfWeek = firstDay.getDay();
  const startOffset = (weekNumber - 1) * 7 - dayOfWeek;
  const weekStart = new Date(year, month - 1, 1 + startOffset);

  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

export function getPostTypeColor(type: string): string {
  const colors: Record<string, string> = {
    "thought-leadership": "bg-blue-100 text-blue-800 border-blue-200",
    tips: "bg-green-100 text-green-800 border-green-200",
    story: "bg-purple-100 text-purple-800 border-purple-200",
    question: "bg-orange-100 text-orange-800 border-orange-200",
    listicle: "bg-pink-100 text-pink-800 border-pink-200",
  };
  return colors[type] || "bg-gray-100 text-gray-800 border-gray-200";
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    ready: "bg-green-100 text-green-700",
    published: "bg-blue-100 text-blue-700",
  };
  return colors[status] || "bg-gray-100 text-gray-600";
}
