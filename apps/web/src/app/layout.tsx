import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BotolaHub — Fantasy Football for Morocco’s Botola Pro',
  description: 'The official fantasy football platform for Morocco’s Botola Pro.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>{children}</body>
    </html>
  );
}
