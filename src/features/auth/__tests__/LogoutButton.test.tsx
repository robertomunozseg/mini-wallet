import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogoutButton } from "../components/LogoutButton";

const useLogoutMock = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useLogout", () => ({ useLogout: useLogoutMock }));

const logout = vi.fn();

describe("LogoutButton", () => {
  beforeEach(() => {
    logout.mockReset();
    useLogoutMock.mockReturnValue({ logout, isLoading: false, error: null });
  });

  it("calls logout when clicked", async () => {
    render(<LogoutButton />);
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("is disabled while signing out", () => {
    useLogoutMock.mockReturnValue({ logout, isLoading: true, error: null });
    render(<LogoutButton />);
    expect(screen.getByRole("button", { name: "Sign out" })).toBeDisabled();
  });

  it("shows the error in an alert", () => {
    useLogoutMock.mockReturnValue({
      logout,
      isLoading: false,
      error: { code: "NETWORK_ERROR", message: "We couldn't reach the server." },
    });
    render(<LogoutButton />);
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't reach the server.");
  });
});
