import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const seen = new Set<string>();
const notices = new Map<string, string>();
function collect(name: string, from: string) {
  let directory = from;
  let folder: string | undefined;
  while (true) {
    const candidate = resolve(directory, "node_modules", name);
    if (existsSync(resolve(candidate, "package.json"))) {
      folder = realpathSync(candidate);
      break;
    }
    const parent = dirname(directory);
    if (parent === directory)
      throw new Error(`Installed dependency not found: ${name}`);
    directory = parent;
  }
  if (seen.has(folder)) return;
  seen.add(folder);
  const metadata = JSON.parse(
    readFileSync(resolve(folder, "package.json"), "utf8"),
  );
  const files = readdirSync(folder).filter((file) =>
    /^(licen[cs]e|copying|notice)(\.|$)/i.test(file),
  );
  const fallback = name.startsWith("@radix-ui/")
    ? "radix-ui.txt"
    : name === "react-remove-scroll-bar"
      ? "react-remove-scroll-bar.txt"
      : null;
  if (!files.length && !fallback)
    throw new Error(`License text missing: ${name}`);
  const license = files.length
    ? files
        .map((file) => readFileSync(resolve(folder, file), "utf8"))
        .join("\n\n")
    : readFileSync(resolve(root, "licenses", fallback as string), "utf8");
  notices.set(`${name}@${metadata.version}`, license);
  for (const dependency of Object.keys(metadata.dependencies ?? {}))
    collect(dependency, folder);
}
const dependencies = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
).dependencies;
// The PWA plugin bundles these Workbox packages into the application and service worker.
const bundledDevelopmentDependencies = ["workbox-window", "workbox-precaching"];
for (const name of [
  ...Object.keys(dependencies),
  ...bundledDevelopmentDependencies,
]) {
  // This Vite plugin runs at build time; Tailwind's generated CSS notice is retained separately.
  if (name !== "@tailwindcss/vite") collect(name, root);
}
const shadcnLicense = readFileSync(
  resolve(root, "licenses/shadcn.txt"),
  "utf8",
);
const text = [
  "Bible Reader: third-party software notices\nGenerated from installed dependencies by bun run licenses:generate.\nScripture is separate; see THIRD_PARTY_NOTICES.md.",
  `shadcn/ui (adapted components)\n\n${shadcnLicense}`,
  ...[...notices]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, license]) => `${name}\n\n${license}`),
].join("\n\n----------------------------------------\n\n");
writeFileSync(resolve(root, "public/third-party-notices.txt"), text);
console.log(
  `Preserved license texts for ${notices.size} dependency versions and shadcn/ui.`,
);
