import { Button } from "@omni/ui-base/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@omni/ui-base/tabs";
import "@apps/production/bible-app/styles/bible-theme.css";
import { BibleProvider } from "@apps/production/bible-app/contexts/BibleProvider";
import {
  DEFAULT_TRANSLATION_ID,
  normalizeTranslationId,
} from "@apps/production/bible-app/translations";
import { useLocalStorage } from "@omni/services/hooks/useLocalStorage";
import { Search, StickyNote } from "lucide-react";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { BibleHome } from "./BibleHome";
import { BibleNoteDialog } from "./BibleNoteDialog";
import { BibleSearchDialog } from "./BibleSearchDialog";
import { BibleReader, type BibleReaderRef } from "./bible-reader";
import { SavedVerses } from "./saved-verses";

export const BibleApp = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [bibleTranslation, setBibleTranslation] = useLocalStorage(
    "bibleTranslation",
    DEFAULT_TRANSLATION_ID,
  );
  const readerRef = useRef<BibleReaderRef>(null);

  const handleNavigateToVerse = (
    bookId: string,
    chapter: number,
    verse: string,
  ) => {
    flushSync(() => setActiveTab("reader"));
    readerRef.current?.navigateToVerse(bookId, chapter, verse);
  };

  const handleAddGeneralNote = () => {
    // Open note dialog without verse context for general Bible notes
    setNoteDialogOpen(true);
  };

  return (
    <BibleProvider>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex h-full flex-col"
      >
        <div className="shrink-0 flex items-center justify-between border-b px-4 py-2">
          <TabsList>
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="reader">Reader</TabsTrigger>
            <TabsTrigger value="saved">Saved Verses</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setSearchDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              <span className="hidden md:block">Search</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleAddGeneralNote}
              className="flex items-center gap-2"
            >
              <StickyNote className="h-4 w-4" />
              <span className="hidden md:block">Add Note</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <TabsContent value="home" className="h-full">
            <BibleHome
              translationId={normalizeTranslationId(bibleTranslation)}
              onTranslationChange={(id) =>
                setBibleTranslation(normalizeTranslationId(id))
              }
              onOpenInReader={handleNavigateToVerse}
            />
          </TabsContent>

          <TabsContent value="reader" className="h-full">
            <BibleReader
              ref={readerRef}
              translationId={normalizeTranslationId(bibleTranslation)}
              onTranslationChange={(translationId) =>
                setBibleTranslation(normalizeTranslationId(translationId))
              }
              onAddNoteClick={handleAddGeneralNote}
              onSearchClick={() => setSearchDialogOpen(true)}
              onSavedVersesClick={() => setActiveTab("saved")}
            />
          </TabsContent>

          <TabsContent value="saved" className="h-full">
            <SavedVerses onBackToReader={() => setActiveTab("reader")} />
          </TabsContent>
        </div>
        {/* Search Dialog */}
        <BibleSearchDialog
          open={searchDialogOpen}
          onClose={() => setSearchDialogOpen(false)}
          onNavigateToVerse={handleNavigateToVerse}
          translationId={normalizeTranslationId(bibleTranslation)}
        />

        {/* Note Dialog - for general Bible notes (not verse-specific) */}
        <BibleNoteDialog
          open={noteDialogOpen}
          onClose={() => setNoteDialogOpen(false)}
          onSave={() => {
            // Note saved successfully
          }}
        />
      </Tabs>
    </BibleProvider>
  );
};
