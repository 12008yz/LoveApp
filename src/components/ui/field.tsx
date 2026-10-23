import { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ui-field", className)}>
      <label className="ui-field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <span className="ui-field__hint">{hint}</span> : null}
    </div>
  );
}
