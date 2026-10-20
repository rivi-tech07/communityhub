import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './styles.css';
import ThemeToggle from './theme-toggle';

export const metadata: Metadata = { title: 'CommunityHub Admin', description: 'CommunityHub administration shell' };
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body>{children}<ThemeToggle /></body></html>;
}
