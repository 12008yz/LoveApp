import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "default" | "rose" | "mint";

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
};

export function Badge({ className, tone = "default", ...props }: Props) {
  return (
    <span
      className={cn(
        "ui-badge",
        tone === "rose" && "ui-badge--rose",
        tone === "mint" && "ui-badge--mint",
        className,
      )}
      {...props}
    />
  );
}
