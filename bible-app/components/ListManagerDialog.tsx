import type { BibleList } from "@apps/production/bible-app/services/bible-lists-service";
import {
  bibleListsService,
  type DeleteListMode,
} from "@apps/production/bible-app/services/bible-lists-service";
import { reportError } from "@omni/app-contracts/errors/error-sink";
import { Button } from "@omni/ui-base/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@omni/ui-base/dialog";
import { Input } from "@omni/ui-base/input";
import { Label } from "@omni/ui-base/label";
import { RadioGroup, RadioGroupItem } from "@omni/ui-base/radio-group";
import { ScrollArea } from "@omni/ui-base/scroll-area";
import { ListPlus, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type ListManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onListsChanged?: () => void;
};

export const ListManagerDialog = ({
  open,
  onOpenChange,
  onListsChanged,
}: ListManagerDialogProps) => {
  const [lists, setLists] = useState<BibleList[]>([]);
  const [newListName, setNewListName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<BibleList | null>(null);
  const [deleteMode, setDeleteMode] = useState<DeleteListMode>("move");
  const [loading, setLoading] = useState(false);

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bibleListsService.getLists();
      setLists(data);
    } catch (err) {
      reportError(err, {
        code: "bible/lists-load",
        userMessage: "Failed to load lists.",
        expected: true,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadLists();
  }, [open, loadLists]);

  const handleCreate = async () => {
    const trimmed = newListName.trim();
    if (!trimmed) return;

    try {
      await bibleListsService.createList(trimmed);
      setNewListName("");
      await loadLists();
      onListsChanged?.();
      toast.success("List created");
    } catch (err) {
      reportError(err, {
        code: "bible/list-create",
        userMessage: "Failed to create list.",
      });
    }
  };

  const startEdit = (list: BibleList) => {
    setEditingId(list.id);
    setEditValue(list.name);
  };

  const commitEdit = async (id: string) => {
    const trimmed = editValue.trim();
    if (!trimmed) return;

    try {
      await bibleListsService.renameList(id, trimmed);
      setEditingId(null);
      await loadLists();
      onListsChanged?.();
      toast.success("List renamed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to rename list.";
      toast.error("Error", { description: msg });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await bibleListsService.deleteList(deleteTarget.id, deleteMode);
      setDeleteTarget(null);
      await loadLists();
      onListsChanged?.();
      toast.success("List deleted");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete list.";
      toast.error("Error", { description: msg });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Lists</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2">
            <Input
              placeholder="New list name"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleCreate()}
              disabled={!newListName.trim()}
            >
              <ListPlus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Loading lists…
            </p>
          ) : lists.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No lists yet.
            </p>
          ) : (
            <ScrollArea className="max-h-[50vh] pr-1">
              <div className="flex flex-col gap-2">
                {lists.map((list) => (
                  <div
                    key={list.id}
                    className="flex items-center gap-2 rounded-md border p-2"
                  >
                    {editingId === list.id ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void commitEdit(list.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onBlur={() => void commitEdit(list.id)}
                        className="flex-1"
                        autoFocus
                      />
                    ) : (
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {list.name}
                        </p>
                        {list.is_default && (
                          <p className="text-xs text-muted-foreground">
                            Default quick-save list
                          </p>
                        )}
                      </div>
                    )}

                    {!list.is_default && editingId !== list.id && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(list)}
                          aria-label={`Rename ${list.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeleteTarget(list);
                            setDeleteMode("move");
                          }}
                          aria-label={`Delete ${list.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Delete &ldquo;{deleteTarget?.name}&rdquo;?
            </DialogTitle>
          </DialogHeader>

          <RadioGroup
            value={deleteMode}
            onValueChange={(value) => setDeleteMode(value as DeleteListMode)}
            className="space-y-3"
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem value="move" id="delete-mode-move" />
              <Label htmlFor="delete-mode-move" className="font-normal">
                Move verses to the Saved list
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <RadioGroupItem value="delete-verses" id="delete-mode-delete" />
              <Label htmlFor="delete-mode-delete" className="font-normal">
                Delete verses that only belong to this list
              </Label>
            </div>
          </RadioGroup>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
            >
              Delete List
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
