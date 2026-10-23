import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "sm";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", block, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "ui-btn",
        variant === "primary" && "ui-btn--primary",
        variant === "secondary" && "ui-btn--secondary",
        variant === "ghost" && "ui-btn--ghost",
        size === "sm" && "ui-btn--sm",
        block && "ui-btn--block",
        className,
      )}
      {...props}
    />
  );
});
