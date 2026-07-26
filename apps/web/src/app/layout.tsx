import './globals.css';
import { AuthProvider } from '../context/AuthContext';

export const metadata = {
  title: 'BotolaHub — 1X2 Botola Pro Prediction Game',
  description: "Morocco's official weekly Botola Pro Inwi 1X2 match prediction game.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
