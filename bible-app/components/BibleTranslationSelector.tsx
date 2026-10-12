import {
  AVAILABLE_TRANSLATIONS,
  getTranslationLabel,
  groupTranslationsByFamily,
} from "@apps/production/bible-app/translations";
import { Badge } from "@omni/ui-base/badge";
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

interface BibleTranslationSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  includeAllOption?: boolean;
  className?: string;
}

export const BibleTranslationSelector = ({
  value,
  onValueChange,
  includeAllOption = false,
  className,
}: BibleTranslationSelectorProps) => {
  const [open, setOpen] = useState(false);

  const selectedLabel =
    value === "all"
      ? "All Translations"
      : AVAILABLE_TRANSLATIONS.find((t) => t.id === value)?.fullLabel ||
        getTranslationLabel(value);

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
            className={cn("w-full justify-between", className)}
          >
            <span className="truncate">{selectedLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-[400px] p-0" align="start">
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
            {Array.from(groupTranslationsByFamily().entries()).map(
              ([family, translations]) => (
                <CommandGroup key={family} heading={family}>
                  {translations.map((translation) => (
                    <CommandItem
                      key={translation.id}
                      value={`${translation.id} ${translation.fullLabel} ${translation.label}`}
                      onSelect={() => handleSelect(translation.id)}
                    >
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className="truncate">{translation.fullLabel}</span>
                        <div className="flex shrink-0 items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {translation.category}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            L{translation.readingLevel}
                          </Badge>
                        </div>
                      </div>
                      <Check
                        className={cn(
                          "ml-2 h-4 w-4 shrink-0",
                          value === translation.id
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ),
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
