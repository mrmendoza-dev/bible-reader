import { mkdir } from "node:fs/promises";

export const generateUnixTimestamp = (): number =>
  Math.floor(Date.now() / 1000);

/** Ensures `dirPath` exists (including parents). Safe to call if it already exists. */
export const ensureDirectoryExists = async (dirPath: string): Promise<void> => {
  await mkdir(dirPath, { recursive: true });
};
