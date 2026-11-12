import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'DIGITAL AI SUPPLIER',
  description: 'A multilingual AI-powered commerce and supplier platform'
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="mr"><body>{children}</body></html>;
}
