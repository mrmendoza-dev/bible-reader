import {
  BOOKS_LIST,
  getBookDisplayTitle,
} from "@apps/production/bible-app/constants";
import { bibleService } from "@apps/production/bible-app/services/bible-service";
import { bibleSupabaseService } from "@apps/production/bible-app/services/bible-verses-service";
import { normalizeTranslationId } from "@apps/production/bible-app/translations";
import { Button } from "@omni/ui-base/button";
import { Card, CardContent, CardHeader, CardTitle } from "@omni/ui-base/card";
import { cn } from "@omni/ui-base/lib/utils";
import { Spinner } from "@omni/ui-base/spinner";
import { Bookmark, BookmarkCheck, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface RandomVerseData {
  bookId: string;
  bookTitle: string;
  chapter: number;
  verse: string;
  text: string;
}

export type RandomVerseProps = {
  translationId: string;
};

export const RandomVerse = ({ translationId }: RandomVerseProps) => {
  const [verseData, setVerseData] = useState<RandomVerseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const activeTranslationId = normalizeTranslationId(translationId);

  const fetchRandomVerse = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get a random book
      const randomBookIndex = Math.floor(Math.random() * BOOKS_LIST.length);
      const bookTitle = BOOKS_LIST[randomBookIndex];
      const bookId = bookTitle;

      // Load the book with the selected translation
      const bookData = await bibleService.getBook(bookId, activeTranslationId);

      if (!bookData || !bookData.chapters || bookData.chapters.length === 0) {
        throw new Error("Book has no chapters");
      }

      // Get a random chapter
      const randomChapterIndex = Math.floor(
        Math.random() * bookData.chapters.length,
      );
      const chapter = bookData.chapters[randomChapterIndex];

      if (!chapter || !chapter.verses || chapter.verses.length === 0) {
        throw new Error("Chapter has no verses");
      }

      // Get a random verse
      const randomVerseIndex = Math.floor(
        Math.random() * chapter.verses.length,
      );
      const verse = chapter.verses[randomVerseIndex];

      setVerseData({
        bookId,
        bookTitle: getBookDisplayTitle(bookTitle),
        chapter: Number.parseInt(chapter.chapter, 10),
        verse: verse.verse,
        text: verse.text,
      });
    } catch (err) {
      console.error("Error fetching random verse:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load random verse",
      );
    } finally {
      setLoading(false);
    }
  }, [activeTranslationId]);

  useEffect(() => {
    fetchRandomVerse();
  }, [fetchRandomVerse]);

  // Check if verse is saved when verseData changes
  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!verseData) {
        setIsSaved(false);
        return;
      }

      try {
        const saved = await bibleSupabaseService.isVerseSaved(
          verseData.bookId,
          verseData.chapter,
          verseData.verse,
          activeTranslationId,
        );
        setIsSaved(saved);
      } catch (error) {
        console.error("Error checking saved status:", error);
        setIsSaved(false);
      }
    };

    checkSavedStatus();
  }, [verseData, activeTranslationId]);

  const handleSaveToggle = useCallback(async () => {
    if (!verseData) return;

    setSaving(true);
    try {
      if (isSaved) {
        await bibleSupabaseService.unsaveVerse(
          verseData.bookId,
          verseData.chapter,
          verseData.verse,
          activeTranslationId,
        );
        setIsSaved(false);
        toast.success("Success", {
          description: "Verse removed from saved verses.",
        });
      } else {
        await bibleSupabaseService.saveVerse(
          verseData.bookId,
          verseData.chapter,
          verseData.verse,
          verseData.text,
          activeTranslationId,
        );
        setIsSaved(true);
        toast.success("Success", {
          description: "Verse saved successfully.",
        });
      }
    } catch (error) {
      console.error("Error toggling save:", error);
      toast.error("Error", {
        description: `Failed to ${
          isSaved ? "unsave" : "save"
        } verse. Please try again.`,
      });
    } finally {
      setSaving(false);
    }
  }, [verseData, isSaved, activeTranslationId]);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Random Verse</CardTitle>
        <div className="flex items-center gap-2">
          {verseData && (
            <Button
              variant={isSaved ? "default" : "outline"}
              size="sm"
              onClick={handleSaveToggle}
              disabled={saving || loading}
            >
              {saving ? (
                <Spinner
                  className={cn(
                    "h-4 w-4",
                    isSaved ? "text-foreground" : "text-primary",
                  )}
                />
              ) : isSaved ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRandomVerse}
            disabled={loading}
          >
            {loading ? (
              <Spinner className="h-4 w-4 text-primary" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-6 w-6 text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              <p>{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRandomVerse}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          ) : verseData ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-lg font-semibold">
                  {verseData.bookTitle} {verseData.chapter}:{verseData.verse}
                </p>
              </div>
              <div className="text-center py-4">
                <p className="text-base leading-relaxed">{verseData.text}</p>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
