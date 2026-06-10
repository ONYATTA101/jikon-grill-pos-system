import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type FeedbackStatus = "success" | "error" | "info";

const styles: Record<FeedbackStatus, string> = {
  success: "border-leaf-500/40 bg-green-50 text-green-900 dark:bg-green-950/60 dark:text-green-100",
  error: "border-red-400/50 bg-red-50 text-red-900 dark:bg-red-950/70 dark:text-red-100",
  info: "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100"
};

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info
};

/**
 * Renders the reusable feedback banner section of the user interface from the information supplied by
 * its parent screen.
 */
export function FeedbackBanner({
  status = "info",
  message,
  className
}: {
  status?: FeedbackStatus;
  message?: string | null;
  className?: string;
}) {
  if (!message) return null;

  const Icon = icons[status];

  return (
    <div className={cn("flex items-start gap-2 rounded-md border px-3 py-2 text-sm font-semibold", styles[status], className)} role={status === "error" ? "alert" : "status"}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
