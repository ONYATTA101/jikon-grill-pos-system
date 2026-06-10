import type { Role } from "@/lib/types";

export const roleLabels: Record<Role, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  CASHIER: "Cashier",
  WAITER: "Waiter",
  KITCHEN: "Kitchen",
  BARTENDER: "Bartender",
  ADMIN: "Admin"
};

export const demoUsers = [
  { email: "owner@jikongrill.com", name: "Amina Owner", role: "OWNER" as const, start: "/owner/dashboard" },
  { email: "manager@jikongrill.com", name: "Daniel Manager", role: "MANAGER" as const, start: "/dashboard" },
  { email: "cashier@jikongrill.com", name: "Mary Cashier", role: "CASHIER" as const, start: "/pos" },
  { email: "waiter@jikongrill.com", name: "Kevin Waiter", role: "WAITER" as const, start: "/tables" },
  { email: "kitchen@jikongrill.com", name: "Chef Otieno", role: "KITCHEN" as const, start: "/kitchen" },
  { email: "bar@jikongrill.com", name: "Brian Bar", role: "BARTENDER" as const, start: "/bar" }
];

export const permissions: Record<Role, string[]> = {
  OWNER: ["reports:all", "sales:read", "inventory:read", "profit:read", "audit:read", "users:manage"],
  MANAGER: ["reports:daily", "sales:read", "inventory:manage", "refunds:approve", "users:manage"],
  CASHIER: ["sales:create", "payments:create", "receipts:print"],
  WAITER: ["orders:create", "tables:manage"],
  KITCHEN: ["orders:kitchen"],
  BARTENDER: ["orders:bar"],
  ADMIN: ["system:setup", "users:manage"]
};

/**
 * Checks whether a staff role has a named permission before allowing an action or showing a control.
 */
export function hasPermission(role: Role, permission: string) {
  return permissions[role].includes(permission) || permissions[role].includes("reports:all");
}
