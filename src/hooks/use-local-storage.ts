import { useState } from "react";

type StoredPayload<T> = { value: T; expiry?: number };

export const useLocalStorage = <T>(
  key: string,
  initialValue: T,
  ttl?: number,
): [
  T,
  (value: T | ((prev: T) => T), customTtl?: number) => void,
  () => void,
] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);

      if (!item) {
        return initialValue;
      }

      const parsedItem = JSON.parse(item) as StoredPayload<T> | T;

      if (
        typeof parsedItem === "object" &&
        parsedItem !== null &&
        "expiry" in parsedItem &&
        typeof parsedItem.expiry === "number" &&
        Date.now() > parsedItem.expiry
      ) {
        window.localStorage.removeItem(key);
        return initialValue;
      }

      if (
        typeof parsedItem === "object" &&
        parsedItem !== null &&
        "value" in parsedItem
      ) {
        return parsedItem.value as T;
      }

      return parsedItem as T;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T), customTtl?: number) => {
    if (typeof window === "undefined") {
      console.warn("localStorage is not available in the current environment");
      return;
    }

    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;

      const effectiveTtl = customTtl ?? ttl;

      const itemToStore: StoredPayload<T> = effectiveTtl
        ? {
            value: valueToStore,
            expiry: Date.now() + effectiveTtl,
          }
        : { value: valueToStore };

      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(itemToStore));
    } catch (error) {
      console.error(error);
    }
  };

  const removeValue = () => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue, removeValue];
};
