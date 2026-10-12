import { Button } from "@omni/ui-base/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@omni/ui-base/command";
import { cn } from "@omni/ui-base/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@omni/ui-base/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

interface BibleChapterSelectorProps {
  chapters: number[];
  selectedChapter: number;
  onChapterChange: (chapter: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const BibleChapterSelector = ({
  chapters,
  selectedChapter,
  onChapterChange,
  placeholder = "Select chapter...",
  disabled = false,
  className,
}: BibleChapterSelectorProps) => {
  const [open, setOpen] = useState(false);

  const selectedLabel =
    chapters.includes(selectedChapter)
      ? selectedChapter.toString()
      : placeholder;

  const handleSelect = (chapter: number) => {
    onChapterChange(chapter);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-expanded={open}
        disabled={disabled}
        render={
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            className={cn("w-full justify-between", className)}
          >
            {selectedLabel}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search chapters..." className="h-9" />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>No chapter found.</CommandEmpty>
            <CommandGroup>
              {chapters.map((chapterNum) => (
                <CommandItem
                  key={chapterNum}
                  value={chapterNum.toString()}
                  onSelect={() => handleSelect(chapterNum)}
                >
                  {chapterNum}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedChapter === chapterNum
                        ? "opacity-100"
                        : "opacity-0",
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
