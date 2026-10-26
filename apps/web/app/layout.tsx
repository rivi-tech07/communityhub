import type { Metadata } from 'next';
import { getSupabaseConfig } from '@communityhub/shared';
import './styles.css';
import ThemeToggle from './theme-toggle';

export const metadata: Metadata = {
  title: 'CommunityHub Admin',
  description: 'CommunityHub administration shell',
};

function hasSupabaseConfig() {
  return Boolean(
    getSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }),
  );
}

function UnavailablePage() {
  return (
    <main className="deployment-unavailable">
      <div className="deployment-unavailable-card">
        <p className="eyebrow">COMMUNITYHUB</p>
        <h1>Unavailable</h1>
        <p>This deployment is not configured for access.</p>
      </div>
    </main>
  );
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  const missingConfig = !hasSupabaseConfig();
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {missingConfig && !isDevelopment ? <UnavailablePage /> : children}
        {missingConfig && isDevelopment && (
          <div className="development-banner">Development mode</div>
        )}
        <ThemeToggle />
      </body>
    </html>
  );
}
