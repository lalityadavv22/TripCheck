import { useEffect, useState } from 'react';
import { isValidStoredData } from '../utils/validation';

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`tripcheck:${key}`);
      if (!raw) return initial;
      const parsed = JSON.parse(raw);
      if (!isValidStoredData(key, parsed)) return initial;
      if (Array.isArray(initial))
        return Array.isArray(parsed) ? parsed : initial;
      if (initial && typeof initial === 'object')
        return parsed &&
          typeof parsed === 'object' &&
          Object.keys(initial).every((k) => k in parsed)
          ? parsed
          : initial;
      return typeof parsed === typeof initial ? parsed : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(`tripcheck:${key}`, JSON.stringify(value));
    } catch {
      window.dispatchEvent(new Event('tripcheck:storage-error'));
    }
  }, [key, value]);
  return [value, setValue] as const;
}
