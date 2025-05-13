
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type IconProps = React.HTMLAttributes<SVGElement>;

export const Icons = {
  spinner: (props: IconProps) => (
    <Loader2
      className={cn("h-4 w-4 animate-spin", props.className)}
      {...props}
    />
  ),
};
