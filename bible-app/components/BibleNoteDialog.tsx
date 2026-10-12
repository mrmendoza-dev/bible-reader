import { getBookDisplayTitle } from "@apps/production/bible-app/constants";
import { notesService } from "@apps/production/notes-app/notes-service";
import { Button } from "@omni/ui-base/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@omni/ui-base/dialog";
import { Input } from "@omni/ui-base/input";
import { Textarea } from "@omni/ui-base/textarea";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface BibleNoteDialogProps {
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
  initialData?: {
    id?: string;
    title: string;
    content: string;
  };
  verseContext?: {
    bookId: string;
    chapter: number;
    verse: string;
    verseText: string;
  };
}

export const BibleNoteDialog: React.FC<BibleNoteDialogProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  verseContext,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        setTitle(initialData.title);
        setContent(initialData.content);
      } else if (verseContext) {
        // Pre-fill title with verse reference
        setTitle(
          `${getBookDisplayTitle(verseContext.bookId)} ${
            verseContext.chapter
          }:${verseContext.verse}`,
        );
        setContent("");
      } else {
        setTitle("");
        setContent("");
      }
    }
  }, [open, initialData, verseContext]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Error", {
        description: "Please enter a title for your note.",
      });
      return;
    }

    setLoading(true);
    try {
      if (initialData?.id) {
        // Update existing note
        await notesService.update(initialData.id, {
          title: title.trim(),
          content: content.trim(),
        });
        toast.success("Success", {
          description: "Note updated successfully.",
        });
      } else {
        // Create new note
        const appData = verseContext
          ? {
              app: "bible",
              verseRef: `${verseContext.bookId} ${verseContext.chapter}:${verseContext.verse}`,
              bookId: verseContext.bookId,
              chapter: verseContext.chapter,
              verse: verseContext.verse,
            }
          : {
              app: "bible",
            };

        await notesService.createNote({
          title: title.trim(),
          content: content.trim(),
        });
        toast.success("Success", {
          description: "Note created successfully.",
        });
      }

      onSave?.();
      onClose();
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Error", {
        description: "Failed to save note. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setContent("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {initialData?.id ? "Edit Note" : "New Bible Note"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter note title..."
              className="mt-1"
            />
          </div>

          <div>
            <label htmlFor="content" className="text-sm font-medium">
              Content
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your note content..."
              className="mt-1 min-h-[200px]"
            />
          </div>

          {verseContext && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                <strong>Verse:</strong>{" "}
                {getBookDisplayTitle(verseContext.bookId)}{" "}
                {verseContext.chapter}:{verseContext.verse}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                <strong>Text:</strong> {verseContext.verseText}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : initialData?.id ? "Update" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
