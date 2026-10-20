import type { Metadata } from 'next';
import './styles.css';
import ThemeToggle from './theme-toggle';

export const metadata: Metadata = { title: 'CommunityHub Admin', description: 'CommunityHub administration shell' };
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return <html lang="en" suppressHydrationWarning><body>{children}<ThemeToggle /></body></html>;
}
