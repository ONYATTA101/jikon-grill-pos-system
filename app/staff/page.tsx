import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Plus, Save } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FeedbackBanner } from "@/components/feedback-banner";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { StatusPill } from "@/components/status-pill";
import { getAuthorizedSession } from "@/lib/current-session";
import { hashPassword } from "@/lib/password";
import { roleLabels } from "@/lib/rbac";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

const roleNames: Role[] = ["OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN", "BARTENDER", "ADMIN"];
const ownerOnlyRoles: Role[] = ["OWNER", "ADMIN"];
const minimumPasswordLength = 8;
const feedbackPath = (status: "success" | "error", message: string) => `/staff?status=${status}&message=${encodeURIComponent(message)}`;

async function createStaff(formData: FormData) {
  "use server";

  const session = await getAuthorizedSession(["OWNER", "MANAGER", "ADMIN"]);
  if (!session) redirect(feedbackPath("error", "You are not allowed to manage staff."));

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const roleName = String(formData.get("role") || "CASHIER") as Role;
  const password = String(formData.get("password") || "");

  if (!name || !email || password.length < minimumPasswordLength || !roleNames.includes(roleName)) {
    redirect(feedbackPath("error", `Enter a name, valid email, role, and password of at least ${minimumPasswordLength} characters.`));
  }

  if (session.role !== "OWNER" && ownerOnlyRoles.includes(roleName)) {
    redirect(feedbackPath("error", "Only the owner can assign owner or admin access."));
  }

  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) redirect(feedbackPath("error", "Selected role was not found."));

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash: await hashPassword(password),
        roleId: role.id,
        status: "ACTIVE"
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "CREATE_STAFF",
        entity: "User",
        entityId: user.id,
        description: `Created staff account for ${user.email}`,
        metadata: { role: roleName }
      }
    });
  } catch {
    redirect(feedbackPath("error", "Staff account could not be created. Check if the email already exists."));
  }

  revalidatePath("/staff");
  redirect(feedbackPath("success", `${name} was added successfully.`));
}

async function updateStaff(formData: FormData) {
  "use server";

  const session = await getAuthorizedSession(["OWNER", "MANAGER", "ADMIN"]);
  if (!session) redirect(feedbackPath("error", "You are not allowed to manage staff."));

  const userId = String(formData.get("userId") || "");
  const name = String(formData.get("name") || "").trim();
  const roleName = String(formData.get("role") || "CASHIER") as Role;
  const status = String(formData.get("status") || "ACTIVE") === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
  const password = String(formData.get("password") || "");

  if (!userId || !name || !roleNames.includes(roleName)) {
    redirect(feedbackPath("error", "Choose a staff member, name, and valid role before saving."));
  }

  if (password && password.length < minimumPasswordLength) {
    redirect(feedbackPath("error", `New passwords must be at least ${minimumPasswordLength} characters.`));
  }

  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) redirect(feedbackPath("error", "Selected role was not found."));

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true }
  });
  if (!target) redirect(feedbackPath("error", "Staff account was not found."));

  if (session.role !== "OWNER" && ownerOnlyRoles.includes(target.role.name as Role)) {
    redirect(feedbackPath("error", "Only the owner can update owner or admin accounts."));
  }

  if (session.role !== "OWNER" && ownerOnlyRoles.includes(roleName)) {
    redirect(feedbackPath("error", "Only the owner can assign owner or admin access."));
  }

  if (target.role.name === "OWNER" && (roleName !== "OWNER" || status !== "ACTIVE")) {
    const otherActiveOwners = await prisma.user.count({
      where: {
        id: { not: target.id },
        status: "ACTIVE",
        role: { name: "OWNER" }
      }
    });

    if (otherActiveOwners === 0) {
      redirect(feedbackPath("error", "The only active owner cannot be suspended or assigned another role."));
    }
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        roleId: role.id,
        status,
        ...(password.length >= minimumPasswordLength ? { passwordHash: await hashPassword(password) } : {})
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "UPDATE_STAFF",
        entity: "User",
        entityId: user.id,
        description: `Updated staff account for ${user.email}`,
        metadata: {
          role: roleName,
          status,
          passwordChanged: password.length >= minimumPasswordLength
        }
      }
    });
  } catch {
    redirect(feedbackPath("error", "Staff account could not be updated."));
  }

  revalidatePath("/staff");
  redirect(feedbackPath("success", password.length >= minimumPasswordLength ? `${name} was updated and password changed.` : `${name} was updated.`));
}

export default async function StaffPage({
  searchParams
}: {
  searchParams?: { status?: string; message?: string };
}) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const users = await prisma.user.findMany({
    include: {
      role: true,
      cashierSales: {
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          paymentStatus: "PAID"
        }
      }
    },
    orderBy: {
      name: "asc"
    }
  });
  const staffMembers = users.map((user) => ({
    id: user.id,
    name: user.name,
    role: user.role.name as Role,
    email: user.email,
    phone: user.phone || "",
    rawStatus: user.status,
    status: user.status === "ACTIVE" ? "Active" : "Suspended",
    salesToday: user.cashierSales.reduce((sum, sale) => sum + Number(sale.total), 0)
  }));

  return (
    <AppShell role="MANAGER">
      <PageHeader
        eyebrow="Access"
        title="Staff"
        description="Role-based access for owner, manager, cashier, waiter, kitchen, bartender, and admin."
        actions={
          <a href="#new-staff" className="flex h-10 items-center gap-2 rounded-md bg-ember-600 px-3 text-sm font-bold text-white">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Staff
          </a>
        }
      />

      <FeedbackBanner status={searchParams?.status === "error" ? "error" : "success"} message={searchParams?.message} className="mt-5" />

      <Panel className="mt-5" title="Add staff" subtitle="Create a real login for a new staff member.">
        <form id="new-staff" action={createStaff} className="grid gap-3 md:grid-cols-[1.2fr_1.2fr_0.9fr_0.9fr_1fr_auto]">
          <label className="text-sm font-bold text-zinc-800">
            Name
            <input name="name" className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-ember-600" required />
          </label>
          <label className="text-sm font-bold text-zinc-800">
            Email
            <input name="email" type="email" className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-ember-600" required />
          </label>
          <label className="text-sm font-bold text-zinc-800">
            Phone
            <input name="phone" className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-ember-600" />
          </label>
          <label className="text-sm font-bold text-zinc-800">
            Role
            <select name="role" defaultValue="CASHIER" className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-ember-600">
              {roleNames.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-zinc-800">
            Password
            <input name="password" type="password" minLength={minimumPasswordLength} className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-ember-600" required />
          </label>
          <button className="mt-7 flex h-10 items-center justify-center gap-2 rounded-md bg-charcoal-900 px-4 text-sm font-bold text-white transition hover:bg-charcoal-800">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add
          </button>
        </form>
      </Panel>

      <Panel className="mt-5" title="Team access">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-[0.12em] text-zinc-500">
              <tr>
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Email</th>
                <th className="py-3 pr-4">Sales today</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">New password</th>
                <th className="py-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {staffMembers.map((staff) => (
                <tr key={staff.email}>
                  <td className="py-3 pr-4">
                    <form id={`staff-${staff.id}`} action={updateStaff}>
                      <input type="hidden" name="userId" value={staff.id} />
                      <input
                        name="name"
                        defaultValue={staff.name}
                        className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm font-black text-zinc-950 outline-none focus:border-ember-600"
                      />
                    </form>
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      name="role"
                      form={`staff-${staff.id}`}
                      defaultValue={staff.role}
                      className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm font-semibold text-zinc-700 outline-none focus:border-ember-600"
                    >
                      {roleNames.map((role) => (
                        <option key={role} value={role}>
                          {roleLabels[role]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 pr-4 text-zinc-600">{staff.email}</td>
                  <td className="py-3 pr-4 font-semibold text-zinc-950">{money(staff.salesToday)}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <select
                        name="status"
                        form={`staff-${staff.id}`}
                        defaultValue={staff.rawStatus}
                        className="h-10 rounded-md border border-zinc-200 px-3 text-sm font-semibold text-zinc-700 outline-none focus:border-ember-600"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="SUSPENDED">Suspended</option>
                      </select>
                      <StatusPill status={staff.status} />
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <input
                      name="password"
                      form={`staff-${staff.id}`}
                      type="password"
                      minLength={minimumPasswordLength}
                      placeholder="Leave blank"
                      className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-ember-600"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <button form={`staff-${staff.id}`} className="flex h-10 items-center justify-center gap-2 rounded-md bg-ember-600 px-3 text-sm font-bold text-white transition hover:bg-ember-700">
                      <Save className="h-4 w-4" aria-hidden="true" />
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
