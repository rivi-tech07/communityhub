'use client';

import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

export default function AdminRolesPage() {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('moderator');
  const [message, setMessage] = useState('');

  async function changeRole() {
    if (!supabase) return setMessage('Authentication is not configured.');
    const { data } = await supabase.auth.getSession();
    if (!data.session) return setMessage('Administrator sign-in is required.');
    const response = await fetch('/api/admin/roles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({ userId, role }),
    });
    const body = await response.json().catch(() => ({}));
    setMessage(
      response.status === 401 && body.code === 'reauthenticate'
        ? 'Reauthenticate before changing roles.'
        : response.ok
          ? 'Role updated.'
          : (body.error ?? 'Role update failed.'),
    );
  }

  return (
    <main className="admin-users-page">
      <a className="back-link" href="/admin/businesses">
        ‹ Admin overview
      </a>
      <header className="directory-header">
        <div>
          <p className="eyebrow">ADMIN / ACCESS</p>
          <h1>Change a user role</h1>
          <p className="muted">
            Role changes require a recently authenticated administrator session.
          </p>
        </div>
      </header>
      <section className="admin-panel admin-user-form">
        <label htmlFor="role-user-id">User ID</label>
        <input
          id="role-user-id"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
        />
        <label htmlFor="role-name">Role</label>
        <select id="role-name" value={role} onChange={(event) => setRole(event.target.value)}>
          <option value="moderator">Moderator</option>
          <option value="administrator">Administrator</option>
          <option value="user">User</option>
        </select>
        <button className="primary-action" type="button" onClick={() => void changeRole()}>
          Save role
        </button>
        {message && <p className="status">{message}</p>}
      </section>
    </main>
  );
}
