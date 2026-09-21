import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dreambiz - Modern Multi-Store E-commerce Platform | Bigger Ideas Ahead",
  description: "Build an online store your customers will love. Everything you need to bring your business online, sell effortlessly, and grow.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
        {children}
      </body>
      <GoogleAnalytics gaId="G-0JJD1RDQ7C" />
    </html>
  );
}
