import type { Metadata } from 'next';
import { Zen_Maru_Gothic } from 'next/font/google';
import './globals.css';

const diaryFont = Zen_Maru_Gothic({
  weight: ['400', '700'],
  variable: '--font-diary',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL('https://picturediary.vercel.app'),
  title: 'まいにち絵日記',
  description: 'スマホの写真で、かんたんに絵日記を作って保存できます。',
  openGraph: {
    title: 'まいにち絵日記',
    description: '写真から、今日の一枚を。スマホでかんたんに絵日記を作れます。',
    url: 'https://picturediary.vercel.app',
    siteName: 'まいにち絵日記',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: '/og.png', width: 1792, height: 1024, alt: 'まいにち絵日記' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'まいにち絵日記',
    description: '写真から、今日の一枚を。スマホでかんたんに絵日記を作れます。',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja" className={diaryFont.variable}><body>{children}</body></html>;
}
