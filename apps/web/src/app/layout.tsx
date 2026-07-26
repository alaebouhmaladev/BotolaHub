import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BotolaHub — Morocco 1X2 Prediction Game',
  description: "Morocco's Botola Pro Inwi Weekly Match Prediction Game",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
