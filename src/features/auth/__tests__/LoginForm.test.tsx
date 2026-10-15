import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "../components/LoginForm";

const useLoginMock = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useLogin", () => ({ useLogin: useLoginMock }));

const login = vi.fn();

const mockLogin = (state: {
  isLoading?: boolean;
  error?: { code: string; message: string } | null;
}) => {
  useLoginMock.mockReturnValue({ login, isLoading: false, error: null, ...state });
};
const field = () => {
  return screen.getByLabelText("Email or phone");
};
describe("LoginForm", () => {
  beforeEach(() => {
    login.mockReset();
    mockLogin({});
  });

  describe("Sign in button", () => {
    function signIn() {
      return screen.getByRole("button", { name: "Sign in" });
    }

    it("is grey (aria-disabled) while the field is empty or invalid", async () => {
      render(<LoginForm />);
      expect(signIn()).toHaveAttribute("aria-disabled", "true");

      await userEvent.type(field(), "not-valid");
      expect(signIn()).toHaveAttribute("aria-disabled", "true");
    });

    it("still explains what is wrong when it is pressed", async () => {
      render(<LoginForm />);
      await userEvent.click(signIn());

      expect(screen.getByRole("alert")).toHaveTextContent("This field is required");
      expect(login).not.toHaveBeenCalled();
    });
  });

  describe("validation", () => {
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

    it("does not submit an invalid value and shows the error", async () => {
      render(<LoginForm />);
      await userEvent.type(field(), "ana");
      await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

      expect(login).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toBeInTheDocument();
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
  });

  describe("loading", () => {
    it("disables the button and marks it busy", () => {
      mockLogin({ isLoading: true });
      render(<LoginForm />);

      const button = screen.getByRole("button", { name: "Sign in" });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-busy", "true");
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
  });
});
