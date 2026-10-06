/** Deliberately no event properties: form values and record IDs must stay local. */
export const ANALYTICS_EVENTS = ['place_selected', 'spending_explored', 'source_opened', 'tax_used', 'rti_opened', 'grievance_opened', 'data_concern_opened'] as const;
export type AnalyticsEvent = typeof ANALYTICS_EVENTS[number];
export type AnalyticsConfig = {scriptUrl: string; websiteId: string; hostname: string; basePath: string};
export const analyticsConfig: AnalyticsConfig = {
 scriptUrl: process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL ?? '',
 websiteId: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ?? '',
 hostname: process.env.NEXT_PUBLIC_ANALYTICS_HOSTNAME ?? '',
 basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',
};
const routes = new Set(['/', '/explore', '/my-tax', '/projects', '/contracts', '/contractors', '/schemes', '/signals', '/ask', '/sources', '/about']);
export function analyticsAllowed(config: AnalyticsConfig, hostname: string, production: boolean, doNotTrack?: string | null, globalPrivacyControl?: boolean) {
 if (!production || doNotTrack === '1' || globalPrivacyControl || !config.hostname || hostname !== config.hostname) return false;
 if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || !hostname.includes('.') || /^[\d.]+$/.test(hostname)) return false;
 if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(config.websiteId)) return false;
 try { const url = new URL(config.scriptUrl); return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash; } catch { return false; }
}
export function analyticsPayload(config: AnalyticsConfig, pathname: string, event?: AnalyticsEvent) {
 // Keep only known page names; even a manually supplied private path cannot leave the app.
 let path = pathname.split(/[?#]/)[0];
 const base = config.basePath.replace(/\/$/, '');
 if (base && (path === base || path.startsWith(base + '/'))) path = path.slice(base.length);
 path = path.replace(/\/+$/, '') || '/';
 if (!routes.has(path) || (event !== undefined && !(ANALYTICS_EVENTS as readonly string[]).includes(event))) return null;
 return {website: config.websiteId, hostname: config.hostname, url: base + (path === '/' ? '/' : path), title: 'PAISA', ...(event ? {name: event} : {})};
}
declare global {
 interface Window {umami?: {track: (payload: object) => unknown};}
}
export function trackingAllowed() {
 return typeof window !== 'undefined' && analyticsAllowed(analyticsConfig, window.location.hostname, process.env.NODE_ENV === 'production', navigator.doNotTrack, (navigator as Navigator & {globalPrivacyControl?: boolean}).globalPrivacyControl);
}
let lastPage = '';
const eventsOnPage = new Set<AnalyticsEvent>();
function send(event?: AnalyticsEvent) {
 if (!trackingAllowed() || !window.umami) return;
 const payload = analyticsPayload(analyticsConfig, window.location.pathname, event);
 if (!payload) return;
 if (lastPage !== payload.url) {lastPage = payload.url; eventsOnPage.clear();}
 try {
  const result = window.umami.track(payload);
  // Analytics failures must never affect browsing or produce unhandled rejections.
  if (result instanceof Promise) void result.catch(() => {});
 } catch {}
}
let lastViewedPage = '';
export function trackPageView() {
 if (!trackingAllowed() || !window.umami) return;
 const payload = analyticsPayload(analyticsConfig, window.location.pathname);
 if (!payload || payload.url === lastViewedPage) return;
 lastViewedPage = payload.url;
 send();
}
/** One event of each kind per page visit, rather than a count of every keystroke. */
export function trackUsage(event: AnalyticsEvent) {
 if (!trackingAllowed() || !window.umami) return;
 const payload = analyticsPayload(analyticsConfig, window.location.pathname, event);
 if (!payload) return;
 if (lastPage !== payload.url) {lastPage = payload.url; eventsOnPage.clear();}
 if (eventsOnPage.has(event)) return;
 eventsOnPage.add(event);
 send(event);
}
