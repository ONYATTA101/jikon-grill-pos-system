import { FileText } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Loads the information needed for the owner audit logs screen and renders the page for the signed-in
 * user.
 */
export default async function OwnerAuditLogsPage() {
  const auditLogs = await prisma.auditLog.findMany({
    include: {
      user: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 100
  });

  return (
    <AppShell role="OWNER">
      <PageHeader eyebrow="Owner" title="Audit Logs" description="Permanent activity trail for sales, refunds, voids, discounts, stock, staff, and closing reports." />

      <Panel className="mt-5" title="Recent activity">
        <div className="space-y-3">
          {auditLogs.map((log) => (
            <div key={log.id} className="flex gap-3 rounded-md border border-zinc-200 p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-zinc-100 text-zinc-700">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black text-zinc-950">{log.action}</p>
                  <p className="text-sm font-bold text-zinc-500">
                    {log.createdAt.toLocaleString("en-KE", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
                <p className="mt-1 text-sm text-zinc-600">
                  {log.user?.name ?? "System"} - {log.description}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
                  {log.entity}
                  {log.entityId ? ` / ${log.entityId}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </AppShell>
  );
}
