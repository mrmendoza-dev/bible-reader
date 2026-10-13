import { useState } from "react";
import { BIBLE_DATABASES_SOURCE_URL } from "@/bible/constants/translation-sources";
import { AVAILABLE_TRANSLATIONS } from "@/bible/translations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const TranslationAttributionControls = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        About
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>About this reader</DialogTitle>
            <DialogDescription>
              Local-first Bible reading, search, bookmarks, and saved verses.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Created by{" "}
            <a
              href="https://github.com/mrmendoza-dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2 hover:text-primary"
            >
              mrmendoza.dev
            </a>
            . View the{" "}
            <a
              href="https://github.com/mrmendoza-dev/bible-reader"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2 hover:text-primary"
            >
              project repository
            </a>
            .
          </p>
          <section className="space-y-3 text-sm">
            <h3 className="font-medium text-foreground">
              Translation attribution
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Thank you to the maintainers of{" "}
              <a
                href={BIBLE_DATABASES_SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-2 hover:text-primary"
              >
                scrollmapper/bible_databases
              </a>{" "}
              for publishing Bible version databases that this project uses as a
              source when preparing translation files.
            </p>
            <div className="space-y-2">
              <p className="text-muted-foreground leading-relaxed">
                Supported translations in the app:
              </p>
              <ul
                className="max-h-48 divide-y divide-border overflow-y-auto overscroll-contain rounded-md border border-border"
                aria-label="Supported translations"
              >
                {Object.entries(AVAILABLE_TRANSLATIONS).map(
                  ([id, { name }]) => (
                    <li
                      key={id}
                      className="px-3 py-2 text-muted-foreground leading-snug"
                    >
                      <span className="font-medium text-foreground">
                        {id.toUpperCase()}
                      </span>
                      {" — "}
                      {name}
                    </li>
                  ),
                )}
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                Each edition remains subject to its own copyright and usage
                terms. Open-source dependency notices ship with builds at{" "}
                <a
                  href="/third-party-notices.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-2 hover:text-primary"
                >
                  third-party-notices.txt
                </a>
                .
              </p>
            </div>
          </section>
        </DialogContent>
      </Dialog>
    </>
  );
};
