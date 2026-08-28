import type { Metadata } from "next";
import { Fraunces, Manrope, Newsreader } from "next/font/google";
import "./globals.css";

/**
 * Three roles, one load each. They are variable fonts, so a single file covers the
 * weights the design uses (and Next self-hosts them — the browser never talks to Google).
 *
 *   Fraunces   — logo and the landing headline
 *   Newsreader — page titles, restaurant names, times
 *   Manrope    — everything else (body, labels, buttons)
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FirstSeat",
  description:
    "Get alerted the moment a hard-to-book restaurant table is released.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${newsreader.variable} ${manrope.variable} h-full min-h-dvh antialiased`}
    >
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
