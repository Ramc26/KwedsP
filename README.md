# Kamesh & Prasanna — Sri Rama Kalyana Vaibhavam

Digital Telugu Hindu wedding invitation for **Veera Venkata Sathya Kameshwara Rao (Kamesh)** & **Lakshmi Prasanna (Prasanna)**.  
Static site: HTML, Bootstrap 5, jQuery, custom CSS/JS. Content driven by `data.json` (embedded as `data.js` for `file://` and production).

**Live:** [https://kwedsp.vercel.app](https://kwedsp.vercel.app)  
**Custom domain (when configured):** update `siteUrl` in `data.json`.

---

## Quick start

```bash
cd KwedsP
python3 -m http.server 8765
# Open http://127.0.0.1:8765
```

After editing `data.json`:

```bash
python3 -c "
import json
with open('data.json') as f: d=json.load(f)
with open('data.js','w') as f:
    f.write('window.WEDDING_DATA = ')
    json.dump(d,f,ensure_ascii=False,indent=2)
    f.write(';\n')
"
```

---

## Design flow (guest journey)

1. **Gate (Swagatam)** — Full-screen maroon welcome; guest taps **Enter Invitation**. Body scroll unlocks; background audio starts **muted** (floating mute toggle).
2. **Blessings intro** — Hero photo reveals under a **blurred veil** (not a blank screen). Three Telugu blessing lines appear **one by one** in the center, then **fly** to the sticky top bar (left / center / right). Stage fades; hero content animates in.
3. **Main scroll** — Sticky nav, sections with scroll-driven motion, sticky footer credit.
4. **Exit** — Contact / WhatsApp; Save the Date opens Google Calendar.

---

## Page sections

| Section | ID | Content source | Notes |
|--------|-----|----------------|--------|
| Gate | `#gate` | `welcome.*` | Fixed overlay until opened |
| Blessings stage | `#blessingsStage` | `blessings[]` (also hardcoded Telugu in HTML) | Center stack → fly to bar |
| Blessings bar | `#blessingsBar` | Slots filled after fly animation | Sticky top; `body.has-blessings` padding |
| Nav | `#siteNav` | `navigation.*` | Hides on scroll down; solid on scroll |
| Hero | `#hero` | `brand`, names, date, countdown, calendar | Icon wheel between names |
| Couple | `#couple` | `groom.*`, `bride.*`, images | Framed cards; bride row mirrored on desktop |
| When & Where | `#when` | `celebrations`, `timeline`, venues | Event cards + venue cards + maps |
| Gallery | `#gallery` | `images.gallery` | Bootstrap carousel |
| Family | `#family` | `familyInvites`, `invitation.*` | Parent cards + gratitude |
| Contact | `#contact` | `contacts.*` | Phone + WhatsApp |
| Footer | `.site-footer` | Static + `data-field` optional | Sticky; RamBikkina credit |

---

## Animation & motion

### Gate

- Panel: `riseIn` keyframe on load.
- On open: `.gate.is-open` — fade, scale, remove pointer events; `body.is-locked` removed.

### Blessings (timing in `playIntro()`)

- Hero: `.is-revealed` + `.is-backdrop` (photo visible, hero text hidden).
- Lines: `.bless-fly.is-in` stagger (~520ms apart).
- Fly to bar: `.bless-fly-clone` fixed element animates position/size (~720ms); originals `.is-sent`.
- Then `playHeroSequence()` runs.

### Hero sequence (`playHeroSequence()`)

| Order | Element | Class / behavior |
|-------|---------|------------------|
| 1 | Brand | `.hero-anim.is-in` |
| 2 | Groom name | `.hero-anim.is-in` |
| 3 | Icon wheel | `#iconWheel.is-in`; `buildIconWheel()` |
| 4 | Bride name | `.hero-anim.is-in` |
| 5 | Meta, countdown, Save the Date | `.is-in`; `startIconCycle()` |
| Glitter | `#heroGlitter` | Particles while sequence runs |

**Hero icon wheel:** Seven ritual icons; **3D spin** right-to-left (`iconSpinOut` / `iconSpinIn`); one face visible at a time.

**Countdown:** `startCountdown(datetime)` — updates every second until muhurtham.

### Scroll: `.reveal`

- `IntersectionObserver` toggles `.is-visible` / `.is-away`.
- Enter: opacity + translateY + slight scale.
- Leave: softer fade (no blur).

### Scroll: `.section-focus` + `.focus-animate`

- Sections (except `#hero`) get `.is-inview` / `.is-outview`.
- **Section headings** (`.focus-animate` on `.section-head`, timeline title, venue panel title): stagger via `--focus-i` from `stampFocusOrder()`.
- **Cards** use `.reveal` only (venue cards, events, couple, gallery, etc.).

### Nav

- Scroll > 40px: `.is-solid`.
- Scroll down past 220px: `.is-hidden`.

### Reduced motion

- `@media (prefers-reduced-motion: reduce)` disables most transitions/animations.

---

## Visual theme 

- **Palette:** Maroon, turmeric/saffron, warm beige/cream (`style.css` `:root`).
- **Fonts:** Ewert (hero names), Fleur De Leah (display headings), Cal Sans (UI buttons/kickers), Figtree (body), Anek Telugu (Telugu copy), Fraunces (some headings).
- **Layout:** Mobile-first; couple and venue grids expand at `768px` / `900px`.

---

## Data & assets

- **`data.json`** — Single source of truth; regenerate **`data.js`** after edits.
- **`meta.*`** — Tab title (`K♥P`), OG headline, tagline, `shareImage` (`og-preview.jpg` for WhatsApp/social).
- **`images/`** — Hero, couple, gallery, family.
- **`hero-icons/web/`** — Seven cropped PNGs for the hero wheel.
- **`og-preview.jpg`** — Compressed share image (~246KB); **`preview.png`** — full-resolution art.

---

## Deploy (Vercel)

1. Push repo; import project on Vercel.
2. **Build command:** none (static).
3. **Output:** project root (`index.html` at root).
4. Set **`siteUrl`** in `data.json` to your production URL and redeploy so `applyMeta()` matches.
5. **`vercel.json`** — Cache headers for images; **`robots.txt`** + **`sitemap.xml`**.

WhatsApp link previews use static `<meta property="og:image">` in `index.html` (crawlers do not run JS). Re-scrape after deploy if the image does not update.

---

## File map

| File | Role |
|------|------|
| `index.html` | Structure, gate, sections, meta tags |
| `style.css` | Theme, layout, animations |
| `script.js` | Data bind, intro, hero, observers, countdown, calendar |
| `data.json` / `data.js` | Content |
| `vercel.json` | Headers |
| `favicon.svg` | Tab icon |

---

## Invite links (private codes)

Guessable `wedding` / `reception` URLs are disabled. Share these **codes** only with the right guests:

| Guests | Link |
|--------|------|
| Marriage + Reception | `https://kwedsp.vercel.app/i/w7k2m9` or `?c=w7k2m9` |
| Reception only | `https://kwedsp.vercel.app/i/e4p8n1` or `?c=e4p8n1` |

No code / wrong code → gate stays locked (“Invite link required”).

Change codes anytime in `data.json` → `inviteModes.codes` (and match paths in `vercel.json`).

---

## Petal shower

See **`interactive.js`** and **`interactive.css`**.

After the hero appears: a heavier red rose petal burst, then a continuous drizzle (~8–15 petals on screen).

---

## Maintainer

Designed and developed by [RamBikkina](https://rambuilds.in).
