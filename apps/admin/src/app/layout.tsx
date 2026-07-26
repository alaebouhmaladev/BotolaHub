import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BotolaHub Admin',
  description: 'BotolaHub Administration Platform',
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
