import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { asCents } from "@/domain/money";
import type { Movement } from "@/domain/types";
import { VirtualMovementList } from "../components/VirtualMovementList";

// jsdom does not do layout, so every size is 0 and the virtualizer would render nothing. These
// numbers play the role of the browser: a 480 px tall scroll area and rows 73 px tall.
const VIEWPORT = 480;
const ROW = 73;

beforeAll(() => {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    // Only the scroll area is tall; a row is as tall as a row.
    return this.getAttribute("role") === "region" ? VIEWPORT : 73;
  });
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(600);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    () =>
      ({
        width: 600,
        height: ROW,
        top: 0,
        left: 0,
        right: 600,
        bottom: ROW,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect,
  );
});

afterAll(() => {
  vi.restoreAllMocks();
});

const makeMovements = (count: number): Movement[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `m-${index}`,
    type: index % 2 === 0 ? "incoming" : "outgoing",
    amountCents: asCents(1_000 + index),
    counterpartName: `Person ${index}`,
    createdAt: new Date(Date.UTC(2026, 9, 13) - index * 60_000).toISOString(),
    status: "completed",
  }));
};
const loadMore = vi.fn();

type Overrides = Partial<React.ComponentProps<typeof VirtualMovementList>>;

const renderList = (count: number, overrides: Overrides = {}) => {
  return render(
    <VirtualMovementList
      movements={makeMovements(count)}
      hasMore={false}
      isLoadingMore={false}
      loadMoreError={null}
      loadMore={loadMore}
      {...overrides}
    />,
  );
};
beforeEach(() => {
  loadMore.mockReset();
});

describe("VirtualMovementList", () => {
  describe("virtualization", () => {
    it("renders only the rows near the viewport, however many there are", () => {
      renderList(10_000, { hasMore: true });

      const rendered = screen.getAllByRole("listitem").length;
      expect(rendered).toBeGreaterThan(5);
      expect(rendered).toBeLessThan(25); // not 10,000
    });
  });

  describe("accessibility", () => {
    it("is a labelled region that can be focused to scroll with the keyboard", async () => {
      renderList(100);
      const region = screen.getByRole("region", { name: "Movements" });
      expect(region).toHaveAttribute("tabindex", "0");

      await userEvent.tab();
      expect(region).toHaveFocus();
    });
  });

  describe("infinite scroll", () => {
    it("loads the next page when the end of the loaded rows is reached", () => {
      renderList(3, { hasMore: true });
      expect(loadMore).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Loading more…")).toBeInTheDocument();
    });

    it("shows the error of a failed page with a retry button, and does not retry by itself", async () => {
      renderList(3, {
        hasMore: true,
        loadMoreError: { code: "NETWORK_ERROR", message: "We couldn't reach the server." },
      });

      expect(screen.getByRole("alert")).toHaveTextContent("We couldn't reach the server.");
      expect(loadMore).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(loadMore).toHaveBeenCalledTimes(1);
    });
  });
});
