import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge class lists, resolving Tailwind conflicts (last wins). */
export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(...inputs))
}
