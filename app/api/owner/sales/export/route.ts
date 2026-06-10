import { getAuthorizedSession } from "@/lib/current-session";
import { csvResponse, toCsv } from "@/lib/csv";
import { getSalesHistory } from "@/lib/sales-report";

/**
 * Creates a downloadable CSV file containing the owner's sales history.
 */
export async function GET() {
  const session = await getAuthorizedSession(["OWNER"]);
  if (!session) {
    return Response.json({ error: "You are not allowed to export owner sales." }, { status: 403 });
  }

  const rows = await getSalesHistory();
  const csv = toCsv(
    rows.map((sale) => ({
      Receipt: sale.receipt,
      Time: sale.time,
      Table: sale.table,
      Cashier: sale.cashier,
      Payment: sale.paymentMethod,
      Total: sale.total,
      Status: sale.status
    }))
  );

  return csvResponse(`jikon-sales-${formatDate(new Date())}.csv`, csv);
}

/**
 * Formats a report date into a clear value suitable for a spreadsheet.
 */
function formatDate(date: Date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}
