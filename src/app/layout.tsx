import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/lib/providers/theme-provider';
import { AuthProvider } from '@/lib/providers/auth-context';
import { SupabaseProvider } from '@/lib/providers/supabase-context';
import { SubscriptionProvider } from '@/lib/providers/subscription-context';
import { ArticleViewsProvider } from '@/lib/providers/article-views';
import { OnbordaProvider } from '@/lib/providers/onborda-provider';
import { cn } from '@/lib/utils';
import "./globals.css";

const fontSans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    template: "ConnectCRE | %s",
    default: "ConnectCRE: Commercial Real Estate Platform",
  },
  description: "Access real-time commercial real estate data, development news, and comprehensive project tracking. Find exclusive CRE deals and connect with industry professionals.",
  keywords: [
    "commercial real estate",
    "CRE market data",
    "real estate development news",
    "project tracking platform",
    "construction updates",
    "property development",
    "urban development projects",
    "commercial property deals",
    "development pipeline",
    "real estate professionals"
  ],
  openGraph: {
    title: "ConnectCRE: Commercial Real Estate Platform",
    description: "Access real-time commercial real estate data, development news, and comprehensive project tracking.",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/images/og-image.png`,
        width: 1200,
        height: 630,
        alt: "ConnectCRE - Commercial Real Estate Platform"
      }
    ],
    locale: "en_US",
    type: "website",
    siteName: "ConnectCRE",
  },
  twitter: {
    card: 'summary_large_image',
    title: "ConnectCRE: Commercial Real Estate Platform",
    description: "Access real-time commercial real estate data and connect with industry professionals.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#09090b" media="(prefers-color-scheme: dark)" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased overscroll-none",
          fontSans.variable
        )}
      >
        <ClerkProvider
          appearance={{
            baseTheme: undefined,
            variables: {
              colorPrimary: "#000000",
            },
          }}
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
          afterSignOutUrl="/"
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SupabaseProvider>
              <AuthProvider>
                <SubscriptionProvider>
                  <ArticleViewsProvider>
                    <OnbordaProvider>
                      {children}
                      <Toaster richColors />
                    </OnbordaProvider>
                  </ArticleViewsProvider>
                </SubscriptionProvider>
              </AuthProvider>
            </SupabaseProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
