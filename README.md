# Comfort & Glow SPA — Bilingual Web Base

A static, responsive, and bilingual website for a nail, beauty, and wellness business in the United States. It is prepared for deployment on Vercel without a backend, using semantic HTML, modern CSS, and vanilla JavaScript with Vite.

## Current Status

- Independent routes in Spanish and English: `/es/` and `/en/`.
- Complete source inventory: **87 options**, **61 grouped services**, and **9 categories**. The website temporarily publishes **83 options / 57 services** while "Full Face" is being resolved.
- Prices preserved from the Excel file and displayed in USD with two decimal places.
- Safe search engine, category filters, and expandable cards.
- Ten client-approved editorial photographs and a transparent logo, published as PNGs without altering their content or placement.
- Responsive design from 320px, keyboard navigation, and reduced motion support.
- Security headers for Vercel and an insecure pattern scanner.
- No forms, first-party cookies, proprietary APIs, secrets, or direct personal data capture; includes Vercel Web Analytics.

The reviewed source file was `Menu_Servicios_Precios_Descripciones-1.xlsx` with SHA-256 `CECB61F55D8BB2023616309C92B7F9E6034E8928E90F2E417591460556EEC25A`. The Excel file **is not copied or published** with the web.

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

Optional visual validation with Edge, Chrome, or Chromium installed (with `npm.cmd run preview` active in another terminal):

```powershell
npm.cmd run check:browser
```

This test opens the web in headless mode at 1440 × 1100 and 390 × 844, checks both languages, the 57 published cards, featured items, filters, search, URL parameter preservation, mobile menu accessibility, booking CTAs, images, JavaScript errors, and horizontal overflow. The screenshots are saved in `artifacts/screenshots/`, a folder ignored by Git.

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

- Business data, hours, WhatsApp, and booking rules: `src/config/site.js`.
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
| `public/images/Logos/logo-comfort-glow-spa.png` | `/images/Logos/logo-comfort-glow-spa.png` |

`npm.cmd run images:build` first verifies that every published base image is byte-for-byte identical to its protected copy in `assets/masters/client/`. It then generates only smaller responsive PNG derivatives: `hero-facial-540.png` and `hero-facial-810.png`, plus `-480.png`/`-800.png` variants for the other photographs. It never rewrites or deletes the client-approved base photographs or logo. The ES/EN HTML files use `srcset` and `sizes` so the browser downloads an appropriate size while preserving the same subject and placement.

The current photographs were supplied or explicitly approved by the client. Their filenames and placements are contractual project data: `depilation.png` remains in the Depilación/Hair Removal featured card, the other featured photographs remain with their respective services, `nails.png` and `toenails.png` remain in the gallery, and `accessible-home-care.png` remains in the reduced-mobility section.

The WhatsApp number must be saved only with digits and country code, for example `15551234567`; it must not start with `+`. When valid, the general CTAs and those for each service will activate automatically. No WhatsApp key is needed.

The delivered transparent logo is integrated from `/images/Logos/logo-comfort-glow-spa.png`. A protected byte-identical copy is stored at `assets/masters/client/logo-comfort-glow-spa.png`; the image build validates it but does not recreate or overwrite it. The header uses an ivory background to preserve the contrast of the logo's original green.

## Approved Palette

| Role | Color |
| --- | --- |
| Deep Forest | `#0D2F26` |
| Leaf Green | `#2F5D50` |
| Soft Sage | `#A7B9A8` |
| Champagne Gold | `#C5A45D` |
| Warm Ivory | `#F7F2E7` |
| Ink | `#1B211D` |

Gold is used as an accent, not as text on ivory. The main reading combinations exceed WCAG AA.

## Security and Privacy

- The catalog is rendered with `textContent`, `createElement`, and `replaceChildren`; HTML generated from data is not used.
- Searches do not create regular expressions and are limited to 80 characters.
- Language and categories use allowlists.
- WhatsApp links are only built with a validated fixed number and existing catalog data.
- The CSP policy blocks inline scripts, `eval`, iframes, objects, and external origins.
- Fonts and images are served from the same domain.
- The Excel file, `.env` files, secrets, and Vercel local states are excluded.
- Vercel Analytics loads from same-deployment routes (`/_vercel/insights/`) allowed by the CSP; it will not be operational until enabled in Vercel.

For future changes, always run `npm.cmd run check` before deploying.
