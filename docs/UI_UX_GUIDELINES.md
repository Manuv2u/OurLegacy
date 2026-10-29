# UI / UX guidelines

## Identity
Premium, warm, minimal. Tokens live in `src/index.css` (`@theme`).

| Token | Value | Use |
| --- | --- | --- |
| `forest` | `#315C46` | primary actions, selection |
| `ivory` | `#F8F8F5` | page background |
| `white` | `#FFFFFF` | cards |
| `sage` | `#E7EFE8` | secondary surfaces, hover, avatars |
| `gold` / `gold-700` | `#C8A96B` / `#8A6D33` | partner connectors, story marker, highlights (use `gold-700` for text) |
| `ink` | `#202820` | text |
| `muted` | `#566259` | secondary text (≥ 4.5:1 on ivory and white) |

Typography: Inter (UI), Fraunces (headings) and Noto Sans / Serif Kannada, all **self-hosted** via Fontsource so no request leaves the app. Icons: Lucide.

## Logo
The tree emblem is the application logo. The original artwork lives in `docs/brand/` (`OurLegacy-Family-Tree-Emblem.png`, plus a trimmed transparent `logo-full.png` lockup). `public/` contains only optimised derivatives: `logo-emblem.png` (512px, landing hero), `logo-mark.png` (176px, header, footer, editor toolbar, exports), `favicon-32.png`, `favicon.ico`, `apple-touch-icon.png` and `icon-512.png`. They have transparent backgrounds so they sit on ivory or white. The wordmark in the header is live text ("Our" in forest green, "Legacy" in gold) so it stays crisp and accessible; the emblem image is decorative and the link carries the name "OurLegacy". To regenerate the derivatives from a new source image, re-run the cropping/transparency step against `docs/brand/`.

## Rules
- Rounded cards, subtle borders, restrained shadows. No heavy gradients, no rainbow relationship lines, no gender-coloured cards.
- Connectors are two tones only: sage-green for parent → child, gold for partners; adoptive links are dashed.
- The canvas is the visual focus; panels are quiet.
- Motion is short and purposeful; `prefers-reduced-motion` disables it.
- Kannada text gets extra line height so stacked vowel signs never clip.

## Responsive behaviour
| Width | Layout |
| --- | --- |
| ≥ 1024px | Full editor: toolbar, collapsible sidebar, canvas, inline profile panel, minimap |
| 768–1023px | Sidebar collapsed to an icon rail by default, profile in a right drawer |
| < 768px | Full-screen canvas, compact toolbar, floating zoom buttons, bottom action bar, actions sheet and profile bottom sheet |

No horizontal page overflow at any width (asserted in e2e tests).

## Accessibility
Semantic landmarks, skip link, labelled form controls with `aria-describedby` errors, Radix dialogs (focus trap, Escape), visible focus ring, a combobox pattern for search, `aria-pressed` cards, a live-region save indicator, keyboard navigation on the canvas (arrow keys follow relatives, fall back to nearest on-screen person so every card is reachable), and axe-core WCAG 2.1 AA checks in CI.
