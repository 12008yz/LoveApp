import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Stack({
  className,
  gap = "md",
  ...props
}: HTMLAttributes<HTMLDivElement> & { gap?: "sm" | "md" }) {
  return (
    <div className={cn("ui-stack", gap === "sm" && "ui-stack--sm", className)} {...props} />
  );
}
