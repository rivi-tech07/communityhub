export const MAX_PAGE_SIZE = 50;
export const DEFAULT_PAGE_SIZE = 20;

export type PageParams = {
  limit: number;
  cursor: string | null;
  query: string;
};

export function pageParams(url: string): PageParams | { error: string } {
  const params = new URL(url).searchParams;
  const rawLimit = params.get('limit');
  const requested = rawLimit === null ? DEFAULT_PAGE_SIZE : Number(rawLimit);
  if (!Number.isInteger(requested) || requested < 1 || requested > MAX_PAGE_SIZE) {
    return {
      error: `limit must be an integer between 1 and ${MAX_PAGE_SIZE}.`,
    };
  }
  return {
    limit: requested,
    cursor: params.get('cursor'),
    query: params.get('q')?.trim() ?? '',
  };
}

export function paginationError(params: PageParams | { error: string }) {
  return 'error' in params
    ? Response.json({ error: params.error, code: 'PAGINATION_LIMIT_EXCEEDED' }, { status: 400 })
    : null;
}
