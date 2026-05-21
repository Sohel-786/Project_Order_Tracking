"use client";

import { useState, useEffect } from "react";

/**
 * Returns a value that updates only after the input has been stable for `delay` ms.
 * Use for search inputs to avoid API calls on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
