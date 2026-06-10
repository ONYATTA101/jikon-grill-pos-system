"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

/**
 * Renders the reusable refund action buttons section of the user interface from the information
 * supplied by its parent screen.
 */
export function RefundActionButtons({ refundId }: { refundId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"APPROVED" | "REJECTED" | null>(null);

  /**
   * Approves or rejects a pending refund request and refreshes the owner review screen.
   */
  async function updateRefund(status: "APPROVED" | "REJECTED") {
    setLoading(status);
    try {
      const response = await fetch(`/api/refunds/${refundId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        window.alert(payload.error ?? "Refund could not be updated.");
        return;
      }

      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => updateRefund("APPROVED")}
        disabled={Boolean(loading)}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-leaf-600 px-3 text-xs font-bold text-white transition hover:bg-leaf-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        {loading === "APPROVED" ? "Approving..." : "Approve"}
      </button>
      <button
        type="button"
        onClick={() => updateRefund("REJECTED")}
        disabled={Boolean(loading)}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
        {loading === "REJECTED" ? "Rejecting..." : "Reject"}
      </button>
    </div>
  );
}
