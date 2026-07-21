import { NextRequest, NextResponse } from 'next/server';

/**
 * Locale yönlendirmesi: İngilizce varsayılan ve öneksizdir (/, /app),
 * Türkçe /tr altındadır. Öneksiz istekler içeride /en/*'e rewrite edilir;
 * /en/* dışarıdan gelirse öneksiz haline redirect edilir (tek canonical URL).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || '/';
    return NextResponse.redirect(url, 308);
  }

  if (pathname === '/tr' || pathname.startsWith('/tr/')) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = `/en${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // api, _next ve uzantılı statik dosyalar (sw.js, manifest, ikonlar, sitemap.xml…) hariç
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
