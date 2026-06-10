"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

/**
 * Renders the reusable request refund button section of the user interface from the information
 * supplied by its parent screen.
 */
export function RequestRefundButton({
  saleId,
  receipt,
  total
}: {
  saleId: string;
  receipt: string;
  total: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  /**
   * Submits a refund request for a sale after collecting the amount and reason from the staff member.
   */
  async function requestRefund() {
    const amountInput = window.prompt(`Refund amount for ${receipt}`, String(total));
    if (amountInput === null) return;

    const amount = Number(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert("Enter a valid refund amount.");
      return;
    }

    const reason = window.prompt("Reason for refund?");
    if (reason === null) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/sales/${saleId}/refunds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount, reason })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        window.alert(payload.error ?? "Refund request could not be created.");
        return;
      }

      window.alert("Refund request sent for approval.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={requestRefund}
      disabled={loading}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-800 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
      {loading ? "Requesting..." : "Refund"}
    </button>
  );
}
