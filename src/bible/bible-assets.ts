export function bibleAssetUrl(path: string): string {
  const relative = path.replace(/^\/+/, "");
  // Local dev copies under translations/ are not production public assets.
  const assetPath = import.meta.env.DEV
    ? relative.replace(/^bible\/data\/translations\//, "translations/")
    : relative;
  return `${import.meta.env.BASE_URL}${assetPath}`;
}
