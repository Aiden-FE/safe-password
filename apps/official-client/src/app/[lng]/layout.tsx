import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { dir } from 'i18next';
import { ThemeStoreProvider } from '@/providers/theme-store';
import { Languages } from '@/config';
import { PageProps } from '@/interfaces';
import '@/assets/styles/global.scss';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Safe password',
  description: 'Safe password',
};

export async function generateStaticParams() {
  return Languages.map((lng) => ({ lng }));
}

export default function RootLayout({
  children,
  params: { lng },
}: Readonly<
  PageProps & {
    children: React.ReactNode;
  }
>) {
  return (
    <html lang={lng} dir={dir(lng)}>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeStoreProvider>{children}</ThemeStoreProvider>
      </body>
    </html>
  );
}
