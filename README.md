# Project Free Lance (completed)
## for D3 Glow Spa

# D3 Glow Spa — Bilingual Web Base

A static, responsive, and bilingual website for D3 Glow Spa, a nail, beauty, and wellness business serving a local audience in the United States. It is prepared for deployment on Vercel without a backend, using semantic HTML, modern CSS, and vanilla JavaScript with Vite.

## Current Status

- Independent routes in Spanish and English: `/es/` and `/en/`, with privacy pages at `/es/privacidad.html` and `/en/privacy.html`.
- Complete source inventory: **87 options**, **61 grouped services**, and **9 categories**. The website temporarily publishes **83 options / 57 services** while "Full Face" is being resolved.
- Prices preserved from the Excel file and displayed in USD with two decimal places.
- Safe search engine, category filters, and expandable cards.
- Ten client-approved editorial photographs and the D3 Glow Spa logo, published as optimized PNGs.
- Search-engine and AI-discovery support through semantic HTML, bilingual metadata, Schema.org structured data, `robots.txt`, `llms.txt`, and an automatically generated sitemap once the production domain is configured.
- Responsive design from 320px, keyboard navigation, and reduced motion support.
- White backgrounds across the language gateway, content sections, catalog, contact panel, navigation, and footer.
- Security headers for Vercel and an insecure pattern scanner.
- No forms, first-party cookies, proprietary APIs, secrets, or direct personal data capture; includes Vercel Web Analytics.
- The business WhatsApp number is confirmed and enables the general and service-specific booking links.


## Run Locally

Requires Node.js 20.19 or later.

```powershell
npm.cmd install
npm.cmd run dev
```

Full validation:

```powershell
npm.cmd run check
```

Responsive validation with Microsoft Edge installed:

```powershell
npm.cmd run check:browser
```

This command starts an isolated Vite preview, opens both languages in headless Edge at 320 px, 390 px, and 1440 px, and verifies that the header stays inside the viewport, the transparent logo loads, its text fallback is not duplicated, and no horizontal overflow is introduced. It closes the temporary browser profile and preview automatically.

The browser retains its default sandbox. Only if a controlled test container prevents it from starting can it be run temporarily with `$env:BROWSER_NO_SANDBOX="1"`; this option should not be used for everyday browsing or with untrusted content.

## Vercel Web Analytics

`@vercel/analytics` is installed locally as a production dependency. Since this project uses Vite with vanilla JavaScript —not Next.js or React— the correct integration is in `src/analytics.js`:

```js
import { inject } from "@vercel/analytics";

inject();
```

The `@vercel/analytics/next` entry is not used because it exports a React component and requires Next.js 13 or later. Analytics is loaded on `/es/` and `/en/`, but not on the `/` redirection page, avoiding counting two pages for a single visit. To receive actual visits, you must still enable **Web Analytics** in the Vercel project dashboard and redeploy.

Production build:

```powershell
npm.cmd run build
```

Vercel must use the Vite preset; the output is generated in `dist/`. The configuration is already declared in `vercel.json`.

## Where to Update Information

- Business data, hours, confirmed WhatsApp number, and booking rules: `src/config/site.js`.
- Production domain and exact U.S. location: `src/config/site.js` (`siteUrl` and `location`). Keep unknown fields as `null`; never publish approximate coordinates.
- General ES/EN texts: `src/data/ui-content.js` and the HTML for each language.
- Services and prices: `src/data/services.js`.
- Palette and design: `src/styles.css`.
- Protected copies of the client-approved images: `assets/masters/client/`.
- Deployable PNG images: `public/images/`.
- Prompts and visual review: `docs/image-prompts.md`.

### Public Image Routes

Vite copies the contents of `public/` directly to the root of the site. That is why a file saved as `public/images/facial.png` is used in HTML as `/images/facial.png`; **the URL must not contain `/public/`**.

| Local File | URL on Web |
| --- | --- |
| `public/images/hero-facial.png` | `/images/hero-facial.png` |
| `public/images/facial.png` | `/images/facial.png` |
| `public/images/anti-aging-facial.png` | `/images/anti-aging-facial.png` |
| `public/images/acne-facial.png` | `/images/acne-facial.png` |
| `public/images/exfoliation.png` | `/images/exfoliation.png` |
| `public/images/depilation.png` | `/images/depilation.png` |
| `public/images/nails.png` | `/images/nails.png` |
| `public/images/toenails.png` | `/images/toenails.png` |
| `public/images/body-care.png` | `/images/body-care.png` |
| `public/images/accessible-home-care.png` | `/images/accessible-home-care.png` |
| `public/images/Logos/logo-d3-glow-spa.png` | `/images/Logos/logo-d3-glow-spa.png` |

`npm.cmd run images:build` first verifies that every published base image is byte-for-byte identical to its protected copy in `assets/masters/client/`. It then generates only smaller responsive PNG derivatives: `hero-facial-540.png` and `hero-facial-810.png`, `-480.png`/`-800.png` variants for the other photographs, and transparent 320/640/1280 px logo variants. It never rewrites or deletes the client-approved base photographs or logo. The ES/EN HTML files use `srcset` and `sizes` so the browser downloads an appropriate size while preserving the same subject and placement.

The current photographs were supplied or explicitly approved by the client. Their filenames and placements are contractual project data: `depilation.png` remains in the Depilación/Hair Removal featured card, the other featured photographs remain with their respective services, `nails.png` and `toenails.png` remain in the gallery, and `accessible-home-care.png` remains in the reduced-mobility section.

The confirmed WhatsApp number is stored in `src/config/site.js` using only digits and its country code, without `+`, spaces, or hyphens. The general CTAs and those for each service use it to create public booking links automatically. No WhatsApp key or environment variable is needed.

The transparent web-ready logo is integrated from `/images/Logos/logo-d3-glow-spa-640.png`. Its 2067×761 master is stored at `assets/masters/client/logo-d3-glow-spa.png`; the image build validates its dimensions, alpha channel, and public copy before creating 320 px, 640 px, and 1280 px variants. It also derives 32 px, 180 px, and 512 px transparent favicons from the original D3 monogram without redrawing it.

## Domain, Local SEO, and AI Discovery

The production origin and authorized city-level location are centralized in `src/config/site.js`:

```js
siteUrl: "https://d3glowspa.com",
location: {
  streetAddress: null,
  addressLocality: "Orange Park",
  addressRegion: "FL",
  postalCode: null,
  addressCountry: "US",
  serviceAreas: [
    { addressLocality: "Orange Park", addressRegion: "FL" },
    { addressLocality: "Jacksonville", addressRegion: "FL" },
  ],
  latitude: null,
  longitude: null,
},
```

The business is mobile-only and has authorized Orange Park and Jacksonville, Florida, as its public service areas. It does not receive customers at a storefront. Keep the private street address, ZIP code, and coordinates as `null`; never publish approximate or private location data. `npm.cmd run build` injects canonical and `hreflang` links, Open Graph/Twitter URLs, `DaySpa` and `BeautySalon` structured data with both cities in `areaServed`, and generates `public/sitemap.xml` for `https://d3glowspa.com`.

`public/robots.txt` permits normal search crawlers plus the current search/retrieval crawlers used by OpenAI, Anthropic, and Perplexity. Training-only crawlers are blocked independently; Google Search and its AI search features remain accessible through Googlebot. `public/llms.txt` gives compatible AI systems a concise map of the bilingual public pages and identifies Orange Park and Jacksonville as mobile service areas.

### Vercel and search launch checklist

1. Add `d3glowspa.com` and `www.d3glowspa.com` to the Vercel project.
2. Make `d3glowspa.com` the primary domain and configure `www` as a permanent redirect to the apex domain.
3. Apply the exact DNS records shown by Vercel and verify HTTPS before announcing the site.
4. Verify the domain property in Google Search Console and submit `https://d3glowspa.com/sitemap.xml`.
5. Create or claim one service-area Google Business Profile using the same business name, phone, and opening hours published on the website. Hide the private address and add Orange Park and Jacksonville as the service areas.

## Approved Palette

| Role | Color |
| --- | --- |
| Primary Background | `#FFFFFF` |
| Deep Forest | `#0D2F26` |
| Leaf Green | `#2F5D50` |
| Soft Sage | `#A7B9A8` |
| Champagne Gold | `#C5A45D` |
| Accessible Gold Text | `#8A6824` |
| Warm Ivory | `#F7F2E7` |
| Ink | `#1B211D` |

All structural surfaces use white. Deep forest and ink provide readable text, while leaf green and champagne gold remain accents for navigation, controls, and calls to action. Dark gradients are retained only over photographs to keep their captions legible. The main reading combinations exceed WCAG AA.

## Security and Privacy

- The catalog is rendered with `textContent`, `createElement`, and `replaceChildren`; HTML generated from data is not used.
- Searches do not create regular expressions and are limited to 80 characters.
- Language and categories use allowlists.
- WhatsApp links are only built with a validated fixed number and existing catalog data.
- The CSP policy blocks inline scripts, `eval`, iframes, objects, and external origins.
- Fonts and images are served from the same domain.
- The Excel file, secrets, and Vercel local states are excluded.
- Vercel Analytics loads from same-deployment routes (`/_vercel/insights/`) allowed by the CSP; it will not be operational until enabled in Vercel.

For future changes, always run `npm.cmd run check` before deploying.
