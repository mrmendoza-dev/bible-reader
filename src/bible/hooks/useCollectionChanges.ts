import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef } from "react";
import { db } from "@/bible/storage/db";

export function useCollectionChanges(onChange: () => void) {
  const callback = useRef(onChange);
  callback.current = onChange;
  const snapshot = useLiveQuery(async () => {
    try {
      return await db.transaction(
        "r",
        db.savedVerses,
        db.lists,
        db.listItems,
        db.bookmarks,
        () =>
          Promise.all([
            db.savedVerses.toArray(),
            db.lists.toArray(),
            db.listItems.toArray(),
            db.bookmarks.toArray(),
          ]),
      );
    } catch {
      // Let the screen's service read surface a storage error without blocking reading.
      return null;
    }
  }, []);
  useEffect(() => {
    if (snapshot !== undefined) callback.current();
  }, [snapshot]);
}
