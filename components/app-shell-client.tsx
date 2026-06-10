"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BarChart3,
  Boxes,
  ChefHat,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Table2,
  Truck,
  Users,
  Wallet,
  Wine
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { roleLabels } from "@/lib/rbac";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
};

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Staff",
    items: [
      { href: "/pos", label: "POS", icon: ShoppingCart, roles: ["OWNER", "MANAGER", "CASHIER", "WAITER"] },
      { href: "/tables", label: "Tables", icon: Table2, roles: ["OWNER", "MANAGER", "WAITER", "CASHIER"] },
      { href: "/orders", label: "Orders", icon: ClipboardList, roles: ["OWNER", "MANAGER", "WAITER", "CASHIER"] },
      { href: "/kitchen", label: "Kitchen", icon: ChefHat, roles: ["OWNER", "MANAGER", "KITCHEN"] },
      { href: "/bar", label: "Bar", icon: Wine, roles: ["OWNER", "MANAGER", "BARTENDER"] }
    ]
  },
  {
    label: "Manager",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["OWNER", "MANAGER"] },
      { href: "/closing", label: "Daily Close", icon: Save, roles: ["OWNER", "MANAGER"] },
      { href: "/products", label: "Products", icon: Package, roles: ["OWNER", "MANAGER"] },
      { href: "/inventory", label: "Inventory", icon: Boxes, roles: ["OWNER", "MANAGER"] },
      { href: "/stock-adjustments", label: "Stock Adjust", icon: Settings, roles: ["OWNER", "MANAGER"] },
      { href: "/suppliers", label: "Suppliers", icon: Truck, roles: ["OWNER", "MANAGER"] },
      { href: "/expenses", label: "Expenses", icon: Wallet, roles: ["OWNER", "MANAGER"] },
      { href: "/staff", label: "Staff", icon: Users, roles: ["OWNER", "MANAGER", "ADMIN"] },
      { href: "/settings", label: "Settings", icon: Settings, roles: ["OWNER", "MANAGER", "ADMIN"] }
    ]
  },
  {
    label: "Owner",
    items: [
      { href: "/owner/dashboard", label: "Live Report", icon: ShieldCheck, roles: ["OWNER"] },
      { href: "/owner/reports", label: "Reports", icon: BarChart3, roles: ["OWNER"] },
      { href: "/owner/sales", label: "Sales", icon: Receipt, roles: ["OWNER"] },
      { href: "/owner/refunds", label: "Refunds", icon: RotateCcw, roles: ["OWNER"] },
      { href: "/owner/inventory", label: "Stock Variance", icon: Boxes, roles: ["OWNER"] },
      { href: "/owner/profit", label: "Profit", icon: Wallet, roles: ["OWNER"] },
      { href: "/owner/audit-logs", label: "Audit Logs", icon: FileText, roles: ["OWNER"] }
    ]
  }
];

/**
 * Renders the reusable app shell client section of the user interface from the information supplied by
 * its parent screen.
 */
export function AppShellClient({
  role,
  name,
  children
}: {
  role: Role;
  name?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen app-surface text-zinc-950 transition-colors dark:text-zinc-100">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-charcoal-700 bg-charcoal-900 text-white shadow-2xl shadow-zinc-950/20 lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col">
            <div className="login-stage flex items-center justify-between gap-3 border-b border-white/10 p-4">
              <Link href="/owner/dashboard" className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-ember-600 text-sm font-black shadow-lg shadow-ember-950/30">JG</span>
                <span className="min-w-0">
                  <span className="block truncate text-base font-black">Jikon Grill</span>
                  <span className="block truncate text-xs font-medium text-zinc-300">Restaurant POS</span>
                </span>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <ThemeToggle />
                <Link
                  href="/api/auth/logout"
                  aria-label="Sign out"
                  className="grid h-10 w-10 place-items-center rounded-md border border-white/10 text-zinc-300 transition hover:bg-white/10 hover:text-white"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <nav className="flex-1 space-y-6 overflow-y-auto p-4">
              {navGroups.map((group) => {
                const items = group.items.filter((item) => item.roles.includes(role));
                if (!items.length) return null;

                return (
                  <div key={group.label}>
                    <p className="px-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">{group.label}</p>
                    <div className="mt-2 space-y-1">
                      {items.map((item) => {
                        const Icon = item.icon;
                        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold transition",
                              active
                                ? "bg-white text-charcoal-900 shadow-lg shadow-zinc-950/20"
                                : "text-zinc-300 hover:bg-white/10 hover:text-white"
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>

            <div className="border-t border-white/10 p-4">
              <div className="rounded-md border border-white/10 bg-white/10 p-3">
                <p className="text-xs font-semibold text-zinc-300">Signed in as</p>
                <p className="mt-1 truncate text-sm font-bold text-white">{name || roleLabels[role]}</p>
                <p className="mt-1 text-xs font-semibold text-zinc-300">{roleLabels[role]}</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
