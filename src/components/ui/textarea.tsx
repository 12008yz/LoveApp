import { TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn("ui-textarea", className)} {...props} />;
});
