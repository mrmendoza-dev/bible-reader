import { useEffect, useRef, useState } from "react";
import {
  type FontSize,
  type FontStyle,
  useBibleContext,
} from "@/bible/contexts/BibleContext";
import {
  getReadingFontFamily,
  READING_FONT_GROUPS,
  READING_FONTS,
} from "@/bible/reading-fonts";
import { bibleService } from "@/bible/services/bible-service";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { selectValueHandler } from "@/components/ui/lib/value-change-adapters";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BibleSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; size: string }[] = [
  { value: "sm", label: "Small", size: "0.875rem" },
  { value: "base", label: "Medium", size: "1rem" },
  { value: "lg", label: "Large", size: "1.125rem" },
  { value: "xl", label: "Extra Large", size: "1.25rem" },
  { value: "2xl", label: "2X Large", size: "1.5rem" },
];

export const BibleSettings = ({
  open,
  onOpenChange,
  onSave,
}: BibleSettingsProps) => {
  const {
    fontStyle: savedFontStyle,
    fontSize: savedFontSize,
    setFontStyle,
    setFontSize,
  } = useBibleContext();

  // Local draft values (Apply on Save). Reset when the dialog opens — do not
  // remount DialogContent on saved context changes (that desyncs Base UI dialog).
  const [fontStyle, setFontStyleLocal] = useState<FontStyle>(savedFontStyle);
  const [fontSize, setFontSizeLocal] = useState<FontSize>(savedFontSize);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setFontStyleLocal(savedFontStyle);
      setFontSizeLocal(savedFontSize);
    }
    prevOpenRef.current = open;
  }, [open, savedFontStyle, savedFontSize]);

  const handleSave = () => {
    setFontStyle(fontStyle);
    setFontSize(fontSize);
    onSave?.();
    onOpenChange(false);
  };

  const currentFontSize = FONT_SIZE_OPTIONS.find(
    (opt) => opt.value === fontSize,
  );

  // Get font family style
  const fontFamilyStyle = { fontFamily: getReadingFontFamily(fontStyle) };

  // Get font size style
  const fontSizeStyle = currentFontSize
    ? { fontSize: currentFontSize.size }
    : {};

  // Preview verse data (John 3:16)
  const [previewVerse, setPreviewVerse] = useState<{
    text: string;
    loading: boolean;
  }>({ text: "", loading: true });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadPreviewVerse = async () => {
      setPreviewVerse((prev) => ({ ...prev, loading: true }));
      try {
        const verse = await bibleService.getVerse("john", 3, 16);
        if (cancelled) return;
        if (verse) {
          setPreviewVerse({ text: verse.text, loading: false });
        } else {
          setPreviewVerse({
            text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
            loading: false,
          });
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Error loading preview verse:", error);
        setPreviewVerse({
          text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
          loading: false,
        });
      }
    };
    loadPreviewVerse();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const combinedStyle = { ...fontFamilyStyle, ...fontSizeStyle };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bible Settings</DialogTitle>
          <DialogDescription>
            Customize the appearance of the reader and saved verses
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:items-start">
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="font-size">Font Size</Label>
              <Select
                value={fontSize}
                items={FONT_SIZE_OPTIONS}
                onValueChange={selectValueHandler((value: FontSize) =>
                  setFontSizeLocal(value),
                )}
              >
                <SelectTrigger id="font-size" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="min-h-4 text-xs text-muted-foreground">
                {currentFontSize
                  ? `Current size: ${currentFontSize.size}`
                  : null}
              </p>
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="font-style">Reading Font</Label>
              <Select
                value={fontStyle}
                items={READING_FONTS}
                onValueChange={selectValueHandler((value: FontStyle) =>
                  setFontStyleLocal(value),
                )}
              >
                <SelectTrigger id="font-style" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {READING_FONT_GROUPS.map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel>{group.label}</SelectLabel>
                      {group.fonts.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview Section */}
          <div className="grid gap-2">
            <Label>Preview</Label>
            <div className="border rounded-md p-4 bg-muted/30">
              {previewVerse.loading ? (
                <p className="text-sm text-muted-foreground">
                  Loading preview...
                </p>
              ) : (
                <div className="flex gap-2 p-2 rounded-md">
                  <span
                    className="font-bold text-muted-foreground min-w-[1rem]"
                    style={combinedStyle}
                  >
                    16.
                  </span>
                  <span
                    className="leading-relaxed flex-1"
                    style={combinedStyle}
                  >
                    {previewVerse.text}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
