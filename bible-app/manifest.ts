import { defineApp } from "@omni/app-contracts/registry/define-app";
import { APP_CATEGORIES } from "@omni/app-contracts/registry/types";
import { Book } from "lucide-react";
import { lazy } from "react";

export default defineApp({
  id: "bible",
  name: "Bible",
  path: "/bible",
  category: APP_CATEGORIES.LEARNING,
  icon: Book,
  iconStyle: {
    background:
      "linear-gradient(135deg, #92400e 0%, #b45309 25%, #d97706 50%, #f59e0b 75%, #fbbf24 100%)",
    boxShadow:
      "inset 0 2px 4px rgba(255, 255, 255, 0.2), 0 0 25px rgba(217, 119, 6, 0.6), 0 0 15px rgba(180, 83, 9, 0.4), 0 4px 12px rgba(146, 64, 14, 0.3)",
    border: "1px solid rgba(251, 191, 36, 0.5)",
    color: "#fffbeb",
    iconFilter:
      "drop-shadow(0 0 12px rgba(217, 119, 6, 1)) drop-shadow(0 0 8px rgba(251, 191, 36, 0.8)) drop-shadow(0 0 4px rgba(180, 83, 9, 0.6)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))",
  },
  description: "Bible reader",
  component: lazy(() =>
    import("./components/BibleApp").then((m) => ({
      default: m.BibleApp,
    })),
  ),
  tags: ["entertainment", "scripture", "reading", "study"],
});
