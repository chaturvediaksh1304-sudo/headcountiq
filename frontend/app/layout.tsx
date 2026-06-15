import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "HeadcountIQ — Workforce Analytics",
  description: "People Systems & Analytics dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans bg-page text-ink">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-[220px] px-10 py-8 max-w-[1400px]">{children}</main>
        </div>
      </body>
    </html>
  );
}
