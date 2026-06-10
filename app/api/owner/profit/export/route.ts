import { getAuthorizedSession } from "@/lib/current-session";
import { csvResponse, toCsv } from "@/lib/csv";
import { getProfitRows } from "@/lib/sales-report";

/**
 * Creates a downloadable CSV file containing the owner's profit report.
 */
export async function GET() {
  const session = await getAuthorizedSession(["OWNER"]);
  if (!session) {
    return Response.json({ error: "You are not allowed to export owner profit." }, { status: 403 });
  }

  const rows = await getProfitRows();
  const csv = toCsv(
    rows.map((row) => ({
      Item: row.name,
      "Selling price": row.sellingPrice,
      Cost: row.cost,
      "Gross profit": row.grossProfit,
      "Quantity sold": row.quantitySold,
      Revenue: row.revenue,
      "Total cost": row.totalCost,
      "Total profit": row.totalProfit
    }))
  );

  return csvResponse(`jikon-profit-${formatDate(new Date())}.csv`, csv);
}

/**
 * Formats a report date into a clear value suitable for a spreadsheet.
 */
function formatDate(date: Date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}
