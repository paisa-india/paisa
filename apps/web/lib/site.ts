/** The public site root (with any GitHub Pages subpath), for canonical links, sitemaps and structured data. */
export const SITE_URL=(process.env.NEXT_PUBLIC_SITE_URL||'https://paisa-india.github.io/paisa').replace(/\/+$/,'');
/** Absolute URL for a site path such as "/places/" (paths end with "/", matching the static export). */
export const absolute=(p:string)=>SITE_URL+(p.startsWith('/')?p:`/${p}`);
/** A plain link target inside the site (with the GitHub Pages subpath). Place pages use plain links, not client navigation. */
export const href=(p:string)=>(process.env.NEXT_PUBLIC_BASE_PATH??'')+p;
