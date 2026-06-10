import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jikon Grill POS",
  description: "Restaurant and bar POS system for Jikon Grill"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const storedTheme = localStorage.getItem("jikon-theme");
                const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                const theme = storedTheme || (prefersDark ? "dark" : "light");
                document.documentElement.classList.toggle("dark", theme === "dark");
                document.documentElement.style.colorScheme = theme;
              } catch {}
            `
          }}
        />
        {children}
      </body>
    </html>
  );
}
