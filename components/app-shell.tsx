import type { ReactNode } from "react";
import { AppShellClient } from "@/components/app-shell-client";
import { getCurrentSession } from "@/lib/current-session";
import type { Role } from "@/lib/types";

/**
 * Renders the reusable app shell section of the user interface from the information supplied by its
 * parent screen.
 */
export async function AppShell({
  role = "MANAGER",
  children
}: {
  role?: Role;
  children: ReactNode;
}) {
  const session = await getCurrentSession();
  const activeRole = session?.role ?? role;

  return (
    <AppShellClient role={activeRole} name={session?.name}>
      {children}
    </AppShellClient>
  );
}
