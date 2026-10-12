const DEFAULT_PORT = 3030;

export const getServerPort = (): number => {
  const raw = Bun.env.SERVER_PORT ?? Bun.env.PORT;
  if (raw === undefined || raw === "") {
    return DEFAULT_PORT;
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 65_535) {
    throw new Error(`Invalid SERVER_PORT/PORT: ${raw}`);
  }
  return n;
};
