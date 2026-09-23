import type { Metadata } from "next";
import "./globals.css";
import "./invoice-print.css";
import React from "react";
import Script from "next/script";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Green Harvest Mark - Dashboard",
  description: "Accounting, Inventory & Distribution Management Software",
};

const THEME_INIT_SCRIPT = `(function(){try{var m=localStorage.getItem('ghm.theme');var t=m?JSON.parse(m).state.theme:'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
