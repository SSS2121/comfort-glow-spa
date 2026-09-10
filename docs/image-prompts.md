# Client-supplied image inventory

Updated on 2026-09-09. The photographs currently displayed on the website were supplied or explicitly approved by the client. They must not be replaced, moved to another section, regenerated, or visually edited.

## Placement and protected copies

| Public image | Protected copy | Website placement |
| --- | --- | --- |
| `public/images/hero-facial.png` | `assets/masters/client/hero-facial.png` | Main hero |
| `public/images/facial.png` | `assets/masters/client/facial.png` | Deep Clean Facial featured card |
| `public/images/anti-aging-facial.png` | `assets/masters/client/anti-aging-facial.png` | Anti-Aging Facial featured card |
| `public/images/acne-facial.png` | `assets/masters/client/acne-facial.png` | Acne Control Facial featured card |
| `public/images/exfoliation.png` | `assets/masters/client/exfoliation.png` | Body Exfoliation featured card |
| `public/images/depilation.png` | `assets/masters/client/depilation.png` | Depilación / Hair Removal featured card |
| `public/images/nails.png` | `assets/masters/client/nails.png` | First gallery position |
| `public/images/toenails.png` | `assets/masters/client/toenails.png` | Second gallery position |
| `public/images/body-care.png` | `assets/masters/client/body-care.png` | Third gallery position |
| `public/images/accessible-home-care.png` | `assets/masters/client/accessible-home-care.png` | In-home service for reduced mobility |
| `public/images/Logos/logo-comfort-glow-spa.png` | `assets/masters/client/logo-comfort-glow-spa.png` | Gateway and site header |

## Build safeguards

`npm.cmd run images:build` compares every public base file with its protected copy before generating responsive derivatives. A mismatch in file contents or dimensions stops the build. The script creates only smaller PNG variants and never deletes or overwrites a client-approved base image or the logo.

The `src` value in each language always points to the original public PNG. The `srcset` values point only to resized versions of that same file, so responsive loading does not introduce a different photograph or placement.
