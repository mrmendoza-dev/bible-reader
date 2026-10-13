import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import {
  getTranslationDetailsLabel,
  getTranslationFullLabel,
  getTranslationLabel,
  getTranslationOptionLabel,
  TRANSLATION_IDS,
} from "@/bible/translations";
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

interface BibleTranslationSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  includeAllOption?: boolean;
  className?: string;
  compact?: boolean;
}

export const BibleTranslationSelector = ({
  value,
  onValueChange,
  includeAllOption = false,
  className,
  compact = false,
}: BibleTranslationSelectorProps) => {
  const [open, setOpen] = useState(false);

  const selectedLabel =
    value === "all"
      ? "All Translations"
      : compact
        ? getTranslationLabel(value)
        : getTranslationFullLabel(value);

  const handleSelect = (translationId: string) => {
    onValueChange(translationId);
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
            aria-label="Translation"
            className={cn(
              "w-full justify-between",
              !compact && "h-auto py-2",
              className,
            )}
          >
            <span className="min-w-0 text-left">
              <span className="block truncate">{selectedLabel}</span>
              {!compact && value !== "all" && (
                <span className="block text-xs text-muted-foreground">
                  {getTranslationDetailsLabel(value)}
                </span>
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent
        className="w-[400px] max-w-[calc(100dvw-2rem)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search translations..." className="h-9" />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>No translation found.</CommandEmpty>
            {includeAllOption && (
              <CommandGroup>
                <CommandItem value="all" onSelect={() => handleSelect("all")}>
                  All Translations
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === "all" ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {TRANSLATION_IDS.map((id) => (
                <CommandItem
                  key={id}
                  value={`${id} ${getTranslationOptionLabel(id)}`}
                  onSelect={() => handleSelect(id)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">
                      {getTranslationFullLabel(id)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {getTranslationDetailsLabel(id)}
                    </span>
                  </span>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4 shrink-0",
                      value === id ? "opacity-100" : "opacity-0",
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
