import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: 'text-red-600 bg-red-50',
    high: 'text-orange-600 bg-orange-50',
    medium: 'text-yellow-600 bg-yellow-50',
    low: 'text-green-600 bg-green-50',
  };
  return colors[severity] || 'text-gray-600 bg-gray-50';
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    open: 'text-blue-600 bg-blue-50',
    investigating: 'text-purple-600 bg-purple-50',
    resolved: 'text-green-600 bg-green-50',
    falsePositive: 'text-gray-600 bg-gray-50',
    ignored: 'text-gray-400 bg-gray-100',
  };
  return colors[status] || 'text-gray-600 bg-gray-50';
}
