import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { isOldTestamentBook } from "@/bible/constants";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Book {
  id: string;
  title: string;
  chapters?: number;
}

interface BibleBookSelectorProps {
  books: Book[];
  selectedBook: string;
  onBookChange: (bookId: string) => void;
  placeholder?: string;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  className?: string;
}

export const BibleBookSelector = ({
  books,
  selectedBook,
  onBookChange,
  placeholder = "Select book...",
  includeAllOption = false,
  allOptionLabel = "All Books",
  className,
}: BibleBookSelectorProps) => {
  const [open, setOpen] = useState(false);

  // Separate books into Old and New Testament
  const { oldTestament, newTestament } = useMemo(() => {
    const oldT: Book[] = [];
    const newT: Book[] = [];

    books.forEach((book) => {
      if (isOldTestamentBook(book.id)) {
        oldT.push(book);
      } else {
        newT.push(book);
      }
    });

    return { oldTestament: oldT, newTestament: newT };
  }, [books]);

  const selectedBookTitle =
    selectedBook === "all" && includeAllOption
      ? allOptionLabel
      : books.find((book) => book.id === selectedBook)?.title || placeholder;

  const handleSelect = (bookId: string) => {
    onBookChange(bookId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-expanded={open}
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-label="Book"
            className={cn("w-full justify-between", className)}
          >
            <span className="min-w-0 truncate">{selectedBookTitle}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent
        className="w-[400px] max-w-[calc(100dvw-2rem)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search books..." className="h-9" />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>No book found.</CommandEmpty>
            {includeAllOption && (
              <CommandGroup>
                <CommandItem value="all" onSelect={() => handleSelect("all")}>
                  {allOptionLabel}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedBook === "all" ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Old Testament">
              {oldTestament.map((book) => (
                <CommandItem
                  key={book.id}
                  value={book.id}
                  onSelect={() => handleSelect(book.id)}
                >
                  {book.title}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedBook === book.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="New Testament">
              {newTestament.map((book) => (
                <CommandItem
                  key={book.id}
                  value={book.id}
                  onSelect={() => handleSelect(book.id)}
                >
                  {book.title}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedBook === book.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
