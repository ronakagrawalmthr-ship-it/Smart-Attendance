import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Department HOD Control Deck — Smart Attendance",
  description: "Department-specific live classroom matrices, student defaulter management, faculty monitoring, and grievance redressal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-[#FAF7F2] text-stone-900 antialiased selection:bg-teal-100 selection:text-teal-900">
      <body className="min-h-full flex flex-col font-sans bg-[#FAF7F2]">
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
