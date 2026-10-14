import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "../components/LoginForm";

const useLoginMock = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useLogin", () => ({ useLogin: useLoginMock }));

const login = vi.fn();

function mockLogin(state: {
  isLoading?: boolean;
  error?: { code: string; message: string } | null;
}) {
  useLoginMock.mockReturnValue({ login, isLoading: false, error: null, ...state });
}

function field() {
  return screen.getByLabelText("Email or phone");
}

describe("LoginForm", () => {
  beforeEach(() => {
    login.mockReset();
    mockLogin({});
  });

  describe("validation", () => {
    it("shows no error before the user interacts", () => {
      render(<LoginForm />);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(field()).not.toHaveAttribute("aria-invalid");
    });

    it("requires a value on blur", async () => {
      render(<LoginForm />);
      await userEvent.click(field());
      await userEvent.tab();

      expect(screen.getByRole("alert")).toHaveTextContent("This field is required");
      expect(field()).toHaveAttribute("aria-invalid", "true");
    });

    it.each(["ana", "ana@", "551234567", "55123456789", "55-1234-5678"])(
      "rejects %j on blur",
      async (value) => {
        render(<LoginForm />);
        await userEvent.type(field(), value);
        await userEvent.tab();

        expect(screen.getByRole("alert")).toHaveTextContent(
          "Enter a valid email or a 10-digit phone number",
        );
      },
    );

    it.each(["ana@example.com", "5512345678"])("accepts %j", async (value) => {
      render(<LoginForm />);
      await userEvent.type(field(), value);
      await userEvent.tab();

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("clears the error once the value becomes valid", async () => {
      render(<LoginForm />);
      await userEvent.type(field(), "ana");
      await userEvent.tab();
      expect(screen.getByRole("alert")).toBeInTheDocument();

      await userEvent.type(field(), "@example.com");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("does not submit an invalid value and shows the error", async () => {
      render(<LoginForm />);
      await userEvent.type(field(), "ana");
      await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

      expect(login).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("does not submit an empty form", async () => {
      render(<LoginForm />);
      await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

      expect(login).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent("This field is required");
    });
  });

  describe("submit", () => {
    it("submits a valid email with the trimmed value", async () => {
      render(<LoginForm />);
      await userEvent.type(field(), "  ana@example.com  ");
      await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

      expect(login).toHaveBeenCalledTimes(1);
      expect(login).toHaveBeenCalledWith("ana@example.com");
    });

    it("submits a valid phone number", async () => {
      render(<LoginForm />);
      await userEvent.type(field(), "5512345678");
      await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

      expect(login).toHaveBeenCalledWith("5512345678");
    });

    it("submits with the Enter key", async () => {
      render(<LoginForm />);
      await userEvent.type(field(), "ana@example.com{Enter}");

      expect(login).toHaveBeenCalledWith("ana@example.com");
    });
  });

  describe("loading", () => {
    it("disables the button and marks it busy", () => {
      mockLogin({ isLoading: true });
      render(<LoginForm />);

      const button = screen.getByRole("button", { name: "Sign in" });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-busy", "true");
    });

    it("does not submit again while loading", async () => {
      mockLogin({ isLoading: true });
      render(<LoginForm />);
      await userEvent.type(field(), "ana@example.com{Enter}");

      expect(login).not.toHaveBeenCalled();
    });
  });

  describe("api errors", () => {
    it("shows invalid credentials in an alert", () => {
      mockLogin({
        error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials. Check your details." },
      });
      render(<LoginForm />);

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Invalid credentials. Check your details.",
      );
    });

    it("shows a network error in an alert", () => {
      mockLogin({
        error: { code: "NETWORK_ERROR", message: "We couldn't reach the server." },
      });
      render(<LoginForm />);

      expect(screen.getByRole("alert")).toHaveTextContent("We couldn't reach the server.");
    });

    it("keeps the form usable after an error", async () => {
      mockLogin({ error: { code: "NETWORK_ERROR", message: "We couldn't reach the server." } });
      render(<LoginForm />);
      await userEvent.type(field(), "ana@example.com");
      await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

      expect(login).toHaveBeenCalledWith("ana@example.com");
    });
  });

  describe("input type detection", () => {
    it.each([
      ["ana@example.com", "email"],
      ["5512345678", "tel"],
      ["ana", "text"],
    ])("sets inputMode for %j", async (value, inputMode) => {
      render(<LoginForm />);
      await userEvent.type(field(), value);

      expect(field()).toHaveAttribute("inputmode", inputMode);
    });
  });
});
