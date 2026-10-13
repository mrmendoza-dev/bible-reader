import { useCallback, useEffect, useRef, useState } from "react";

type StoredItem<T> = {
  value: T;
  expiry?: number;
};

/** Synchronize hook instances in this tab; storage events cover other tabs. */
const keySubscribers = new Map<string, Set<() => void>>();

const subscribeKey = (key: string, cb: () => void): (() => void) => {
  let set = keySubscribers.get(key);
  if (!set) {
    set = new Set();
    keySubscribers.set(key, set);
  }
  set.add(cb);
  return () => {
    set.delete(cb);
    if (set.size === 0) keySubscribers.delete(key);
  };
};

const notifyKey = (key: string): void => {
  const set = keySubscribers.get(key);
  if (!set) return;
  for (const cb of set) cb();
};

/** Read + validate the wrapped value for a key, falling back to `initialValue`. */
const readStored = <T>(
  key: string,
  initialValue: T,
  isValid?: (value: unknown) => boolean,
): T => {
  if (typeof window === "undefined") return initialValue;

  try {
    const item = window.localStorage.getItem(key);
    if (!item) return initialValue;

    const parsed = JSON.parse(item);

    // Guard against legacy / malformed entries that aren't wrapped as { value, expiry }.
    // Without this, primitives like `50` stored under the same key cause `parsed.value`
    // to be `undefined`, which silently propagates through consumers (e.g. NaN on audio.volume).
    if (parsed === null || typeof parsed !== "object" || !("value" in parsed)) {
      window.localStorage.removeItem(key);
      return initialValue;
    }

    const wrapped = parsed as StoredItem<T>;

    if (wrapped.expiry && Date.now() > wrapped.expiry) {
      window.localStorage.removeItem(key);
      return initialValue;
    }

    if (isValid && !isValid(wrapped.value)) {
      window.localStorage.removeItem(key);
      return initialValue;
    }
    return wrapped.value === undefined ? initialValue : wrapped.value;
  } catch {
    return initialValue;
  }
};

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  ttlMs?: number,
  isValid?: (value: unknown) => boolean,
): [
  T,
  (value: T | ((prev: T) => T), customTtlMs?: number) => void,
  () => void,
] {
  const [storedValue, setStoredValue] = useState<T>(() =>
    readStored(key, initialValue, isValid),
  );

  // Keep the latest initialValue without making the sync effect re-run when a
  // caller passes a new inline default object every render.
  const validationRef = useRef(isValid);
  validationRef.current = isValid;
  const initialRef = useRef(initialValue);
  initialRef.current = initialValue;

  // The value as of the last render *or* the last `setValue` call, whichever is later — what a
  // functional update is applied to. This must not live inside the React updater: `notifyKey`
  // below makes every instance (this one included) re-read storage, and React only runs an
  // updater eagerly when the fiber has no pending lanes, which after any update is true only every
  // other time. On the off cycle the re-read saw the *previous* value, and its `set(previous)`
  // landed after the updater and won — a controlled input backed by this hook dropped every second
  // keystroke. Writing storage before anything is scheduled makes the re-read always fresh.
  const latestRef = useRef(storedValue);
  latestRef.current = storedValue;

  const setValue = useCallback(
    (value: T | ((prev: T) => T), customTtlMs?: number) => {
      if (typeof window === "undefined") {
        console.warn("localStorage is not available");
        return;
      }

      try {
        const valueToStore =
          value instanceof Function ? value(latestRef.current) : value;
        if (validationRef.current && !validationRef.current(valueToStore))
          return;
        latestRef.current = valueToStore;
        setStoredValue(valueToStore);
        const ttl = customTtlMs ?? ttlMs;
        const expiry = ttl ? Date.now() + ttl : undefined;
        const item: StoredItem<T> = expiry
          ? { value: valueToStore, expiry }
          : { value: valueToStore };

        window.localStorage.setItem(key, JSON.stringify(item));
        latestRef.current = valueToStore;
        setStoredValue(valueToStore);
        // Notify other instances in this realm (same tab + PiP) to re-read.
        notifyKey(key);
      } catch (error) {
        console.error(error);
      }
    },
    [key, ttlMs],
  );

  const removeValue = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
      latestRef.current = initialRef.current;
      setStoredValue(initialRef.current);
      notifyKey(key);
    } catch (error) {
      console.error(error);
    }
  }, [key]);

  // Stay in sync when the key changes elsewhere: same-realm via the bus (other
  // hook instances, PiP windows), cross-tab via the native `storage` event.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const resync = () =>
      setStoredValue(
        readStored(key, initialRef.current, validationRef.current),
      );
    // Adopt the current value on (re)subscribe in case it changed between the
    // initial render and this effect, or the `key` prop changed.
    resync();

    const unsubscribe = subscribeKey(key, resync);
    const onStorage = (e: StorageEvent) => {
      // e.key === null on localStorage.clear()
      if (e.key === key || e.key === null) resync();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      unsubscribe();
      window.removeEventListener("storage", onStorage);
    };
  }, [key]);

  return [storedValue, setValue, removeValue];
}
