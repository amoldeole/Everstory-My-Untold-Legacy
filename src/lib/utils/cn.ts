import clsx, { type ClassValue } from "clsx";

/** Tiny class-name combiner. Small enough that a dependency would be silly. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
