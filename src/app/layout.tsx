import type { Metadata, Viewport } from "next";
import { DM_Mono, DM_Sans, Manrope } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { Shell } from "@/components/shell/Shell";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const dm = DM_Sans({ subsets: ["latin"], variable: "--font-dm", display: "swap" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono-dm", display: "swap" });

export const metadata: Metadata = {
  title: "Rebotech Engineering CRM demo",
  description: "Demo CRM for Rebotech Engineering. All customers, jobs and figures are sample data.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#15233B", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" className={`${manrope.variable} ${dm.variable} ${mono.variable}`} data-shift="day" suppressHydrationWarning>
      <body>
        <StoreProvider>
          <Shell>{children}</Shell>
        </StoreProvider>
      </body>
    </html>
  );
}
