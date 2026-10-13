import { useEffect, useRef } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { validateLocation } from "@/bible/storage/validation";
import {
  DEFAULT_TRANSLATION_ID,
  isTranslationId,
  isTranslationReferenceAvailable,
  normalizeTranslationId,
} from "@/bible/translations";
import type { BibleReaderProps } from "@/bible/types/bible-reader";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { BibleHome } from "./BibleHome";
import { BibleSearchDialog } from "./BibleSearchDialog";
import { BibleReader, type BibleReaderRef } from "./bible-reader";
import { SavedVerses } from "./saved-verses";

export type BibleAppProps = {
  searchDialogOpen: boolean;
  onSearchDialogOpenChange: (open: boolean) => void;
};

const ReaderRoute = (props: BibleReaderProps) => {
  const readerRef = useRef<BibleReaderRef>(null);
  const location = useLocation();
  const appliedNavigation = useRef<string | null>(null);

  useEffect(() => {
    if (appliedNavigation.current === location.key) return;
    appliedNavigation.current = location.key;
    const target: unknown = location.state;
    if (
      !target ||
      typeof target !== "object" ||
      !("bookId" in target) ||
      typeof target.bookId !== "string" ||
      !("chapter" in target) ||
      typeof target.chapter !== "number" ||
      !("verse" in target) ||
      typeof target.verse !== "string"
    )
      return;
    try {
      validateLocation(target.bookId, target.chapter, target.verse);
      if (
        !isTranslationReferenceAvailable(
          props.translationId ?? DEFAULT_TRANSLATION_ID,
          target.bookId,
          target.chapter,
        )
      )
        return;
      readerRef.current?.navigateToVerse(
        target.bookId,
        target.chapter,
        target.verse,
      );
    } catch {
      // Invalid history state falls back to the last valid reading location.
    }
  }, [location.key, location.state, props.translationId]);

  return <BibleReader ref={readerRef} {...props} />;
};

export const BibleApp = ({
  searchDialogOpen,
  onSearchDialogOpenChange,
}: BibleAppProps) => {
  const [bibleTranslation, setBibleTranslation] = useLocalStorage<string>(
    "bible:translation",
    DEFAULT_TRANSLATION_ID,
    undefined,
    isTranslationId,
  );
  const navigate = useNavigate();
  const translationId = normalizeTranslationId(bibleTranslation);
  const openInReader = (
    bookId: string,
    chapter: number,
    verse: string,
    targetTranslation: string = translationId,
  ) => {
    setBibleTranslation(normalizeTranslationId(targetTranslation));
    void navigate("/reader", { state: { bookId, chapter, verse } });
  };

  return (
    <div className="bible-app flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        <Routes>
          <Route
            path="/"
            element={
              <BibleHome
                translationId={translationId}
                onTranslationChange={setBibleTranslation}
                onOpenInReader={openInReader}
              />
            }
          />
          <Route
            path="/reader"
            element={
              <ReaderRoute
                translationId={translationId}
                onTranslationChange={setBibleTranslation}
              />
            }
          />
          <Route path="/saved" element={<SavedVerses />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BibleSearchDialog
        open={searchDialogOpen}
        onClose={() => onSearchDialogOpenChange(false)}
        onNavigateToVerse={openInReader}
        translationId={translationId}
      />
    </div>
  );
};
