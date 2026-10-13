import { Settings } from "lucide-react";
import { useState } from "react";
import { BibleSettings } from "@/bible/components/BibleSettings";
import { Button } from "@/components/ui/button";

export const ReadingSettingsControls = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        aria-label="Reading settings"
        onClick={() => setOpen(true)}
      >
        <Settings className="h-4 w-4" />
        <span className="hidden md:inline">Settings</span>
      </Button>
      <BibleSettings open={open} onOpenChange={setOpen} />
    </>
  );
};
