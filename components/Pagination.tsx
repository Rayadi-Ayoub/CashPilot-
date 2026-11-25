import Link from "next/link";
import { buildQuery } from "@/lib/filters";

export function Pagination({ base, page, total, pageSize, params }: { base: string; page: number; total: number; pageSize: number; params: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 ? <Link className="button button-secondary button-small" href={buildQuery(base, { ...params, page: page - 1 })}>← Previous</Link> : <span />}
      <span className="muted">Page {page} of {pages}</span>
      {page < pages ? <Link className="button button-secondary button-small" href={buildQuery(base, { ...params, page: page + 1 })}>Next →</Link> : <span />}
    </nav>
  );
}
