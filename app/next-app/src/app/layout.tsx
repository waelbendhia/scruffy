import type { Metadata } from "next";
import "./globals.css";
import Background from "@/components/Background";
import Header from "@/components/Header";
import Providers from "@/components/Providers";
import { Libre_Baskerville, Work_Sans } from "next/font/google";
import Footer from "@/components/Footer";

const libreBaskerville = Libre_Baskerville({
  display: "swap",
  weight: ["400", "700"],
  subsets: ["latin-ext"],
  variable: "--font-libre-baskerville",
});

const workSans = Work_Sans({
  display: "swap",
  weight: ["300", "400", "700"],
  subsets: ["latin-ext"],
  variable: "--font-work-sans",
});

export const metadata: Metadata = {
  title: { absolute: "Scruffy2.0", template: "%s - Scruffy2.0" },
  description: "Piero Scaruffi's internet music database with a facelift.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${workSans.variable} ${libreBaskerville.variable}`}
    >
      <body className="flex flex-col">
        <Background />
        <Providers>
          <Header />
          {children}
        </Providers>
        <Footer />
      </body>
    </html>
  );
}
