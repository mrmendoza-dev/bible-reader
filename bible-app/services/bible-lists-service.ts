// Supabase service for Bible verse lists (organizing saved verses)
import type {
  ListPage,
  ListQuery,
  ListQuerySupport,
} from "@omni/app-contracts/data/list-query";
import {
  type AuthenticatedDocument,
  AuthenticatedService,
  type ListPageConfig,
} from "@omni/services/supabase/authenticated-service";
import { getSupabaseClient } from "@omni/services/supabase/supabase-config";
import type { SavedVerse } from "./bible-verses-service";
import { getVerseKey } from "./bible-verses-service";

export const DEFAULT_BIBLE_LIST_NAME = "Saved";

export interface BibleList extends AuthenticatedDocument {
  name: string;
  description: string | null;
  is_default: boolean;
  sort_order: number;
}

export type DeleteListMode = "move" | "delete-verses";

export const bibleListsListSupport: ListQuerySupport = {
  sort: ["created_at", "updated_at", "name", "sort_order"],
  defaultOrder: "asc",
  q: true,
};

const bibleListsListConfig: ListPageConfig = {
  support: bibleListsListSupport,
  searchColumns: ["name"],
};

class BibleListsService extends AuthenticatedService<BibleList> {
  constructor() {
    super("bible_lists");
  }

  async listLists(query: ListQuery = {}): Promise<ListPage<BibleList>> {
    return this.listPage(query, bibleListsListConfig);
  }

  async getLists(): Promise<BibleList[]> {
    const lists = await this.getAllOrdered("sort_order", "asc");
    return lists.sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name);
    });
  }

  async ensureDefaultList(): Promise<BibleList> {
    const lists = await this.getLists();
    const existing = lists.find((l) => l.is_default);
    if (existing) return existing;

    const id = await this.create({
      name: DEFAULT_BIBLE_LIST_NAME,
      description: null,
      is_default: true,
      sort_order: 0,
    });
    const created = await this.getById(id);
    if (!created) {
      throw new Error("Failed to create default Bible list");
    }
    return created;
  }

  async getDefaultList(): Promise<BibleList> {
    return this.ensureDefaultList();
  }

  async createList(name: string): Promise<string> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("List name cannot be empty");
    }

    const lists = await this.getLists();
    const maxSort = lists.reduce((max, l) => Math.max(max, l.sort_order), 0);

    return this.create({
      name: trimmed,
      description: null,
      is_default: false,
      sort_order: maxSort + 1,
    });
  }

  async renameList(id: string, name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("List name cannot be empty");
    }

    const list = await this.getById(id);
    if (!list) {
      throw new Error("List not found");
    }
    if (list.is_default) {
      throw new Error("The default Saved list cannot be renamed");
    }

    await this.update(id, { name: trimmed });
  }

  async deleteList(id: string, mode: DeleteListMode): Promise<void> {
    const list = await this.getById(id);
    if (!list) {
      throw new Error("List not found");
    }
    if (list.is_default) {
      throw new Error("The default Saved list cannot be deleted");
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase client is not available");
    }

    const { data: items, error: itemsError } = await supabase
      .from("bible_list_items")
      .select("verse_id")
      .eq("list_id", id);

    if (itemsError) throw itemsError;

    const verseIds = (items ?? []).map((row) => row.verse_id as string);

    if (mode === "move") {
      const defaultList = await this.ensureDefaultList();
      if (verseIds.length > 0) {
        const rows = verseIds.map((verseId) => ({
          list_id: defaultList.id,
          verse_id: verseId,
        }));
        const { error: insertError } = await supabase
          .from("bible_list_items")
          .upsert(rows, { onConflict: "list_id,verse_id", ignoreDuplicates: true });
        if (insertError) throw insertError;
      }
    } else {
      for (const verseId of verseIds) {
        const { data: memberships, error: membershipError } = await supabase
          .from("bible_list_items")
          .select("list_id")
          .eq("verse_id", verseId);

        if (membershipError) throw membershipError;

        const onlyInThisList =
          (memberships ?? []).length === 1 &&
          memberships?.[0]?.list_id === id;

        if (onlyInThisList) {
          const { error: deleteVerseError } = await supabase
            .from("bible_verses")
            .delete()
            .eq("id", verseId);
          if (deleteVerseError) throw deleteVerseError;
        }
      }
    }

    await this.delete(id);
  }

  async addVerseToList(verseId: string, listId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase client is not available");
    }

    const { error } = await supabase
      .from("bible_list_items")
      .upsert(
        { list_id: listId, verse_id: verseId },
        { onConflict: "list_id,verse_id", ignoreDuplicates: true },
      );

    if (error) throw error;
  }

  async addVerseToLists(verseId: string, listIds: string[]): Promise<void> {
    for (const listId of listIds) {
      await this.addVerseToList(verseId, listId);
    }
  }

  async addVerseToDefaultList(verseId: string): Promise<void> {
    const defaultList = await this.ensureDefaultList();
    await this.addVerseToList(verseId, defaultList.id);
  }

  async removeVerseFromList(verseId: string, listId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase client is not available");
    }

    const { error } = await supabase
      .from("bible_list_items")
      .delete()
      .eq("list_id", listId)
      .eq("verse_id", verseId);

    if (error) throw error;
  }

  async setVerseLists(verseId: string, listIds: string[]): Promise<void> {
    const current = await this.getListIdsForVerse(verseId);
    const target = new Set(listIds);
    const toAdd = listIds.filter((id) => !current.includes(id));
    const toRemove = current.filter((id) => !target.has(id));

    await this.addVerseToLists(verseId, toAdd);
    for (const listId of toRemove) {
      await this.removeVerseFromList(verseId, listId);
    }
  }

  async getListIdsForVerse(verseId: string): Promise<string[]> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase client is not available");
    }

    const { data, error } = await supabase
      .from("bible_list_items")
      .select("list_id")
      .eq("verse_id", verseId);

    if (error) throw error;
    return (data ?? []).map((row) => row.list_id as string);
  }

  async getListsForVerse(verseId: string): Promise<BibleList[]> {
    const listIds = await this.getListIdsForVerse(verseId);
    if (listIds.length === 0) return [];

    const lists = await this.getLists();
    const idSet = new Set(listIds);
    return lists.filter((l) => idSet.has(l.id));
  }

  async getVerseIdsForList(listId: string): Promise<string[]> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase client is not available");
    }

    const { data, error } = await supabase
      .from("bible_list_items")
      .select("verse_id")
      .eq("list_id", listId);

    if (error) throw error;
    return (data ?? []).map((row) => row.verse_id as string);
  }

  async getVersesForListFilter(
    listId: string | "all",
  ): Promise<SavedVerse[]> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Supabase client is not available");
    }

    const userId = await this.getUserIdAsync();

    if (listId === "all") {
      const { data, error } = await supabase
        .from("bible_verses")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const verses = (data ?? []) as SavedVerse[];
      return dedupeVerses(verses);
    }

    const list = await this.getById(listId);
    if (!list) {
      throw new Error("List not found");
    }

    const verseIds = await this.getVerseIdsForList(listId);
    if (verseIds.length === 0) return [];

    const { data, error } = await supabase
      .from("bible_verses")
      .select("*")
      .eq("user_id", userId)
      .in("id", verseIds)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as SavedVerse[];
  }
}

const dedupeVerses = (verses: SavedVerse[]): SavedVerse[] => {
  const seen = new Set<string>();
  const result: SavedVerse[] = [];

  for (const verse of verses) {
    const key = getVerseKey(
      verse.book_id,
      verse.chapter,
      verse.verse,
      verse.translation,
    );
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(verse);
  }

  return result;
};

export const bibleListsService = new BibleListsService();
