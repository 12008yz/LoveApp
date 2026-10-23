import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Props = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn("ui-select", className)} {...props}>
      {children}
    </select>
  );
});
