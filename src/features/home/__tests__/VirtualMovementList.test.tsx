import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

function makeMovements(count: number): Movement[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `m-${index}`,
    type: index % 2 === 0 ? "incoming" : "outgoing",
    amountCents: asCents(1_000 + index),
    counterpartName: `Person ${index}`,
    createdAt: new Date(Date.UTC(2026, 9, 13) - index * 60_000).toISOString(),
    status: "completed",
  }));
}

const loadMore = vi.fn();

type Overrides = Partial<React.ComponentProps<typeof VirtualMovementList>>;

function renderList(count: number, overrides: Overrides = {}) {
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
}

function names(): string[] {
  return screen.queryAllByRole("listitem").map((item) => item.textContent ?? "");
}

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

    it("renders a short list completely", () => {
      renderList(4);
      expect(screen.getAllByRole("listitem")).toHaveLength(4);
    });

    it("starts at the first movement", () => {
      renderList(10_000, { hasMore: true });
      expect(names()[0]).toContain("Person 0");
      expect(screen.queryByText(/Person 5000/)).not.toBeInTheDocument();
    });

    it("keeps the scroll bar as long as the whole list", () => {
      renderList(1_000);
      const list = screen.getByRole("list");
      expect(list).toHaveStyle({ height: `${1_000 * ROW}px` });
    });

    it("adds the loading row to the height while more pages exist", () => {
      renderList(1_000, { hasMore: true });
      expect(screen.getByRole("list")).toHaveStyle({ height: `${1_001 * ROW}px` });
    });

    it("renders the rows around the new position after scrolling", async () => {
      renderList(10_000, { hasMore: true });
      const region = screen.getByRole("region", { name: "Movements" });

      region.scrollTop = 5_000 * ROW;
      fireEvent.scroll(region);

      await waitFor(() => expect(screen.getByText(/Person 5000/)).toBeInTheDocument());
      expect(screen.queryByText(/Person 0$/)).not.toBeInTheDocument();
      expect(screen.getAllByRole("listitem").length).toBeLessThan(25);
    });

    it("positions every row with a translate instead of rendering the rows before it", () => {
      renderList(100);
      const rows = screen.getAllByRole("listitem");
      expect(rows[0]).toHaveStyle({ position: "absolute", transform: "translateY(0px)" });
      expect(rows[1]).toHaveStyle({ transform: `translateY(${ROW}px)` });
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

    it("tells screen readers the position of each row", () => {
      renderList(100);
      const rows = screen.getAllByRole("listitem");
      expect(rows[0]).toHaveAttribute("aria-posinset", "1");
      expect(rows[2]).toHaveAttribute("aria-posinset", "3");
    });

    it("says the total is unknown (-1) while more pages exist", () => {
      renderList(100, { hasMore: true });
      expect(screen.getAllByRole("listitem")[0]).toHaveAttribute("aria-setsize", "-1");
    });

    it("gives the real total once everything is loaded", () => {
      renderList(100);
      expect(screen.getAllByRole("listitem")[0]).toHaveAttribute("aria-setsize", "100");
    });
  });

  describe("infinite scroll", () => {
    it("loads the next page when the end of the loaded rows is reached", () => {
      renderList(3, { hasMore: true });
      expect(loadMore).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Loading more…")).toBeInTheDocument();
    });

    it("does not load more while the end is far away", () => {
      renderList(1_000, { hasMore: true });
      expect(loadMore).not.toHaveBeenCalled();
    });

    it("loads more when scrolling reaches the end of a long list", async () => {
      renderList(200, { hasMore: true });
      expect(loadMore).not.toHaveBeenCalled();

      const region = screen.getByRole("region", { name: "Movements" });
      region.scrollTop = 200 * ROW;
      fireEvent.scroll(region);

      await waitFor(() => expect(loadMore).toHaveBeenCalled());
    });

    it("does not load more when there are no more pages", () => {
      renderList(3, { hasMore: false });
      expect(loadMore).not.toHaveBeenCalled();
      expect(screen.queryByText("Loading more…")).not.toBeInTheDocument();
    });

    it("does not ask again while a page is loading", () => {
      renderList(3, { hasMore: true, isLoadingMore: true });
      expect(loadMore).not.toHaveBeenCalled();
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
