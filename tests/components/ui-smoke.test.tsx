import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

describe("UI kit smoke", () => {
  it("Button handles click", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole("button", { name: /go/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("Input accepts typing", async () => {
    render(<Input placeholder="Name" />);
    const input = screen.getByPlaceholderText("Name");
    await userEvent.type(input, "Ada");
    expect(input).toHaveValue("Ada");
  });
});
