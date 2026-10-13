import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useCollectionChanges } from "@/bible/hooks/useCollectionChanges";
import { BibleDatabase, db, newRecord } from "@/bible/storage/db";

beforeEach(async () => {
  await db.delete();
  await db.open();
});
afterEach(() => {
  cleanup();
  db.close();
});

it("invalidates mounted collections after another database connection writes", async () => {
  const onChange = vi.fn();
  renderHook(() => useCollectionChanges(onChange));
  await waitFor(() => expect(onChange).toHaveBeenCalled());
  const previous = onChange.mock.calls.length;
  const other = new BibleDatabase();
  await other.open();
  try {
    await act(async () => {
      await other.lists.add({
        ...newRecord(),
        name: "From another connection",
        description: null,
        is_default: false,
        sort_order: 1,
      });
    });
    await waitFor(() =>
      expect(onChange.mock.calls.length).toBeGreaterThan(previous),
    );
  } finally {
    other.close();
  }
});
