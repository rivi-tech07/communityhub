import { type NextRequest } from 'next/server';
import { updateSession } from './utils/supabase/middleware';

export function middleware(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  request.headers.set('x-request-id', requestId);
  return updateSession(request).then((response) => {
    response.headers.set('x-request-id', requestId);
    return response;
  });
}

export const runtime = 'nodejs';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
