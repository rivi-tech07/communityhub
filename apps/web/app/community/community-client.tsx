'use client';

import { useEffect, useState } from 'react';
import { createSupabaseClient, getSupabaseConfig, type Database } from '@communityhub/shared';

const config = getSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY });
const supabase = config ? createSupabaseClient(config) : null;
type Community = Database['public']['Tables']['communities']['Row'];
type Post = Database['public']['Tables']['posts']['Row'];
type Comment = Database['public']['Tables']['comments']['Row'];

export default function CommunityClient() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selected, setSelected] = useState<Community | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [query, setQuery] = useState('');
  const [body, setBody] = useState('');
  const [commentBody, setCommentBody] = useState<Record<string, string>>({});
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  async function token() { const session = await supabase?.auth.getSession(); return session?.data.session?.access_token ?? null; }
  async function call(path: string, init?: RequestInit, authRequired = true) {
    const accessToken = authRequired ? await token() : null;
    if (authRequired && !accessToken) throw new Error('Sign in to perform this action.');
    const response = await fetch(path, { ...init, headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(init?.headers ?? {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? 'Request failed.');
    return payload;
  }
  async function loadCommunities(search = '') {
    try {
      setLoading(true);
      const suffix = search ? `&query=${encodeURIComponent(search)}` : '';
      const payload = await call(`/api/communities?public=true${suffix}`, undefined, false);
      setCommunities(payload.communities ?? []);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load communities.'); } finally { setLoading(false); }
  }
  async function loadFeed(community: Community, cursor?: string | null) {
    try {
      const publicOnly = !sessionUserId;
      const params = new URLSearchParams({ communityId: community.id });
      if (publicOnly) params.set('public', 'true');
      if (cursor) params.set('cursor', cursor);
      const payload = await call(`/api/feed?${params.toString()}`, undefined, !publicOnly);
      setPosts((current) => cursor ? [...current, ...(payload.posts ?? [])] : (payload.posts ?? []));
      setNextCursor(payload.nextCursor ?? null);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load feed.'); }
  }
  async function selectCommunity(community: Community) { setSelected(community); setComments({}); await loadFeed(community); }
  async function join() {
    if (!selected) return;
    try { const payload = await call(`/api/communities/${selected.id}/join`, { method: 'POST' }); setMessage(payload.membership.status === 'pending' ? 'Request sent for administrator approval.' : 'You joined this community.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to join.'); }
  }
  async function publish() {
    if (!selected || !body.trim()) return;
    try {
      const payload = await call('/api/posts', { method: 'POST', body: JSON.stringify({ communityId: selected.id, body: body.trim() }) });
      const post = payload.post as Post;
      if (mediaFile) {
        if (mediaFile.size > 10 * 1024 * 1024) throw new Error('Images must be 10 MB or smaller.');
        const mediaPayload = await call(`/api/posts/${post.id}/media`, { method: 'POST', body: JSON.stringify({ fileName: mediaFile.name, mimeType: mediaFile.type }) });
        const upload = mediaPayload.upload as { path: string; token: string };
        const uploadResult = await supabase?.storage.from('community-media').uploadToSignedUrl(upload.path, upload.token, mediaFile);
        if (uploadResult?.error) throw uploadResult.error;
      }
      setPosts((current) => [post, ...current]); setBody(''); setMediaFile(null); setMessage('Post published.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to publish.'); }
  }
  async function interact(postId: string, action: 'like' | 'unlike' | 'save' | 'unsave') {
    try {
      await call(`/api/posts/${postId}/interactions`, { method: 'POST', body: JSON.stringify({ action }) });
      setLiked((current) => { const next = new Set(current); if (action === 'like') next.add(postId); if (action === 'unlike') next.delete(postId); return next; });
      setSaved((current) => { const next = new Set(current); if (action === 'save') next.add(postId); if (action === 'unsave') next.delete(postId); return next; });
    }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Sign in to interact with posts.'); }
  }
  async function toggleComments(postId: string) {
    const next = new Set(expandedComments); if (next.has(postId)) { next.delete(postId); setExpandedComments(next); return; }
    try { const payload = await call(`/api/posts/${postId}/comments?${sessionUserId ? '' : 'public=true'}`, undefined, Boolean(sessionUserId)); setComments((current) => ({ ...current, [postId]: payload.comments ?? [] })); next.add(postId); setExpandedComments(next); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load comments.'); }
  }
  async function addComment(postId: string, parentId?: string) {
    const value = commentBody[postId]?.trim(); if (!value) return;
    try { const payload = await call(`/api/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ body: value, parentId }) }); setComments((current) => ({ ...current, [postId]: [...(current[postId] ?? []), payload.comment] })); setCommentBody((current) => ({ ...current, [postId]: '' })); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to comment.'); }
  }
  async function editPost(postId: string) { try { const payload = await call(`/api/posts/${postId}`, { method: 'PATCH', body: JSON.stringify({ body: editBody }) }); setPosts((current) => current.map((post) => post.id === postId ? payload.post : post)); setEditingPost(null); setMessage('Post updated.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to edit post.'); } }
  async function deletePost(postId: string) { if (!window.confirm('Delete this post?')) return; try { await call(`/api/posts/${postId}`, { method: 'DELETE' }); setPosts((current) => current.filter((post) => post.id !== postId)); setMessage('Post deleted.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to delete post.'); } }
  async function reportPost(postId: string) { try { await call('/api/reports', { method: 'POST', body: JSON.stringify({ postId, reason: 'other', details: 'Reported from community feed.' }) }); setMessage('Report submitted for review.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Sign in to report content.'); } }
  async function blockUser(userId: string) { try { await call('/api/blocks', { method: 'POST', body: JSON.stringify({ userId }) }); setPosts((current) => current.filter((post) => post.author_id !== userId)); setMessage('User blocked.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to block user.'); } }

  useEffect(() => {
    void loadCommunities();
    void supabase?.auth.getSession().then(({ data }) => setSessionUserId(data.session?.user.id ?? null));
    const listener = supabase?.auth.onAuthStateChange((_event, session) => setSessionUserId(session?.user.id ?? null));
    return () => listener?.data.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (selected) void loadFeed(selected); }, [sessionUserId]);

  return <main className="community-page"><header className="community-header"><div><p className="eyebrow">COMMUNITYHUB / SOCIAL</p><h1>Find your people</h1><p className="muted">Browse public communities. Sign in to join, post, comment, or moderate.</p></div><a className="secondary-action" href="/">Back to home</a></header><div className="community-layout"><aside className="community-list"><div className="search-row"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void loadCommunities(query); }} placeholder="Search communities" /><button onClick={() => void loadCommunities(query)}>Search</button></div>{loading ? <p className="muted">Loading communities…</p> : communities.length ? communities.map((community) => <button className={`community-item ${selected?.id === community.id ? 'selected' : ''}`} key={community.id} onClick={() => void selectCommunity(community)}><span className="community-type">{community.community_type}</span><strong>{community.name}</strong><small>{community.visibility === 'private' ? 'Private · request to join' : 'Public · open to join'}</small></button>) : <div className="empty-state"><strong>No communities found</strong><p>Try a different search.</p></div>}</aside><section className="feed-panel">{selected ? <><div className="feed-heading"><div><p className="eyebrow">{selected.visibility.toUpperCase()} COMMUNITY</p><h2>{selected.name}</h2><p className="muted">{selected.description}</p></div><button className="primary-action" onClick={() => void join()}>{sessionUserId ? 'Join community' : 'Sign in to join'}</button></div>{sessionUserId ? <div className="composer"><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Share something useful with this community…" /><div className="composer-actions"><label className="secondary-action">Add image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)} /></label><span className="muted">{mediaFile?.name ?? ''}</span><button className="primary-action" onClick={() => void publish()}>Publish post</button></div></div> : <div className="sign-in-prompt"><strong>Join the conversation</strong><p>Sign in to publish posts, comment, like, save, report, and block.</p><a className="primary-action" href="/login">Sign in</a></div>}{posts.length ? posts.map((post) => <article className="post-card" key={post.id}><div className="post-meta"><span>{post.is_announcement ? '📣 Announcement' : 'Community post'}</span><span>{new Date(post.created_at).toLocaleString()}</span></div>{editingPost === post.id ? <><textarea value={editBody} onChange={(event) => setEditBody(event.target.value)} /><div className="composer-actions"><button className="primary-action" onClick={() => void editPost(post.id)}>Save edit</button><button className="secondary-action" onClick={() => setEditingPost(null)}>Cancel</button></div></> : <p>{post.body}</p>}<div className="post-actions"><button onClick={() => void interact(post.id, liked.has(post.id) ? 'unlike' : 'like')}>{liked.has(post.id) ? '♥ Liked' : '♡ Like'}</button><button onClick={() => void interact(post.id, saved.has(post.id) ? 'unsave' : 'save')}>{saved.has(post.id) ? '★ Saved' : '☆ Save'}</button><button onClick={() => void toggleComments(post.id)}>Comments</button>{sessionUserId && post.author_id === sessionUserId && editingPost !== post.id && <><button onClick={() => { setEditingPost(post.id); setEditBody(post.body); }}>Edit</button><button onClick={() => void deletePost(post.id)}>Delete</button></>}<button onClick={() => void reportPost(post.id)}>Report</button>{sessionUserId && post.author_id !== sessionUserId && <button onClick={() => void blockUser(post.author_id)}>Block author</button>}</div>{expandedComments.has(post.id) && <div className="comments"><div className="comment-list">{(comments[post.id] ?? []).map((comment) => <div className="comment" key={comment.id}><strong>{comment.author_id === sessionUserId ? 'You' : 'Member'}</strong><p>{comment.body}</p>{comment.parent_id && <small>Reply</small>}</div>)}</div>{sessionUserId && <div className="comment-form"><input value={commentBody[post.id] ?? ''} onChange={(event) => setCommentBody((current) => ({ ...current, [post.id]: event.target.value }))} placeholder="Write a comment or reply…" /><button onClick={() => void addComment(post.id)}>Comment</button></div>}</div>}</article>) : <div className="empty-state"><strong>No posts yet</strong><p>Be the first to share something helpful.</p></div>}{nextCursor && <button className="secondary-action load-more" onClick={() => void loadFeed(selected, nextCursor)}>Load more</button>}</> : <div className="empty-state large"><span className="empty-symbol">◌</span><strong>Select a community</strong><p>Public posts are visible without signing in; private content is protected by membership.</p></div>}{message && <p className="status">{message}</p>}</section></div></main>;
}
