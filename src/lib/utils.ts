import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatRelativeDate(date: string | Date): string {
  const now = new Date()
  const target = new Date(date)
  const diff = target.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days > 0 && days <= 7) return `In ${days} days`
  if (days < 0 && days >= -7) return `${Math.abs(days)} days ago`
  return formatDate(date)
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function getDaysUntil(date: string | Date): number {
  const now = new Date()
  const target = new Date(date)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function getRiskColor(score: number): string {
  if (score < 30) return '#3b8f31'
  if (score < 60) return '#f4843a'
  if (score < 80) return '#d96520'
  return '#ba1a1a'
}

export function getRiskLabel(score: number): string {
  if (score < 30) return 'Low Risk'
  if (score < 60) return 'Medium Risk'
  if (score < 80) return 'High Risk'
  return 'Critical'
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}
