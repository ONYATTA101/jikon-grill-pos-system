import { BadgeCheck, Flame, Sparkles } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  return (
    <main className="min-h-screen app-surface px-4 py-8 text-zinc-950">
      <div className="fixed right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="login-stage relative min-h-[520px] overflow-hidden rounded-md border border-charcoal-700 p-6 text-white shadow-lift">
          <div className="absolute inset-x-8 top-8 h-24 rounded-md border border-white/10 grill-lines" />
          <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-ember-700/50 to-transparent" />
          <div className="relative z-10 flex h-full min-h-[470px] flex-col justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-md bg-ember-600 text-base font-black shadow-lg shadow-ember-950/20">JG</span>
              <div>
                <p className="text-sm font-semibold text-zinc-300">Restaurant and bar operations</p>
                <h1 className="text-3xl font-black tracking-normal">Jikon Grill POS</h1>
              </div>
            </div>

            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm font-bold text-amber-100">
                <Flame className="h-4 w-4" aria-hidden="true" />
                Live service control
              </div>
              <p className="mt-5 text-4xl font-black leading-tight tracking-normal sm:text-5xl">Sales, kitchen, bar, and owner reports in one place.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  ["Fast bills", "Table and takeaway orders"],
                  ["Stock watch", "Low-stock alerts"],
                  ["Owner view", "Daily close and profit"]
                ].map(([title, helper]) => (
                  <div key={title} className="rounded-md border border-white/15 bg-white/10 p-3 backdrop-blur">
                    <p className="text-sm font-black">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-300">{helper}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-zinc-300">
              <span className="inline-flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-leaf-500" aria-hidden="true" />
                Secure staff access
              </span>
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brass-500" aria-hidden="true" />
                Built for Jikon Grill
              </span>
            </div>
          </div>
        </section>

        <LoginForm />
      </div>
    </main>
  );
}
