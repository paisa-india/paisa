import type { NextConfig } from 'next';
import path from 'node:path';
// STATIC_EXPORT=1 builds a plain static site (apps/web/out) for GitHub Pages or any static host.
const staticExport = process.env.STATIC_EXPORT === '1';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;
const securityHeaders = [{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'DENY'}];
const config: NextConfig = {
  turbopack: { root: path.resolve(process.cwd(), process.cwd().endsWith('/apps/web') ? '../..' : '.') },
  poweredByHeader: false,
  ...(staticExport ? { output: 'export', trailingSlash: true, basePath } : { async headers() { return [{ source: '/:path*', headers: securityHeaders }]; } }),
};
export default config;
