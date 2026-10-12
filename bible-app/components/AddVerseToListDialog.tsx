import type { BibleList } from "@apps/production/bible-app/services/bible-lists-service";
import { bibleListsService } from "@apps/production/bible-app/services/bible-lists-service";
import { reportError } from "@omni/app-contracts/errors/error-sink";
import { Button } from "@omni/ui-base/button";
import { Checkbox } from "@omni/ui-base/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@omni/ui-base/dialog";
import { Input } from "@omni/ui-base/input";
import { Spinner } from "@omni/ui-base/spinner";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type AddVerseToListDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  verseId: string | null;
  verseLabel: string;
  onSaved?: () => void;
};

export const AddVerseToListDialog = ({
  open,
  onOpenChange,
  verseId,
  verseLabel,
  onSaved,
}: AddVerseToListDialogProps) => {
  const [lists, setLists] = useState<BibleList[]>([]);
  const [checkedListIds, setCheckedListIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);

  const loadLists = useCallback(async () => {
    if (!verseId) return;
    setLoading(true);
    try {
      const allLists = await bibleListsService.getLists();
      const memberIds = await bibleListsService.getListIdsForVerse(verseId);
      setLists(allLists);
      setCheckedListIds(new Set(memberIds));
    } catch (err) {
      reportError(err, {
        code: "bible/lists-load",
        userMessage: "Failed to load lists.",
        expected: true,
      });
    } finally {
      setLoading(false);
    }
  }, [verseId]);

  useEffect(() => {
    if (open && verseId) {
      void loadLists();
    }
  }, [open, verseId, loadLists]);

  const toggleList = (listId: string, checked: boolean) => {
    setCheckedListIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(listId);
      else next.delete(listId);
      return next;
    });
  };

  const handleCreateList = async () => {
    const trimmed = newListName.trim();
    if (!trimmed) return;

    setCreatingList(true);
    try {
      const id = await bibleListsService.createList(trimmed);
      const allLists = await bibleListsService.getLists();
      setLists(allLists);
      setCheckedListIds((prev) => new Set([...prev, id]));
      setNewListName("");
      toast.success("List created");
    } catch (err) {
      reportError(err, {
        code: "bible/list-create",
        userMessage: "Failed to create list.",
      });
    } finally {
      setCreatingList(false);
    }
  };

  const handleSave = async () => {
    if (!verseId) return;

    setSaving(true);
    try {
      await bibleListsService.setVerseLists(verseId, [...checkedListIds]);
      toast.success("Success", { description: "Verse lists updated." });
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      reportError(err, {
        code: "bible/lists-update",
        userMessage: "Failed to update lists.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to List</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{verseLabel}</p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <div className="space-y-3 max-h-[40vh] overflow-y-auto">
            {lists.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No lists yet. Create one below.
              </p>
            ) : (
              lists.map((list) => (
                <label
                  key={list.id}
                  className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/40"
                >
                  <Checkbox
                    checked={checkedListIds.has(list.id)}
                    onCheckedChange={(checked) =>
                      toggleList(list.id, checked === true)
                    }
                  />
                  <span className="text-sm font-medium flex-1">
                    {list.name}
                  </span>
                  {list.is_default && (
                    <span className="text-xs text-muted-foreground">
                      Default
                    </span>
                  )}
                </label>
              ))
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="New list name"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreateList();
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!newListName.trim() || creatingList}
            onClick={() => void handleCreateList()}
            aria-label="Create list"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={!verseId || saving || loading}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
