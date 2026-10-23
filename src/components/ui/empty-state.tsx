import { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  title,
  text,
  action,
  className,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ui-empty", className)}>
      <h3 className="ui-empty__title">{title}</h3>
      {text ? <p className="ui-empty__text">{text}</p> : null}
      {action ? <div style={{ marginTop: "1rem" }}>{action}</div> : null}
    </div>
  );
}
