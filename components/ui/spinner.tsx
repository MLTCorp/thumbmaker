import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

function Spinner({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="spinner"
      className={cn("flex items-center justify-center", className)}
      {...props}
    >
      <Loader2 className="animate-spin" />
    </div>
  )
}

export { Spinner }
