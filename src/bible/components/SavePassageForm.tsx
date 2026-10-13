import { useEffect, useId, useRef, useState } from "react";
import {
  formatSavedPassage,
  type PassageReference,
  parsePassageEnd,
} from "@/bible/utils/passage-reference";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SavePassageForm({
  bookId,
  chapter,
  verse,
  translationId,
  onSave,
}: {
  bookId: string;
  chapter: number;
  verse: string;
  translationId?: string;
  onSave: (end: PassageReference) => Promise<void>;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const start = { bookId, chapter, verse: Number(verse.split("-")[0]) };
  let end: PassageReference | null = null;
  let validationError: string | null = null;
  try {
    end = parsePassageEnd(value, start, translationId);
  } catch (err) {
    validationError =
      err instanceof Error ? err.message : "Invalid end reference.";
  }
  const startLocation = {
    book_id: bookId,
    chapter,
    verse: String(start.verse),
  };
  useEffect(() => {
    input.current?.focus();
  }, []);

  return (
    <form
      className="space-y-2 rounded-md border bg-muted/30 p-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (saving) return;
        if (!end) {
          setError(validationError);
          return;
        }
        setSaving(true);
        setError(null);
        try {
          await onSave(end);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not save passage. Please try again.",
          );
        } finally {
          setSaving(false);
        }
      }}
    >
      <label htmlFor={id} className="text-xs font-medium">
        End reference
      </label>
      <div className="flex items-center gap-2">
        <Input
          ref={input}
          id={id}
          value={value}
          placeholder="8, 2:8, or Exodus 1:8"
          disabled={saving}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
        />
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      <p
        id={`${id}-help`}
        className="text-xs text-muted-foreground break-words"
      >
        {end
          ? formatSavedPassage({ ...startLocation, end })
          : `${formatSavedPassage(startLocation)}–…`}
      </p>
      <p className="text-xs text-muted-foreground">
        Use a verse, chapter:verse, or full book reference.
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
