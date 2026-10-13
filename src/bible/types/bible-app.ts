export type BibleRoute = "home" | "reader" | "saved";

export const BIBLE_NAV_ROUTES: ReadonlyArray<{
  id: BibleRoute;
  label: string;
  path: string;
}> = [
  { id: "home", label: "Home", path: "/" },
  { id: "reader", label: "Reader", path: "/reader" },
  { id: "saved", label: "Saved", path: "/saved" },
];
