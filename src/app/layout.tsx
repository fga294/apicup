import type { Metadata } from "next";
import { Anton, Archivo, Chivo_Mono } from "next/font/google";
import "./globals.css";

const anton = Anton({
  weight: "400",
  variable: "--font-anton",
  subsets: ["latin"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const chivoMono = Chivo_Mono({
  variable: "--font-chivo-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The API Cup — Artificial Prediction Intelligence",
  description:
    "World Cup 2026 prediction competition. Can humans outperform the machines?",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${archivo.variable} ${chivoMono.variable} h-full antialiased`}
    >
      <body className="grain min-h-full font-sans flex flex-col">{children}</body>
    </html>
  );
}
