# PAISA visual identity

PAISA uses a rupee symbol and a small dot inside a rounded green square. The lowercase wordmark and green/cream palette carry the identity across the website, repository and link previews. It is an independent public-interest identity, not a government seal.

## Files

All assets live in [`apps/web/public/brand`](../apps/web/public/brand):

| Asset | Use |
|---|---|
| `symbol.svg` | Small square symbol; preferred browser favicon |
| `logo.svg` | Wordmark for light backgrounds |
| `logo-light.svg` | Wordmark for dark backgrounds |
| `favicon-32.png` | Raster favicon fallback |
| `apple-touch-icon.png` | 180px Apple home-screen icon |
| `icon-192.png`, `icon-512.png` | Square exports for profiles and future app use |
| `social-card.png` | 1200 × 630 link preview and README banner |
| `social-card.svg` | Editable vector source of the sharing artwork |

The tile motif in the sharing card is decorative; its colours are not financial percentages. Product screenshots show the actual application and should be refreshed when the design or data changes.

## Usage

- Keep the symbol square. Leave clear space of at least one quarter of its height around standalone marks.
- Use the light wordmark on dark backgrounds. Avoid extra gradients, shadows or rotating the logo.
- Main green: `#285B4B`; ink: `#25392F`; cream: `#F8F9F3`; accent: `#ACCCAA`.
- Keep the website's existing Manrope and DM Sans typography. Standalone SVG wordmarks use a portable bold sans-serif fallback.
- The project licence applies to these project-authored assets. Reuse must not imply government affiliation or PAISA endorsement.

Run `node scripts/build-brand.mjs` after `npm ci` to rebuild the SVG and PNG exports using the Sharp dependency installed with Next.js. No external images are fetched.

## Hosting and sharing

The icon URLs respect `NEXT_PUBLIC_BASE_PATH`. The sharing image defaults to the public site in the README. For a new domain or repository path, set GitHub Actions repository variable `SITE_URL` (or `NEXT_PUBLIC_SITE_URL` on another host) to the full public site root, including any subpath, then rebuild.

The README banner is committed. GitHub's separate repository social-preview setting must be uploaded manually by a maintainer using `social-card.png`. Existing social platforms may cache link previews after deployment.
