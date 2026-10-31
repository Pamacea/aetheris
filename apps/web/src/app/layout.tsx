import type { Metadata } from "next";
import { Cinzel, Geist_Mono, Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeInjector } from "@/components/theme-injector";
import { SkipLink } from "@/components/skip-link";
import { UserTheme } from "@/components/user-theme";

// Sans UI — interface et éléments interactifs.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

// Serif pour le lore — wiki, romans, citations (italique inclus).
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

// Serif d'inscription des titres (design system Pandémonium).
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aetheris",
  description: "Plateforme VTT & Lore Studio — campagnes, wiki, table virtuelle et romans.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${jakarta.variable} ${newsreader.variable} ${cinzel.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <SkipLink />
        {children}
        <ThemeInjector />
        <UserTheme />
      </body>
    </html>
  );
}
