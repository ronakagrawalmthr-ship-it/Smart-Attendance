import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "College Administrator Portal — Institutional Governance",
  description: "Whole college attendance intelligence across all engineering & science departments, HOD directories, and institutional policy enforcement.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-[#FAF7F2] text-stone-900 antialiased">
      <body className="min-h-full flex flex-col font-sans bg-[#FAF7F2]">
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
