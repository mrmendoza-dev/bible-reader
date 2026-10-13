import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { BackupControls } from "@/bible/components/BackupControls";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function openData() {
  const user = userEvent.setup();
  render(<BackupControls />);
  await user.click(screen.getByRole("button", { name: "Data" }));
  return user;
}

it("opens the file picker from an explicit button and allows retrying an invalid file", async () => {
  const user = await openData();
  const input = screen.getByLabelText(
    "Choose a backup to restore",
  ) as HTMLInputElement;
  const click = vi.spyOn(input, "click");
  await user.click(screen.getByRole("button", { name: "Choose backup file" }));
  expect(click).toHaveBeenCalledOnce();
  const file = new File(["invalid"], "my-backup.json", {
    type: "application/json",
  });
  const text = vi.fn().mockResolvedValue("invalid");
  Object.defineProperty(file, "text", { value: text });
  await user.upload(input, file);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    /JSON|Unexpected token/,
  );
  expect(screen.getByText("my-backup.json")).toBeInTheDocument();
  expect(input.value).toBe("");
  await user.upload(input, file);
  await waitFor(() => expect(text).toHaveBeenCalledTimes(2));
});
