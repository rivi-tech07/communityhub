'use client';
import { useEffect, useState } from 'react';
type Job = {
  id: string;
  title: string;
  description: string;
  job_type: string;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  sponsorship_status: string;
  application_deadline: string | null;
};
export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`/api/jobs?q=${encodeURIComponent(query)}`)
        .then((response) => response.json())
        .then((body) => setJobs(body.jobs ?? []));
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);
  return (
    <main className="directory-page">
      <header className="directory-header">
        <div>
          <p className="eyebrow">COMMUNITYHUB / JOBS</p>
          <h1>Find your next opportunity</h1>
          <p className="muted">
            Sponsorship labels show what employers have declared or what evidence has been
            independently checked.
          </p>
        </div>
        <a className="back-link" href="/">
          Dashboard
        </a>
      </header>
      <div className="directory-search">
        <input
          placeholder="Search job titles"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <section className="business-grid">
        {jobs.map((job) => (
          <article className="business-card" key={job.id}>
            <span className="business-category">{job.job_type.replace('_', ' ')}</span>
            <h2>{job.title}</h2>
            <p>{job.description}</p>
            <small>
              {job.location ?? 'Location not specified'} ·{' '}
              {job.salary_min
                ? `${job.salary_currency} ${job.salary_min}–${job.salary_max ?? ''}`
                : 'Salary not listed'}
            </small>
            <strong className="sponsorship-label">
              Sponsorship: {job.sponsorship_status.replaceAll('_', ' ')}
            </strong>
            {job.application_deadline && (
              <small>Apply by {new Date(job.application_deadline).toLocaleDateString()}</small>
            )}
          </article>
        ))}
        {jobs.length === 0 && (
          <p className="empty-state">No currently published jobs match this search.</p>
        )}
      </section>
    </main>
  );
}
