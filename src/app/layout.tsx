import type { Metadata } from "next";
import { Inter, Noto_Serif_JP, Zen_Old_Mincho } from "next/font/google";
import "./globals.css";

// Zen Old Mincho — a mincho serif whose Latin glyphs carry the same brush
// DNA as the Japanese accents. Display face for headlines, wordmark, quotes.
const zenMincho = Zen_Old_Mincho({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-brand",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const notoSerifJp = Noto_Serif_JP({
  // next/font declares latin/latin-ext/vietnamese/cyrillic for this face; the
  // Japanese glyph slices (incl. 緑) are self-hosted via unicode-range slices.
  subsets: ["latin"],
  weight: "400",
  variable: "--font-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Midori — Everyday wellness, the calm way",
  description:
    "Elizabeth David, RN keeps a calm corner of Accra stocked with vitamins, blood-pressure monitors, baby care, and first aid that fit real days — no noise, no jargon. Free delivery over GHS 200.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${zenMincho.variable} ${inter.variable} ${notoSerifJp.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
