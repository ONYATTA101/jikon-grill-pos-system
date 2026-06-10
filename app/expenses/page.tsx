import { Plus } from "lucide-react";
import { ExpenseCategory, PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FeedbackBanner } from "@/components/feedback-banner";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { getAuthorizedSession } from "@/lib/current-session";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const categoryLabels: Record<ExpenseCategory, string> = {
  FOOD: "Food",
  BAR: "Bar",
  UTILITIES: "Utilities",
  PAYROLL: "Payroll",
  RENT: "Rent",
  OTHER: "Other"
};

const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  MPESA: "M-Pesa",
  CARD: "Card",
  BANK: "Bank",
  SPLIT: "Split"
};

export const dynamic = "force-dynamic";
const feedbackPath = (status: "success" | "error", message: string) => `/expenses?status=${status}&message=${encodeURIComponent(message)}`;

export default async function ExpensesPage({
  searchParams
}: {
  searchParams?: { status?: string; message?: string };
}) {
  async function saveExpense(formData: FormData) {
    "use server";

    const session = await getAuthorizedSession(["OWNER", "MANAGER"]);
    if (!session) redirect(feedbackPath("error", "You are not allowed to save expenses."));

    const title = String(formData.get("title") ?? "").trim();
    const category = String(formData.get("category") ?? ExpenseCategory.OTHER) as ExpenseCategory;
    const amount = Number(formData.get("amount") ?? 0);
    const paymentMode = String(formData.get("paymentMode") ?? PaymentMethod.CASH) as PaymentMethod;
    const notes = String(formData.get("notes") ?? "").trim();

    if (!title || !(category in ExpenseCategory) || !(paymentMode in PaymentMethod) || !Number.isFinite(amount) || amount <= 0) {
      redirect(feedbackPath("error", "Enter a title, category, payment mode, and amount above zero."));
    }

    try {
      const expense = await prisma.expense.create({
        data: {
          title,
          category,
          amount,
          paymentMode,
          notes: notes || null,
          createdById: session.userId
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: "EXPENSE_CREATED",
          entity: "Expense",
          entityId: expense.id,
          description: `${title} expense recorded for ${money(amount)}`,
          metadata: {
            category,
            amount,
            paymentMode,
            notes
          }
        }
      });
    } catch {
      redirect(feedbackPath("error", "Expense could not be saved."));
    }

    revalidatePath("/expenses");
    revalidatePath("/owner/audit-logs");
    redirect(feedbackPath("success", `${title} expense saved successfully.`));
  }

  const expenses = await prisma.expense.findMany({
    include: {
      createdBy: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 50
  });

  return (
    <AppShell role="MANAGER">
      <PageHeader
        eyebrow="Costs"
        title="Expenses"
        description="Track non-sale cash movement such as food purchases, utilities, rent, payroll, and packaging."
        actions={
          <button className="flex h-10 items-center gap-2 rounded-md bg-ember-600 px-3 text-sm font-bold text-white">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Expense
          </button>
        }
      />

      <FeedbackBanner status={searchParams?.status === "error" ? "error" : "success"} message={searchParams?.message} className="mt-5" />

      <div className="mt-5 grid gap-4 xl:grid-cols-[380px_1fr]">
        <Panel title="New expense">
          <form action={saveExpense} className="space-y-3">
            <label className="block text-sm font-bold text-zinc-800">
              Title
              <input name="title" required className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-ember-600" />
            </label>
            <label className="block text-sm font-bold text-zinc-800">
              Category
              <select name="category" required className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-ember-600">
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-bold text-zinc-800">
              Payment mode
              <select name="paymentMode" required className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-ember-600">
                {Object.entries(paymentLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-bold text-zinc-800">
              Amount
              <input name="amount" type="number" min={1} step="1" required className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-ember-600" />
            </label>
            <label className="block text-sm font-bold text-zinc-800">
              Notes
              <input name="notes" className="mt-2 h-10 w-full rounded-md border border-zinc-200 px-3 outline-none focus:border-ember-600" />
            </label>
            <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ember-600 text-sm font-bold text-white">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Save expense
            </button>
          </form>
        </Panel>

        <Panel title="Recent expenses">
          <div className="space-y-3">
            {expenses.map((expense) => (
              <div key={expense.id} className="grid gap-3 rounded-md border border-zinc-200 p-3 text-sm sm:grid-cols-[86px_1fr_120px]">
                <span className="font-bold text-zinc-500">
                  {expense.createdAt.toLocaleTimeString("en-KE", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
                <span>
                  <span className="block font-black text-zinc-950">{expense.title}</span>
                  <span className="block text-zinc-500">
                    {categoryLabels[expense.category]} - {paymentLabels[expense.paymentMode]} - {expense.createdBy?.name ?? "Manager"}
                  </span>
                  {expense.notes ? <span className="mt-1 block text-xs text-zinc-400">{expense.notes}</span> : null}
                </span>
                <span className="font-black text-zinc-950">{money(Number(expense.amount))}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
