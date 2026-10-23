import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function ErrorText({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("ui-error", className)} role="alert" {...props} />;
}
