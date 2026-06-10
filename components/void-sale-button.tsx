"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";

export function VoidSaleButton({
  saleId,
  receipt
}: {
  saleId: string;
  receipt: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function voidSale() {
    const reason = window.prompt(`Reason for voiding ${receipt}?`);
    if (reason === null) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/sales/${saleId}/void`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        window.alert(payload.error ?? "Sale could not be voided.");
        return;
      }

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={voidSale}
      disabled={loading}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Ban className="h-3.5 w-3.5" aria-hidden="true" />
      {loading ? "Voiding..." : "Void"}
    </button>
  );
}
