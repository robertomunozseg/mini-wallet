import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../Button";

describe("Button", () => {
  it("renders its label and is type=button by default", () => {
    render(<Button>Send</Button>);
    expect(screen.getByRole("button", { name: "Send" })).toHaveAttribute("type", "button");
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Send</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("can be used as a submit button", () => {
    render(<Button type="submit">Send</Button>);
    expect(screen.getByRole("button", { name: "Send" })).toHaveAttribute("type", "submit");
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

  it("is not busy when it is not loading", () => {
    render(<Button>Send</Button>);
    expect(screen.getByRole("button", { name: "Send" })).toHaveAttribute("aria-busy", "false");
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

    it("a disabled secondary button loses its hover colours", () => {
      render(
        <Button variant="secondary" disabled>
          Send
        </Button>,
      );
      expect(screen.getByRole("button", { name: "Send" })).not.toHaveClass("hover:bg-blue-50");
    });

    it("a loading button keeps its colour and only fades", () => {
      render(<Button loading>Send</Button>);
      const button = screen.getByRole("button", { name: "Send" });
      expect(button).toHaveClass("bg-blue-600", "opacity-60");
      expect(button).not.toHaveClass("bg-zinc-200");
    });

    it("an enabled button keeps its colour and does not fade", () => {
      render(<Button>Send</Button>);
      const button = screen.getByRole("button", { name: "Send" });
      expect(button).toHaveClass("bg-blue-600");
      expect(button).not.toHaveClass("opacity-60");
    });
  });

  it.each(["primary", "secondary", "danger", "ghost"] as const)(
    "renders the %s variant",
    (variant) => {
      render(<Button variant={variant}>Send</Button>);
      expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    },
  );

  it("can be activated with the keyboard", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Send</Button>);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Send" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
