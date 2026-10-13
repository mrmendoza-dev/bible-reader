export function bibleAssetUrl(path: string): string {
  const relative = path.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${relative}`;
}
