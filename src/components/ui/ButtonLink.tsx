import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonClassName, type ButtonVariant } from "./Button";

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
};

// A real link (navigates, opens in a new tab, etc.) styled as a button.
export const ButtonLink = ({ variant = "primary", className, ...rest }: ButtonLinkProps) => {
  return <Link {...rest} className={buttonClassName(variant, className)} />;
};
