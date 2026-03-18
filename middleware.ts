import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabasePublicConfig } from '@/lib/supabasePublicConfig';

export async function middleware(request: NextRequest) {
  const { url, anonKey } = getSupabasePublicConfig();

  const hasSupabaseSessionCookie = request.cookies
    .getAll()
    .some(({ name, value }) => name.startsWith('sb-') && name.includes('auth-token') && value);

  const isLoginPage = request.nextUrl.pathname === '/login';

  if (!hasSupabaseSessionCookie && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (hasSupabaseSessionCookie && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  createServerClient(
    url,
    anonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|RSP_LOGO.png).*)',
  ],
};
