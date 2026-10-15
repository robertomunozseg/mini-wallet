import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../Button";

describe("Button", () => {
  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Send</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled and ignores clicks while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Send
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Send" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("respects the disabled prop", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Send
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  describe("look of a button that cannot be used", () => {
    it.each(["primary", "danger"] as const)(
      "a disabled %s button is grey, not coloured",
      (variant) => {
        render(
          <Button variant={variant} disabled>
            Send
          </Button>,
        );
        const button = screen.getByRole("button", { name: "Send" });
        expect(button).toHaveClass("bg-zinc-200", "text-zinc-500");
        expect(button).not.toHaveClass("bg-blue-600", "bg-red-600");
      },
    );
  });

  describe("incomplete (the form is not valid yet)", () => {
    it("looks grey and is announced as unavailable", () => {
      render(<Button incomplete>Send</Button>);
      const button = screen.getByRole("button", { name: "Send" });
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).toHaveClass("bg-zinc-200", "text-zinc-500");
      expect(button).not.toHaveClass("bg-blue-600");
    });

    it("can still be pressed, so the user gets the messages that explain what is missing", async () => {
      const onClick = vi.fn();
      render(
        <Button incomplete onClick={onClick}>
          Send
        </Button>,
      );
      await userEvent.click(screen.getByRole("button", { name: "Send" }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});
