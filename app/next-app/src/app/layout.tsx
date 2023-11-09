import type { Metadata } from "next";
import "./globals.css";
import Background from "@/components/Background";
import Header from "@/components/Header";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Scruffy2.0",
  description: "Piero Scaruffi's internet music database with a facelift.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-body">
        <Background />
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
