import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '700', '900'],
});

export const metadata: Metadata = {
  title: 'Makkan - Local PDF DMS',
  description: 'A local-first document management system for PDF collections with markdown-based metadata',
  icons: {
    icon: '/images/fevicon/favicon.ico',
    apple: '/images/fevicon/apple-touch-icon.png',
  },
  manifest: '/images/fevicon/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/images/fevicon/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/images/fevicon/favicon-16x16.png" />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              classNames: {
                toast: 'border-border',
                title: 'text-foreground',
                description: 'text-muted-foreground',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
