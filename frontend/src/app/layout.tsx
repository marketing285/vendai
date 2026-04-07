import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MAX",
  description: "Monitor Ativo de Operações",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="page-orb">{children}</body>
    </html>
  );
}
