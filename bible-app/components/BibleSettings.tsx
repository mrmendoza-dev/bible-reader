import {
  type FontSize,
  type FontStyle,
  useBibleContext,
} from "@apps/production/bible-app/contexts/BibleContext";
import { bibleService } from "@apps/production/bible-app/services/bible-service";
import { Button } from "@omni/ui-base/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@omni/ui-base/dialog";
import { Label } from "@omni/ui-base/label";
import { selectValueHandler } from "@omni/ui-base/lib/value-change-adapters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@omni/ui-base/select";
import { useEffect, useRef, useState } from "react";

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

const FONT_STYLE_OPTIONS: { value: FontStyle; label: string }[] = [
  { value: "serif", label: "Serif" },
  { value: "sans", label: "Sans Serif" },
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
  const fontFamilyStyle =
    fontStyle === "serif"
      ? { fontFamily: "Georgia, 'Times New Roman', serif" }
      : { fontFamily: "system-ui, -apple-system, sans-serif" };

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
    const loadPreviewVerse = async () => {
      setPreviewVerse((prev) => ({ ...prev, loading: true }));
      try {
        const verse = await bibleService.getVerse("john", 3, 16);
        if (verse) {
          setPreviewVerse({ text: verse.text, loading: false });
        } else {
          setPreviewVerse({
            text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
            loading: false,
          });
        }
      } catch (error) {
        console.error("Error loading preview verse:", error);
        setPreviewVerse({
          text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
          loading: false,
        });
      }
    };
    loadPreviewVerse();
  }, []);

  const combinedStyle = { ...fontFamilyStyle, ...fontSizeStyle };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bible Settings</DialogTitle>
          <DialogDescription>
            Customize the appearance of the Bible reader
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4">
          <div className="flex flex-row items-center justify-between gap-2">
            {/* Font Size */}
            <div className="w-1/2">
              <Label htmlFor="font-size">Font Size</Label>
              <Select
                value={fontSize}
                items={FONT_SIZE_OPTIONS}
                onValueChange={selectValueHandler((value: FontSize) =>
                  setFontSizeLocal(value),
                )}
              >
                <SelectTrigger id="font-size">
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
              {currentFontSize && (
                <p className="text-xs text-muted-foreground">
                  Current size: {currentFontSize.size}
                </p>
              )}
            </div>

            {/* Font Style */}
            <div className="w-1/2">
              <Label htmlFor="font-style">Font Style</Label>
              <Select
                value={fontStyle}
                items={FONT_STYLE_OPTIONS}
                onValueChange={selectValueHandler((value: FontStyle) =>
                  setFontStyleLocal(value),
                )}
              >
                <SelectTrigger id="font-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="serif">Serif</SelectItem>
                  <SelectItem value="sans">Sans Serif</SelectItem>
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
