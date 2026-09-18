import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Turn a zod validation error payload into a readable sentence. */
export function friendlyError(message: string) {
  try {
    const parsed = JSON.parse(message) as { message?: string }[];
    return parsed[0]?.message ?? message;
  } catch {
    return message;
  }
}
