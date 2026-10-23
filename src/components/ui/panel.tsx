import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  soft?: boolean;
  narrow?: boolean;
  children: ReactNode;
};

export function Panel({ title, soft, narrow, className, children, ...props }: Props) {
  return (
    <div
      className={cn(
        "ui-panel",
        soft && "ui-panel--soft",
        narrow && "ui-panel--narrow",
        className,
      )}
      {...props}
    >
      {title ? <h1 className="ui-panel__title">{title}</h1> : null}
      {children}
    </div>
  );
}
