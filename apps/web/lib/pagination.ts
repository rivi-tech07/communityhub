export function pageParams(url: string) {
  const params = new URL(url).searchParams;
  const requested = Number(params.get('limit') ?? 20);
  return { limit: Number.isFinite(requested) ? Math.min(Math.max(Math.floor(requested), 1), 50) : 20, cursor: params.get('cursor'), query: params.get('q')?.trim() ?? '' };
}
