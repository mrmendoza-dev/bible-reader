import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  type BibleBackup,
  exportBackup,
  MAX_BACKUP_BYTES,
  parseBackup,
  restoreBackup,
} from "@/bible/storage/backup";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function BackupControls() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<BibleBackup | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fail = (error: unknown) =>
    setError(
      error instanceof Error
        ? error.message
        : "Storage operation failed. Try again.",
    );
  async function download() {
    setPending(true);
    setError(null);
    try {
      const backup = await exportBackup();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `bible-reader-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      fail(error);
    } finally {
      setPending(false);
    }
  }
  async function restore() {
    if (!preview) return;
    setPending(true);
    setError(null);
    try {
      await restoreBackup(preview);
      setPreview(null);
      toast.success("Collections restored");
    } catch (error) {
      fail(error);
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Data
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Backup and restore</DialogTitle>
            <DialogDescription>
              Your saved verses, lists, and bookmarks live in this browser.
              Export a backup before clearing browser data or moving devices.
            </DialogDescription>
          </DialogHeader>
          <Button disabled={pending} onClick={() => void download()}>
            Export current collections
          </Button>
          <label htmlFor="backup-file" className="text-sm font-medium">
            Choose a backup to restore
          </label>
          <input
            ref={fileInput}
            id="backup-file"
            type="file"
            className="sr-only"
            tabIndex={-1}
            accept="application/json,.json"
            disabled={pending}
            onChange={async (event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              setFileName(file?.name ?? null);
              setPreview(null);
              setError(null);
              if (!file) return;
              setPending(true);
              try {
                if (file.size > MAX_BACKUP_BYTES)
                  throw new Error("Backup must be smaller than 10 MiB");
                setPreview(parseBackup(await file.text()));
              } catch (error) {
                fail(error);
              } finally {
                input.value = "";
                setPending(false);
              }
            }}
          />
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              disabled={pending}
              aria-describedby="backup-file-name"
              onClick={() => fileInput.current?.click()}
            >
              <Upload className="size-4" />
              Choose backup file
            </Button>
            <p
              id="backup-file-name"
              role="status"
              className="break-all text-xs text-muted-foreground"
            >
              {fileName ?? "No file selected · JSON backups only"}
            </p>
          </div>
          {preview && (
            <div className="space-y-3 rounded border p-3">
              <p>
                {preview.savedVerses.length} saved verses,{" "}
                {preview.lists.length} lists, {preview.bookmarks.length}{" "}
                bookmarks.
              </p>
              <p className="text-sm">
                Restore replaces all current collections. Export your existing
                data above first. Reading preferences stay as they are. The
                referenced translation files must be available.
              </p>
              <Button
                disabled={pending}
                variant="destructive"
                onClick={() => void restore()}
              >
                {pending
                  ? "Restoring…"
                  : "Replace collections with this backup"}
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <section
            className="space-y-2 border-t pt-4"
            aria-labelledby="backup-reminder-heading"
          >
            <h3
              id="backup-reminder-heading"
              className="text-base font-semibold"
            >
              Keep exported backups
            </h3>
            <p className="text-sm text-muted-foreground">
              Saved data can be lost if you clear browser data or the browser
              removes it to free space. Export backups regularly to keep an
              extra copy.
            </p>
          </section>
        </DialogContent>
      </Dialog>
    </>
  );
}
