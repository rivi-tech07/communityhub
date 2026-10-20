import { supabaseConfig } from '../lib/supabase';

const stories = [
  ['+', 'Your story', 'story-new'],
  ['👩🏽', 'Neighbors', 'story-photo'],
  ['🥬', 'Food', 'story-food'],
  ['🧰', 'Jobs', 'story-jobs'],
  ['🏪', 'Marketplace', 'story-store'],
  ['👨‍👩‍👧', 'Community', 'story-family'],
];

const jobs = [
  ['Cafe team member', 'Riverside · Part-time', 'Apply'],
  ['Delivery driver', 'Westside · Full-time', 'Apply'],
  ['Store assistant', 'Lakeside · Part-time', 'Apply'],
];

const products = [
  ['🍅', 'Fresh tomatoes', '$2.99'],
  ['🍌', 'Bananas', '$1.49'],
  ['🥬', 'Lettuce', '$1.99'],
];

export default function DashboardPage() {
  return (
    <main className="community-web-shell">
      <header className="community-web-header">
        <a href="/" className="community-web-brand"><span className="brand-mark">✦</span>Community<span>Hub</span></a>
        <nav className="community-web-actions">
          <a href="/community">Communities</a><a href="/jobs">Jobs</a><a href="/businesses">Shop</a><a href="/login" className="web-sign-in">Sign in</a>
        </nav>
      </header>
      <section className="community-web-content">
        <div className="community-welcome"><div><p className="eyebrow">COMMUNITYHUB / HOME</p><h1>Good morning, discover your community.</h1><p className="muted">Connect with neighbours, find local opportunities, and support independent stores.</p></div><div className="web-status"><span />{supabaseConfig ? 'Connected' : 'Development preview'}</div></div>
        <div className="web-stories">{stories.map(([icon, label, tone]) => <a href={label === 'Jobs' ? '/jobs' : label === 'Marketplace' ? '/businesses' : '/community'} className="web-story" key={label}><div className={`web-story-circle ${tone}`}>{icon}</div><span>{label}</span></a>)}</div>
        <div className="web-feed-layout">
          <section className="web-feed-column">
            <article className="web-post-card"><div className="web-post-author"><div className="web-avatar">AM</div><div><strong>Arjun Mehta</strong><small>Riverside · 2h ago</small></div><b>•••</b></div><p className="web-post-copy">Beautiful morning in our community park! Grateful for these amazing people 🧡</p><img className="web-post-image" src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1000&q=85" alt="Friends enjoying a community park" /><small className="web-sample-tag">SAMPLE POST</small><div className="web-post-actions"><span className="liked">♥ 128</span><span>◯ 24</span><span>↗ Share</span><span>♡ Save</span></div></article>
            <article className="web-reel-card"><div className="web-reel-image"><img src="https://images.unsplash.com/photo-1543353071-10c8ba85a904?w=1000&q=85" alt="Healthy meal preparation" /><span className="web-play">▶</span><small>0:28</small></div><h2>Quick & healthy meal for busy days 🌿</h2><div className="web-post-actions"><span className="liked">♥ 342</span><span>◯ 56</span><span>↗ Share</span></div></article>
          </section>
          <aside className="web-side-column"><section className="web-feature-panel jobs-feature"><div className="web-panel-heading"><h2>Local jobs</h2><a href="/jobs">View all ›</a></div>{jobs.map(([title, meta, action]) => <div className="web-job-row" key={title}><div className="web-job-icon">▣</div><div><strong>{title}</strong><small>⌖ {meta}</small></div><button>{action}</button></div>)}</section><section className="web-feature-panel groceries-feature"><div className="web-panel-heading"><h2>Fresh groceries</h2><a href="/businesses">View all ›</a></div><img className="web-grocery-image" src="https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800&q=85" alt="Fresh vegetables" /><strong className="web-store-name">Green Valley Store</strong><small className="web-store-meta">Riverside · 1.2 km · Open today</small><div className="web-product-grid">{products.map(([emoji, name, price]) => <div className="web-product" key={name}><span>{emoji}</span><strong>{name}</strong><b>{price}</b><button>Add</button></div>)}</div></section></aside>
        </div>
      </section>
      <nav className="web-bottom-nav"><a className="selected" href="/">⌂<span>Home</span></a><a href="/community">＋<span>Post</span></a><a href="/jobs">▣<span>Jobs</span></a><a href="/businesses">🛒<span>Shop</span></a><a href="/profile">○<span>Profile</span></a></nav>
    </main>
  );
}
