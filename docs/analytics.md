# Private usage analytics

Analytics is **off by default**. There is no public visitor counter. The optional integration supports Umami 2.18+ / 3.x using its [manual tracker API](https://docs.umami.is/docs/tracker-functions). Keep the dashboard private; do not enable a public share link.

## Connect a dashboard

1. Create a website in your own Umami installation or account. This repository does not create an account or purchase hosting.
2. Copy the HTTPS script URL and website ID from its tracking code.
3. In GitHub repository Settings → Secrets and variables → Actions → Variables, set:
   - `UMAMI_SCRIPT_URL`: the exact script URL, without query parameters.
   - `UMAMI_WEBSITE_ID`: the website UUID (not an API key).
   - `ANALYTICS_HOSTNAME`: the exact public hostname, e.g. `paisa-india.github.io`, without protocol or `/paisa`.
4. Run the Publish site workflow. These values are included at build time. For other hosts, use the corresponding `NEXT_PUBLIC_…` variables in `.env.example`.
5. Visit the published site, navigate between pages, and check the private dashboard. Use a browser without tracking protection only for this explicit verification; visitors' Do Not Track and Global Privacy Control settings are respected.

Unset any variable and rebuild to disable tracking. Localhost, local addresses, development builds and other hostnames are excluded. Blocked or failed analytics never blocks the website.

## What is counted

- Page views: known page paths only. Query/filter changes do not create page views.
- Usage events: `place_selected`, `spending_explored`, `source_opened`, `tax_used`, `rti_opened`, `grievance_opened`, `data_concern_opened`.
- Each action kind is counted at most once per page visit. `source_opened` means opening a money explanation/source drawer; `tax_used` means interacting with an amount control, not filing a tax return. Concern events mean opening a route, never submitting a complaint.

The integration sends only website ID, configured hostname, known page path, constant title `PAISA`, and an optional fixed event name. It does not send tax amounts, search text, city/state choices, contractor IDs, query strings, fragments, referring URLs, draft text, names or user IDs. Automatic page/click collection is disabled. No session replay is installed.

The analytics service still receives ordinary connection metadata (including IP and user agent) and applies its own processing and retention. Review the provider's configuration and policy before activation. PAISA does not store a visitor identifier in cookies or local storage. This is not a claim that network requests are anonymous.

## Reading the dashboard

Page views, sessions, and estimated unique visitors are different figures. Unique visitors are not an exact count of people. Use the provider's bot filtering where available; browser blocking, repeat devices, and unfiltered bots affect totals. Do not describe numbers as verified human visitors. Prefer monthly trends and successful feature use over a lifetime counter.
