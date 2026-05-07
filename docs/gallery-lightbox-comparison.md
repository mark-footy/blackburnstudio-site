# Gallery & Lightbox Architectural Comparison

_A staff-engineering review of two independent gallery / lightbox systems, written to inform long-term technical strategy. No code is changed by this document._

> **Subjects under review**
>
> - **Blackburn** — `c:\dev\Azure\blackburnstudio-site` — Next.js 16 App Router, static export, single editorial portrait gallery, custom interaction layer (~600 LOC across 9 files).
> - **Vic Country** — `c:\dev\Azure\vcmasters_multiclub_starterkit` — Next.js 16 App Router, server runtime (`output: "standalone"`), multi-route gallery platform backed by Prisma / Azure SQL / SharePoint Graph / Azure Blob, with face detection (TensorFlow.js + face-api) and admin tagging.
>
> **Audience:** engineering team weighing convergence, divergence, or selective primitive extraction across the two products.

---

## Executive Summary

Two systems share a surface metaphor (a clickable image grid that opens a fullscreen viewer) and almost nothing else. They are different *products* solving different *problems*, built under different *constraints*, and the fact that both contain a "Lightbox" component is misleading.

- **Blackburn is an interaction-first editorial portfolio.** Zero data model, one production gallery, three placeholder routes. The architecture is small, dependency-free in the gesture/animation domain, and tuned to a single design surface. The work that has been done — FLIP morph, eased exponential resistance, velocity-aware navigation, strict axis lock, build-time LQIP, `useLayoutEffect`-based scroll lock that preserves position, reduced-motion fallbacks — is genuinely above industry baseline for a custom (non-library) implementation.
- **Vic Country is a data-first operational platform.** Five gallery routes, hundreds-to-thousands of photos per album, SharePoint ingestion, face detection + Chinese-Whispers clustering, person/event linking, admin tagging UI, cursor-paginated infinite scroll, deep-linking via `?photo=ID`, localStorage favourites with cross-tab sync, optional bulk-selection mode. Its interaction layer is a deliberately simple ~528 LOC `Lightbox.tsx` that pops in instantly against `bg-black/90`, with single-`touchend` swipe (40 px threshold), naive `body { overflow: hidden }` scroll lock, no preload, no LQIP, no focus trap, no reduced-motion branch.

### Should these systems ever merge?

**No.** Render mode (static export vs server runtime), image pipeline (`next/image` against committed files vs raw `<img>` against authenticated proxy routes), data model presence/absence, framework versions (React 19 + Tailwind v4 vs React 18 + Tailwind v3), and product domain (curation vs operations) are all different. Forcing convergence on any single one of these dimensions destroys an asymmetric strength of one of the two systems.

### Should there be shared infrastructure?

**Eventually yes — but not now, and not at the gallery level.** A small *interaction-primitives* package (gestures, scroll lock, focus trap, reduced motion, keyboard navigation, motion constants) is justifiable once a *third* consumer exists. With only two consumers, a shared package costs more (versioning, release coordination, lowest-common-denominator API design) than it saves. Until then: copy-with-attribution.

### What should remain separate permanently?

- The Vic Country data layer (Prisma schema, image proxies, face/cluster graph, deep-link contract, admin tagging endpoints).
- Blackburn's editorial grid layouts and the static-export image pipeline (`getImagesWithBlur` + `plaiceholder`).
- All page chrome, theming, and routing.
- The `<Lightbox>` *composition* in either system. Composition is product. Hooks are primitives.

### What should migrate first?

A six-item Phase-1 patch inside Vic Country's existing `app/gallery/(components)/Lightbox.tsx`, with no architectural change: scroll-lock that preserves position, adjacent-image preload, velocity-aware swipe with proper thresholds, backdrop fade, focus trap + restore, `useReducedMotion`. Each is small, independently shippable, and reversible. See §9.

### What should never migrate?

- Blackburn's `MorphOverlay` "as-is" into Vic Country. The morph requires three preconditions Vic Country does not currently satisfy (captured `getBoundingClientRect()` from the click site, an LQIP-or-equivalent placeholder source, a layout-stable destination viewport). Forcing it in early would feel worse than the current instant mount.
- Vic Country's data hooks (`useFavorites`, `useSelection`, `useGalleryFilters`) into Blackburn. They encode operational concerns Blackburn does not have.
- Either project's `<Lightbox>` component into the other. They have non-overlapping responsibilities.

### Concise recommendation

Treat Blackburn as an **interaction laboratory** and Vic Country as a **production gallery platform**. Migrate *techniques and primitives* (hooks, constants, CSS transitions, tuning values) — never *components* (Lightbox, Gallery, Grid). Stage the work: Phase 1 (behaviour parity wins inside the existing Vic Country Lightbox), Phase 2 (decompose Vic Country's Lightbox into the same shape Blackburn uses), Phase 3 (extract a small primitives package only when a third consumer exists), Phase 4 (advanced motion, gated on Phase 2 and on a preferred animation strategy — likely View Transitions API rather than re-implementing the morph). Resist any pressure to build a shared `<Gallery>` package; the gallery is the product.

### Recommended direction (bullet list)

- Do not merge the systems.
- Do not build a shared `<Lightbox>` or `<Gallery>` component.
- Do migrate six concrete behaviours into Vic Country's existing Lightbox under Phase 1.
- Do extract Vic Country's `Lightbox.tsx` into the Blackburn-style shape under Phase 2 — but only when a new lightbox-touching feature is also planned.
- Do design (but do not yet ship) a `packages/lightbox-primitives` boundary; gate its existence on a third consumer.
- Do treat the two systems' react/tailwind version mismatch as a real constraint on shared code.
- Do close the cross-cutting accessibility gaps (focus trap, focus restore, `aria-hidden` on background) in both systems first; they are the highest leverage for the smallest risk.
- Do not introduce FLIP morph into Vic Country before its Lightbox is decomposed and a placeholder source exists. Pilot View Transitions API instead.
- Do not standardise React, Tailwind, or the image element across both systems for the sake of sharing.
- Prefer composition over inheritance; prefer primitive extraction over system extraction; prefer staged evolution over rewrite.

---

## 1. Product Philosophy & Architectural Intent

### 1.1 What each system optimizes for

**Blackburn optimizes for perceived interaction quality on a small, curated set.** The product *is* the interaction. There are seven hand-curated portrait images. The user is a prospective client evaluating taste; the success metric is "felt premium, made an enquiry." Every architectural choice flows from there:

- A static export is acceptable because the catalogue rarely changes and the deploy target (Azure SWA) excels at it.
- Hand-coded gestures, FLIP morph, build-time LQIP, and `useLayoutEffect`-based scroll lock are *individually* expensive engineering choices that are justified because they are amortised across one extremely visible page.
- Zero animation/gesture libraries because library defaults would dilute the bespoke feel.
- A `GalleryImage` shape with no metadata is correct: portfolios do not show captions or EXIF.

**Vic Country optimizes for finding, tagging, and sharing the right photo from a large operational set.** The product *is* the data. Members open the gallery to find themselves in match photos. Admins open it to tag faces. The success metric is coverage, accuracy, and shareability:

- A server runtime + Prisma + SharePoint sync is non-negotiable because photos arrive continuously from external authoritative storage.
- Face detection + clustering + person aliasing are core, not optional.
- Cursor pagination, deep-linking, favourites, and filters reflect that the user has goals beyond browsing.
- The interaction layer is intentionally simple because feature breadth, not gesture polish, is the gating constraint on shipping value.

### 1.2 How philosophy shaped the architecture

| Concern                  | Blackburn (interaction-first)                          | Vic Country (data-first)                                                |
| ------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| Render mode              | `output: "export"` (everything pre-built)              | `output: "standalone"` (server-rendered with dynamic API routes)        |
| Image lifecycle          | Committed JPEGs in `public/portraits/`                 | SharePoint Graph items, mirrored thumbnails in Azure Blob               |
| Image element            | `next/image` with build-time LQIP                      | Raw `<img>` against same-origin proxy routes                            |
| State surface            | Local state in one grid + one hook                     | Local + URL params + localStorage + Context                             |
| Authentication           | None                                                   | NextAuth; admin RBAC on tagging                                         |
| Component count          | ≈9 files (gallery total)                               | 14+ files in `(components)` plus API + proxy routes + Prisma            |
| Dependency surface       | Zero animation/gesture libraries                       | Zero animation/gesture libraries (intentional, for different reasons)   |
| Maintenance cadence      | Episodic (curation events)                             | Continuous (sync runs, tagging sessions, season cycles)                 |

Both systems converge on "no animation library, no lightbox library." The convergence is accidental: Blackburn rejects libraries because it wants control; Vic Country has not yet *needed* an interaction library because the simple inline implementation has been adequate for its current feature pressure. This convergence is the *strongest* technical reason a future shared primitives package could pay off — both teams would consume the same hooks rather than depending on a third-party black box.

### 1.3 Where philosophy creates friction

- **Curation does not scale.** Blackburn's hardcoded `sources` array in `lib/getImagesWithBlur.ts` cannot serve Couples / Families / Japan without duplication. The system has not been forced to grapple with multi-instance composition because only one route is in production.
- **Operations does not feel premium.** Vic Country's lightbox is functional but lacks the polish that builds emotional engagement with a club's brand. As member expectations rise, this becomes a defect rather than an omission.
- **Mismatched runtime models prevent direct code sharing.** Blackburn assumes everything is buildable; Vic Country assumes nothing is. A primitive that touches the network is unsharable; a primitive that touches only the DOM is shareable.

---

## 2. High-Level Architecture Comparison

### 2.1 Directory structure

**Blackburn**

```
components/gallery/
├── index.ts                     # barrel: GalleryImageCard, Lightbox, MORPH_DURATION, types
├── types.ts                     # GalleryImage, MorphOrigin, MorphPhase, Axis
├── GalleryImageCard.tsx         # captures rect + computed border-radius on click
└── lightbox/
    ├── constants.ts             # CLOSE_THRESHOLD, DIRECTION_LOCK, easings, MORPH_DURATION…
    ├── useScrollLock.ts         # useLayoutEffect, fixed-body, restores scrollY
    ├── useLightboxGestures.ts   # touch handlers, axis lock, velocity, resistance, taps
    ├── MorphOverlay.tsx         # FLIP geometry transition, subpixel-rounded
    ├── CarouselTrack.tsx        # 3-slide window, translate3d track, scale/opacity ramps
    ├── LightboxControls.tsx     # close / arrows / counter / mobile 40vw tap zones
    └── Lightbox.tsx             # composition + backdrop + keyboard
app/work/portraits/
├── page.tsx                     # server: await getImagesWithBlur()
└── PortraitsGrid.tsx            # editorial 4-row hand-composed grid + morph state machine
lib/getImagesWithBlur.ts         # server-only, plaiceholder LQIP per file
```

**Vic Country**

```
app/gallery/
├── page.tsx                                # /gallery
├── albums/[albumId]/page.tsx               # /gallery/albums/:id
├── library/page.tsx                        # /gallery/library
├── people/[personId]/page.tsx              # /gallery/people/:id
├── favourites/page.tsx                     # /gallery/favourites
└── (components)/                           # route-group, co-located
    ├── Lightbox.tsx                       # ~528 LOC: viewer + info panel + tag mode + deep-link
    ├── PhotoGrid.tsx                      # flat infinite scroll
    ├── TimelineGrid.tsx                   # ~839 LOC: month/year buckets + mobile tabs
    ├── TimelineNav.tsx                    # sticky year/month sidebar
    ├── FaceTagOverlay.tsx                 # bbox overlays + person search popover
    ├── FavouritesGrid.tsx
    ├── BulkActionBar.tsx
    ├── FavoriteButton.tsx
    ├── PeopleGrid.tsx
    ├── GalleryFilterBar.tsx
    └── …
app/api/
├── photos/route.ts                        # GET, cursor pagination
├── photos/[id]/route.ts                   # GET detail / PATCH featured
└── gallery/{timeline,year-buckets,people}/route.ts
app/img/[photoId]/route.ts                 # SharePoint Graph proxy
app/thumb/[photoId]/route.ts               # Blob → Graph fallback
app/thumb/face/[faceId]/route.ts           # sharp crop, cached in Blob
lib/hooks/{useFavorites,useSelection,useGalleryFilters}.ts
prisma/schema.prisma                       # Photo, Album, Face, Cluster, Person, PersonAlias, Event, …
```

### 2.2 Rendering pipeline

| Stage              | Blackburn                                                   | Vic Country                                                                 |
| ------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| Build              | `next build` runs `getImagesWithBlur()` → reads disk → LQIP | `next build` only; no per-image work                                        |
| Initial response   | Pre-rendered HTML; all images discoverable                  | Server-rendered HTML; first 50 photos via Prisma; cursor for next page      |
| Hydration          | Single client grid mounts; full state local                 | Client grid mounts; subscribes to URL params; reads localStorage favourites |
| Subsequent loads   | None (static)                                               | `fetch('/api/photos?cursor=…')` via `IntersectionObserver`                  |
| Detail data        | n/a                                                         | `fetch('/api/photos/[id]', { cache: 'no-store' })` lazily on info panel     |

### 2.3 Data pipeline

| Stage      | Blackburn                          | Vic Country                                                                            |
| ---------- | ---------------------------------- | -------------------------------------------------------------------------------------- |
| Source     | Files in `public/portraits/`        | SharePoint document library                                                            |
| Ingest     | Manual `git add`                    | Scheduled / triggered sync writing `Photo`, `Album`, sometimes `Face`                  |
| Persistence| Filesystem                          | Azure SQL via Prisma                                                                   |
| Derived    | `blurDataURL` at build              | Face descriptors, cluster assignments, face crops in Blob                              |
| Identity   | None                                | NextAuth (member) + admin RBAC                                                         |

### 2.4 Image delivery

| Concern             | Blackburn                                              | Vic Country                                                                       |
| ------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Element             | `next/image`                                           | `<img>`                                                                           |
| Optimisation        | `images.unoptimized: true` (static)                    | None enforced; same-origin route controls headers                                 |
| URL                 | `/portraits/<file>.jpg`                                | `/img/[id]`, `/thumb/[id]`, `/thumb/face/[faceId]`                                |
| Backing store       | Local file                                             | SharePoint Graph (full), Blob (thumb + face crop), Graph fallback                 |
| Auth                | None                                                   | NextAuth session required for proxies                                             |
| Cache headers       | CDN (SWA) by URL                                       | `public, max-age=3600` (full) / `86400` (thumb) / `604800, immutable` (face crop) |
| Placeholder         | Build-time base64 LQIP                                 | None                                                                              |
| Variants            | One file, sized by CSS                                 | Three variants (full / thumb / face crop)                                         |

### 2.5 Interaction layer

| Concern              | Blackburn                                                    | Vic Country                                |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------ |
| Open/close animation | FLIP morph, 260 ms, captured `borderRadius`                  | Instant mount                              |
| Backdrop             | rgba(0,0,0,0.95) + blur ramp 0→8 px                          | `bg-black/90` static                       |
| Drag tracking        | Per-frame `dragX`/`dragY`, axis lock, velocity, resistance   | Single `touchend` delta                    |
| Keyboard             | Esc / ← / →                                                  | Esc / ← / → / `i` (info panel)             |
| Reduced motion       | Yes (morph + nav)                                            | No                                         |
| Scroll lock          | `useLayoutEffect`, fixed-body, position-preserving           | `useEffect`, `body { overflow: hidden }`   |
| Preload              | 3-slide eager + active priority                              | None                                       |

### 2.6 Component composition

| System       | Composition pattern                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| Blackburn    | `Page → Grid → (Card | Lightbox(Controls + Carousel + MorphOverlay + scroll-lock + gestures))`         |
| Vic Country  | `Page → Grid (Photo or Timeline) → Lightbox (viewer + info panel + tag overlay + deep-link + favourites)` |

Blackburn separates concerns *vertically* (page owns selection state, lightbox owns interaction state, hooks own gesture state). Vic Country separates concerns *horizontally* (one Lightbox component carries all in-modal concerns; the data hooks live outside it).

### 2.7 Boundaries, ownership, hidden coupling

**Cleanly separated in Blackburn:**

- Gesture math is in `useLightboxGestures`; all thresholds in `constants.ts`. Tuning is centralised.
- Scroll lock is its own hook, no business logic.
- Morph geometry is its own component; viewport carousel is its own component.

**Leaking in Blackburn:**

- The viewport ratio `0.92 vw × 0.84 vh` is **duplicated** in `MorphOverlay.computeCenteredRect` and the Tailwind class strings on `CarouselTrack`. Drift between them silently breaks the morph alignment.
- The `goTo` slide duration is a hardcoded `260` literal — it is *coincidentally* equal to `MORPH_DURATION` but is not the same constant. Future refactoring of one will not migrate the other.
- `MorphOverlay`'s `useEffect` depends on `origin` (a fresh object reference each render); it works only because the parent only constructs `origin` on intentional state changes. This is fragile.
- Inline `zIndex: 60` on `MorphOverlay` (vs `z-50` on Lightbox root). A magic number in a sibling stacking context.

**Cleanly separated in Vic Country:**

- Data hooks (`useFavorites`, `useSelection`, `useGalleryFilters`) are reusable and decoupled from rendering.
- Image proxy routes are separated by variant (full / thumb / face) and each owns its caching contract.
- Prisma schema is the single source of truth for the data graph.

**Leaking in Vic Country:**

- `Lightbox.tsx` (~528 LOC) interleaves: keyboard handling, swipe handling, scroll lock, deep-link writing, info panel state + fetch + cache, share-copy state, face-tag mode, two responsive panel layouts. Every concern touches every other; testing or refactoring any one requires reasoning about all.
- The detail fetch uses `cache: 'no-store'` *and* a manual `Map` cache (`detailCacheRef`). The two caches can disagree (the manual cache is invalidated on tagging, but the HTTP layer was never asked to cache).
- Deep-link write happens unconditionally on every `photo.id` change via `history.replaceState`. There is no coordination with `useGalleryFilters` (which also writes to the URL); a race could clobber filter state.
- `TimelineGrid.tsx` (~839 LOC) is doing layout, grouping, mobile-mode switching, jump-to-section coordination, and lightbox coordination in one component.

### 2.8 Accidental complexity

- **Blackburn**: the duplicated viewport ratios; the inline `zIndex: 60`; the unmemoised `origin` object; the carousel slide intentionally disabling LQIP (`placeholder="empty"`) to avoid letterbox bands — correct behaviour, but undocumented in code.
- **Vic Country**: `Lightbox.tsx`'s monolithic structure; the dual-cache (HTTP + manual Map); the inline `40` and `72` swipe thresholds; the lack of separation between viewer concerns and metadata concerns.

---

## 3. Dependency & Coupling Analysis

### 3.1 Dependency map (gallery-relevant only)

| Package                        | Blackburn        | Vic Country               | Cross-shareable?                                       |
| ------------------------------ | ---------------- | ------------------------- | ------------------------------------------------------ |
| `next`                         | 16.2.4 (export)  | ^16.1.6 (standalone)      | yes, but mode differs                                  |
| `react` / `react-dom`          | 19.2.4           | ^18.2.0                   | **mismatch — block on shared code**                    |
| `next/image`                   | yes              | not used                  | no — Vic Country uses `<img>` against proxies          |
| `plaiceholder`                 | yes              | no                        | no — needs build-time filesystem                       |
| `sharp`                        | yes (LQIP)       | yes (face crops)          | yes, but used differently                              |
| Animation library              | none             | none                      | n/a                                                    |
| Lightbox library               | none             | none                      | n/a                                                    |
| Gesture / swipe library        | none             | none                      | n/a                                                    |
| State library                  | none             | none                      | n/a                                                    |
| Tailwind                       | v4               | v3                        | **mismatch — class syntax differs**                    |
| `@prisma/client`               | no               | ^5.18                     | no — Vic Country only                                  |
| `@azure/storage-blob`          | no               | ^12.29                    | no — Vic Country only                                  |
| `@vladmandic/face-api` + tfjs  | no               | yes                       | no — Vic Country only                                  |
| `next-auth`                    | no               | ^4.24                     | no — Vic Country only                                  |

> **Critical sharing constraint:** Any shared interaction code must compile cleanly under React 18 hook semantics, must not import `next/image`, and must not assume Tailwind v4 arbitrary-value syntax. Each of those three rules blocks an obvious class of "just extract it" mistakes.

### 3.2 Module-by-module portability

Scores: 1 (project-locked) → 5 (drop-in portable). Scoring assumes Vic Country (React 18 / Tailwind v3 / `<img>`) as the destination — Blackburn → Vic Country is the harder direction.

#### Blackburn modules

| Module                                       | Score | Assumes                                                                   | Breaks if reused where…                                            |
| -------------------------------------------- | :---: | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `constants.ts`                               | **5** | Nothing                                                                   | Never                                                              |
| `useScrollLock.ts`                           | **5** | DOM, `document.body`                                                      | SSR-only contexts (already guarded)                                |
| `useLightboxGestures.ts`                     | **3** | Consumer renders per-frame `dragX`/`dragY`; touch only (no pointer)       | Consumer renders only on commit; desktop-mouse-drag expected       |
| `MorphOverlay.tsx`                           | **2** | `next/image`; captured `MorphOrigin`; viewport-stable destination         | No `next/image`; click site cannot capture rect; viewer not stable |
| `CarouselTrack.tsx`                          | **2** | `next/image`; fixed `0.92 × 0.84` ratio; track render shape               | Image element differs; ratio is product-specific                   |
| `LightboxControls.tsx`                       | **4** | Tailwind classes; specific safe-area padding                              | Different design system                                            |
| `Lightbox.tsx`                               | **2** | All of the above; dark backdrop                                           | Different composition; light theme                                 |
| `GalleryImageCard.tsx`                       | **3** | `next/image`; specific aspect ratio; click captures rect                  | Image element differs                                              |
| `getImagesWithBlur.ts`                       | **1** | Build-time filesystem; static export                                      | Server runtime / dynamic catalogue                                 |
| `PortraitsGrid.tsx`                          | **1** | Brand-defining hand-composed layout                                       | Always — it's product, not primitive                               |

#### Vic Country modules

| Module                                       | Score | Assumes                                                                   | Breaks if reused where…                                            |
| -------------------------------------------- | :---: | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `useFavorites.ts`                            | **4** | `localStorage`, `storage` event                                           | SSR-only or no-localStorage environments                           |
| `useSelection.tsx`                           | **5** | React Context                                                             | Never (it's a generic selection model)                             |
| `useGalleryFilters.ts`                       | **2** | URL search params; specific filter keys                                   | Different URL contract                                             |
| Image proxy routes (`/img`, `/thumb`)        | **1** | SharePoint Graph token; Blob; NextAuth session                            | No SharePoint; no Blob                                             |
| Face crop route (`/thumb/face`)              | **1** | All of the above + sharp + Face graph                                     | No face graph                                                      |
| Prisma schema (gallery models)               | **1** | Azure SQL; SharePoint identity                                            | Always                                                             |
| `Lightbox.tsx`                               | **1** | Detail API; favourites; deep-link contract; tag mode; info panel layout   | Always — it's the product surface                                  |
| `PhotoGrid.tsx`                              | **2** | `/api/photos` cursor contract                                             | Different API shape                                                |
| `TimelineGrid.tsx`                           | **1** | Effective-date abstraction; mobile mode; jump nav; favourites context     | Always                                                             |
| `FaceTagOverlay.tsx`                         | **1** | Face graph + admin endpoints + person search                              | Always                                                             |

### 3.3 Hidden assumptions (the dangerous list)

These are assumptions the code *appears* to make implicitly. Each is a live trap during reuse.

**Blackburn**

- The destination viewer is `0.92 vw × 0.84 vh` and **two files** must agree about that.
- The image is `next/image` and benefits from `priority`/`sizes` metadata. Replacing with `<img>` loses subpixel decode coordination and the LQIP path.
- The grid card is positioned in normal flow such that `getBoundingClientRect()` at click time corresponds to the visual position the morph should start from. Sticky/fixed parents would silently break the morph.
- `prefers-reduced-motion` is checked once on hook init via `matchMedia`; it does not subscribe to changes mid-session. Acceptable for a portfolio; not for a dashboard.
- Touch only. There is no `pointerdown/move/up` path. Desktop relies on arrows + keyboard. Mouse drag will not work.
- `useLayoutEffect`-based scroll lock requires a browser DOM. In an SSR context the hook short-circuits, but the effect is currently keyed on mount with no SSR guard inside it (relies on React's environment).

**Vic Country**

- `Lightbox.tsx` writes `?photo=ID` via `history.replaceState` on every `photo.id` change and clears it on unmount via cleanup. **It does not coordinate** with `useGalleryFilters`, which also writes to the URL via `router.replace`. If both are active and a user changes a filter while the lightbox is open, the deep-link write may stomp filter state on the next render or vice versa.
- `useFavorites` reads from `localStorage` synchronously inside an effect. SSR and the first client render disagree; first paint shows zero favourites and then snaps. Acceptable for now; will hydrate-warn under stricter modes.
- `body { overflow: hidden }` does not preserve scroll position on close in all browsers. Combined with mobile Safari's URL-bar shrink, the page will appear to "jump" on close.
- Detail fetch uses `cache: 'no-store'` *and* a manual `Map`. There is no coordination between the two; tagging invalidates the manual cache but the HTTP cache (if any intermediate proxy adds one) is not invalidated.
- `IntersectionObserver` sentinel uses `400px rootMargin` for infinite scroll. Combined with the lightbox holding `body { overflow: hidden }`, scroll-driven loading pauses while the lightbox is open — currently fine, but a shared scroll-lock primitive must preserve this property.
- All gallery routes use raw `<img>`. There is no responsive variant logic; mobile devices download desktop-sized thumbs.

### 3.4 Environment, framework, image, viewport, CSS, timing assumptions

| Class      | Blackburn                                                                                              | Vic Country                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Environment| Browser DOM; static export; CDN-served files                                                           | Browser DOM; Node runtime; authenticated session; SharePoint reachable               |
| Next.js    | App Router 16; server components for page; static export; React 19; React Compiler emitting warnings   | App Router 16; server components + dynamic API routes; React 18                      |
| Image      | `next/image`, `placeholder="blur"`, `unoptimized: true`                                                | `<img>`, no responsive variants, no LQIP                                             |
| Viewport   | `0.92 × 0.84` of viewport (duplicated); single `md` breakpoint at 768 px; `env(safe-area-inset-*)`     | `inset-0` fullscreen; `md` breakpoint for sidebar vs bottom-sheet; no safe-area work |
| CSS        | Tailwind v4 arbitrary syntax (`aspect-4/5`, `h-[84vh]`); dark-only                                     | Tailwind v3; per-club accent colours via `accentColor` prop                          |
| Timing     | 260 ms morph; 260 ms nav slide; 220 ms close; 180 ms reduced-motion fade; 120 ms / 80 ms viewport fade | None — instant mount; default Tailwind `transition-colors` (≈150 ms) on chrome only  |

---

## 4. Interaction System Comparison

### 4.1 Gesture architecture

| Property                    | Blackburn                                                              | Vic Country                              |
| --------------------------- | ---------------------------------------------------------------------- | ---------------------------------------- |
| Lifecycle                   | `touchstart` + `touchmove` + `touchend`                                | `touchstart` + `touchend`                |
| State exposed each frame    | `dragX`, `dragY`, `animating`, `axisRef`                               | None                                     |
| Per-frame visual feedback   | Yes — track `translate3d`, scale, opacity ramps                        | No                                       |
| Constants location          | `constants.ts` (single source of truth)                                | Inline literals in component             |
| Velocity                    | Tracked via timestamped deltas                                         | Not tracked                              |
| Resistance / rubber-band    | Past 60 % viewport, `0.35 * (1 - exp(-excess/120))`                    | None                                     |
| Strict axis lock            | After 10 px lead; other axis forced to 0                               | End-of-gesture comparison `|dy| > |dx|`  |
| Tap-vs-drag                 | `axisRef === "none"` && total movement < 8 px                          | n/a                                      |
| Tap zones                   | In-image left/right 40 % + mobile-only 40vw fallback buttons           | None                                     |

### 4.2 Open / close flow

**Blackburn**

```
click → capture rect + computed borderRadius
      → morphPhase: opening
      → MorphOverlay writes start style sync, end style in rAF
      → 260 ms transition of (top, left, width, height, transform, opacity, border-radius)
      → morphPhase: open
      → carousel viewport fade-in (120 ms / 80 ms delay)
      → MorphOverlay returns null
```

**Vic Country**

```
click → setLightboxPhotoId(id)
      → Lightbox mounts: position: fixed inset-0 z-50 bg-black/90
      → <img src="/img/[id]"> requests bytes
      → black screen until decode
      → image displays
```

The Blackburn open path **hides decode latency inside the morph**. The Vic Country open path **reveals decode latency** as a black frame. With sufficient image cache, both feel similar; cold cache, they do not.

### 4.3 Scroll locking

| Behaviour                            | Blackburn                                            | Vic Country                              |
| ------------------------------------ | ---------------------------------------------------- | ---------------------------------------- |
| Hook timing                          | `useLayoutEffect`                                    | `useEffect`                              |
| Mechanism                            | `position: fixed; top: -scrollY; width: 100%`        | `body { overflow: hidden }`              |
| Restores scroll position on unmount  | Yes                                                  | No (browser may snap)                    |
| iOS Safari rubber-band on backdrop   | Suppressed                                           | Persists                                 |
| Sticky/fixed children of body        | Removed from flow (no impact)                        | Sticky breaks during open                |

This is the single most impactful Phase-1 win. It is causally responsible for the most common UX complaint pattern in long-scroll galleries ("page jumped to top after I closed the photo").

### 4.4 Animation systems

| Property                | Blackburn                                                | Vic Country |
| ----------------------- | -------------------------------------------------------- | ----------- |
| Morph                   | 7-property transition, 260 ms, `(0.22, 1.08, 0.36, 1)`   | None        |
| Backdrop fade           | 260 ms with morph                                        | None        |
| Backdrop blur ramp      | 0 → 8 px, decays with vertical drag                      | None        |
| Carousel viewport fade  | 120 ms / 80 ms delay                                     | None        |
| Slide active scale      | `1 → 0.95` non-linear with drag                          | None        |
| Side-image opacity      | `0.65 → 1.0` via `pow(progress, 1.4)`                    | None        |
| Snap-back               | 260 ms eased                                             | None        |
| Reduced-motion fallback | 180 ms opacity-only fade                                 | n/a         |

### 4.5 Keyboard handling

| Key      | Blackburn                | Vic Country                |
| -------- | ------------------------ | -------------------------- |
| `Esc`    | close                    | close                      |
| `←` / `→`| prev / next              | prev / next (bounds-checked)|
| `i`      | n/a                      | toggle info panel          |
| `Tab`    | escapes dialog (no trap) | escapes dialog (no trap)   |

### 4.6 Reduced motion

- Blackburn: matched in `MorphOverlay` (geometry → opacity fade) and `useLightboxGestures` (`goTo` jumps). Read once on init via `matchMedia`.
- Vic Country: not implemented anywhere in the gallery.

### 4.7 Preload

- Blackburn: 3-slide window with all `loading="eager"` and active `priority`. Adjacent images decode while user dwells on current.
- Vic Country: none. Each navigation is a fresh network round-trip (modulo browser cache).

### 4.8 Mobile UX

- Blackburn: `40vw` left/right fallback tap zones, responsive slide gap, `env(safe-area-inset-*)` on dialog padding and chrome positioning, drag-driven scale and opacity for tactile feel.
- Vic Country: responsive *layout* (years/months/all tabs on mobile, bottom-sheet info panel) but undifferentiated *interaction* between touch and pointer. No safe-area handling.

### 4.9 Why each feels the way it does

**Why Blackburn feels premium:**

1. The morph creates **continuity of identity** — the image you tapped is the image that grows. There is no "loading" perceptual gap.
2. Per-frame drag visual feedback creates **direct manipulation** — the image responds to your finger rather than reacting after release.
3. Eased exponential resistance **communicates limits without imposing them** — the user is told "this is the edge" without being stopped abruptly.
4. Velocity-aware navigation makes **flicks always commit** — the user does not have to drag past an arbitrary distance.
5. Subpixel rounding + `translateZ(0)` eliminate **shimmer on mobile Safari** — the absence of jitter is invisible but felt.
6. Reduced-motion fallback **respects user preference** — invisible to most users, critical to a small minority.

**Why Vic Country feels operational:**

1. Instant mount communicates **"this is a viewer, not a story."** Acceptable in a tool; jarring in a portfolio.
2. The information density (info panel, face boxes, favourites, share, tag mode) signals **utility, not theatre**. This is correct for the product.
3. The lack of motion communicates **stability over expressiveness**, which is the right tradeoff for an admin tagging session.

The premium feel is **architectural**, not visual. It comes from per-frame state plumbing, captured geometry, layout-stable destinations, and constants tuned across many sessions on real devices. It is not a CSS file you can copy.

### 4.10 Transferable interaction primitives

- `useScrollLock` (verbatim, with React 18 syntax check).
- `useReducedMotion` (greenfield, ~10 LOC).
- `useFocusTrap` (greenfield, ~30 LOC).
- Velocity tracking pattern (timestamp + last-position deltas inside the touch handlers).
- Tap-vs-drag detection (movement threshold + axis-lock state).
- Adjacent-preload pattern (render `<link rel="preload" as="image">` for prev/next photo IDs).

### 4.11 Non-transferable interaction systems

- The full FLIP morph (depends on captured rect + LQIP source + viewport stability — see §3.3).
- The carousel render shape (`CarouselTrack` with three slides, `translate3d` track, drag-driven scale/opacity ramps) — Vic Country's lightbox does not currently render a track; adopting it is a partial rewrite of the viewer.
- Backdrop blur ramp and slide opacity ramp (require per-frame `dragY` plumbing that Vic Country does not have).

### 4.12 Interaction debt in Vic Country

Listed by descending leverage:

1. No focus trap.
2. No reduced-motion branch.
3. Scroll position not restored on close.
4. No adjacent preload.
5. Single-`touchend` swipe with no velocity, no per-frame feedback.
6. Inline thresholds (`40`, `72`) — not centralised.
7. No subpixel/GPU hints on the open viewer (acceptable today, blocks future motion work).
8. `Lightbox.tsx` is monolithic — testing any single concern requires standing up all of them.

---

## 5. Data & Rendering Architecture

### 5.1 Static asset model

Blackburn commits images. The catalogue is the contents of `public/portraits/` plus the `sources` array. Adding a photo is a code change. There is no "missing image" failure mode in production — if the image is broken, the build fails. There is no auth, no expiry, no proxy contract, no cost model. The trade is that the catalogue cannot grow continuously.

Vic Country pulls images. The catalogue is whatever Prisma returns from a Photo query, gated by club, album, person, year, month, and featured status. Photos can be in `new`, `processing`, `ready`, or `deleted` states. The catalogue can grow without redeploys. The trade is everything: auth, caching headers, proxy lifecycle, sync correctness, blob hygiene, Graph throttling.

### 5.2 Build-time generation

Blackburn does meaningful build-time work: `getImagesWithBlur()` is called in the page server component but the result is effectively static under `output: "export"`, so `plaiceholder` runs once per build, producing base64 LQIP per file. This is *the* technique behind the perceived loading quality.

Vic Country does no per-image build-time work. Adding LQIP to Vic Country is not a frontend task — it is an *ingestion* task (compute LQIP at sync time, persist on the `Photo` row as `blurDataUrl: String?`, render in the grid and lightbox). This is feasible and worth doing, but it is a pipeline change, not a Lightbox change.

### 5.3 Runtime fetching

Vic Country uses three fetch patterns:

- **Cursor pagination** at `/api/photos?cursor=…&take=…&albumId=…&…`. Cursor is base64url-encoded; pagination is stable under inserts.
- **Detail fetch** at `/api/photos/[id]` with `cache: 'no-store'`. Returns photo + album + photoPeople + faces (with cluster → clusterPeople resolution). Triggered by info panel open or tag mode.
- **Aggregations** at `/api/gallery/timeline` and `/api/gallery/year-buckets` for the timeline navigation.

Blackburn fetches nothing at runtime.

### 5.4 API design observations

- Cursor pagination is well-implemented and uses `Prisma.sql` for safe SQL composition — good defence against accidental injection.
- Detail fetch uses `cache: 'no-store'` to bypass HTTP/Next caches; combined with the manual `detailCacheRef` in the Lightbox, this gives correct invalidation on tagging at the cost of two cache layers to reason about.
- The `PATCH /api/photos/[id]` route gates on admin. This is correct, but the gate lives in the route — there is no shared admin guard primitive.

### 5.5 Deep-linking

Vic Country's `?photo=ID` contract is simple and useful. Implementation details:

- `Lightbox` writes `?photo=ID` via `history.replaceState` in an effect keyed on `photo?.id`, and clears it in the same effect's cleanup.
- `PhotoGrid` reads the search param on mount and opens the lightbox at the matching index.

Limitation: there is no `popstate` handling, so Back does not close the lightbox. Limitation: as noted, no coordination with `useGalleryFilters`.

### 5.6 Metadata systems

The Vic Country `Photo` graph is the most architecturally interesting part of the system:

- `Photo` belongs to `Album`; `Album` optionally belongs to `Event`.
- `Photo` has many `Face` (bounding box + descriptor + quality + assignedCluster).
- `Cluster` has many `Face` and many `Person` (via `ClusterPerson`).
- `Person` has many `PersonAlias` (name, jersey number, merged name).
- `Photo` has many `Person` directly via `PhotoPerson`.

This dual edge — `Cluster ↔ Person` and `Photo ↔ Person` — is intentional: the cluster relationship represents *AI-detected identity*, the photo relationship represents *manually-confirmed identity*. The Lightbox info panel reads both.

Blackburn has no metadata. The `GalleryImage` shape is `{ id, src, alt, blurDataURL }`. Adding any of EXIF, capture date, or caption is a `GalleryImage` migration plus a `getImagesWithBlur` change.

### 5.7 Caching

| Layer                | Blackburn                                            | Vic Country                                                         |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| Asset CDN            | Yes (SWA)                                            | Same-origin proxy with explicit `Cache-Control` per route           |
| Browser image cache  | Yes                                                  | Yes (constrained by proxy headers)                                  |
| API response cache   | n/a                                                  | Default (per-route)                                                 |
| Detail cache         | n/a                                                  | `no-store` HTTP + manual `Map` in component                         |
| Face crop cache      | n/a                                                  | Generated lazily, persisted to Blob, returned `immutable` for 7 d   |

### 5.8 Image proxying

Vic Country's image proxy strategy is a strength worth preserving:

- `/img/[photoId]` proxies SharePoint Graph `/drives/{driveId}/items/{itemId}/content` server-side, hiding both the Graph URL and the bearer token from the browser.
- `/thumb/[photoId]` tries Blob first (fast, public-disabled), falls back to Graph's medium thumbnail.
- `/thumb/face/[faceId]` lazily computes a 200×200 WebP face crop using `sharp`, persists to Blob, returns `immutable` for 7 d.

The cost is server CPU on first cold access of a face crop. The benefit is a uniform same-origin URL contract that the frontend never needs to know about.

### 5.9 SSR vs client behaviour

Blackburn pages are static-rendered. The grid hydrates with all data already in the markup. There is no SSR/CSR mismatch surface.

Vic Country pages are server-rendered with Prisma queries inside the page component, then hydrated. Two potential mismatch surfaces:

- `useFavorites` reads `localStorage` only on the client; server-rendered HTML shows zero favourites. First client paint will flash.
- The deep-link `?photo=ID` is on the URL on the server too, but the lightbox open is a client-only concern; SSR paints the grid without the lightbox overlay.

Neither is broken; both are observable.

### 5.10 Unavoidable vs self-inflicted complexity

**Unavoidable in Vic Country:**

- The image proxy contract (auth + caching + variants).
- The face graph (clusters + people + aliases + dual edges).
- Cursor pagination (offset would skew under inserts).
- Multiple route entry points (different filtering surfaces).

**Self-inflicted in Vic Country:**

- The monolithic `Lightbox.tsx`.
- Inline swipe thresholds.
- Lack of preload.
- Lack of LQIP plumbing in the ingestion pipeline.
- Dual-cache for detail fetch.

**Unavoidable in Blackburn:**

- The single-page editorial layout.
- The static export constraint (set by deploy target).

**Self-inflicted in Blackburn:**

- The duplicated viewport ratio constants.
- The hardcoded `260` literal in `goTo` (instead of `MORPH_DURATION`).
- The hardcoded `sources` array preventing reuse across the placeholder routes.

---

## 6. Accessibility & UX Robustness

| Concern                              | Blackburn                                              | Vic Country                                            |
| ------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------ |
| Dialog role / aria-modal / aria-label| Yes                                                    | Yes                                                    |
| Live region                          | `aria-live="polite"` on counter                        | None                                                   |
| Button labels                        | `aria-label` on all controls                           | `aria-label` + `title` + `aria-pressed` on toggles     |
| Decorative-element handling          | Consistent `aria-hidden`                               | Inconsistent                                           |
| Focus move on open                   | **No**                                                 | **No**                                                 |
| Focus restore on close               | **No**                                                 | **No**                                                 |
| Focus trap                           | **No**                                                 | **No**                                                 |
| `aria-hidden` / `inert` on background| **No**                                                 | **No**                                                 |
| Reduced-motion                       | Yes                                                    | **No**                                                 |
| Duplicate aria-labels                | Mobile tap zones duplicate desktop arrows              | None                                                   |
| Safe-area handling                   | Yes (`env(safe-area-inset-*)`)                         | None                                                   |

### 6.1 Critical findings

- **No focus trap in either system.** WCAG 2.1 SC 2.4.3 risk. Keyboard users can `Tab` into the body-locked underlying page and lose context. This is the highest-leverage cross-cutting fix.
- **No focus restoration in either system.** Focus is wherever it was before the dialog opened, not on the originating card. Compounds the trap problem.
- **No `aria-hidden` / `inert` on background content.** Screen readers may read the underlying page while the modal is open.

### 6.2 Medium-risk findings

- Vic Country has no `prefers-reduced-motion` branch. As soon as any motion is added (Phase 1 includes a backdrop fade), this becomes a defect.
- Vic Country's lightbox does not have a counter or a live region — screen-reader users have no announced indication of position in a long album.
- Blackburn's mobile tap-zone buttons share `aria-label`s with the desktop arrows; VoiceOver users hear "Previous image" twice.

### 6.3 Easy wins

1. `useFocusTrap` + focus restore — applies cleanly to both systems with no other dependencies.
2. `inert` (or `aria-hidden`) on the page root while the dialog is open.
3. `useReducedMotion` + apply to existing and future motion.
4. Add `aria-hidden="true"` to Blackburn's mobile tap-zone buttons.
5. Add a counter + `aria-live="polite"` to Vic Country's Lightbox (consistent with Blackburn).

### 6.4 Production risks during migration

- **Refactoring `Lightbox.tsx`** without preserving the existing keyboard behaviours (especially `i` for info) is a regression.
- **Adding focus management** to a long-lived production component can produce *new* tab-order surprises if the focusable element graph is not understood. Verify with keyboard and screen reader before merging.
- **Adding scroll-position-preserving lock** changes scroll behaviour observable to other modals on the same page (if any). Audit.
- **Adding any animation to Vic Country** without the reduced-motion branch in place first is a small but real accessibility regression.

---

## 7. Performance & Runtime Characteristics

### 7.1 Image loading

| Concern               | Blackburn                                            | Vic Country                                  |
| --------------------- | ---------------------------------------------------- | -------------------------------------------- |
| Element               | `next/image` (responsive, lazy, decode async)        | `<img>` (no responsive variants in lightbox) |
| Variants              | Generated by Next                                    | Three explicit (full / thumb / face crop)    |
| Preload (active)      | `priority`                                           | None                                         |
| Preload (adjacent)    | `loading="eager"` on prev/next slides                | None                                         |
| Placeholder           | Build-time base64 LQIP                               | None                                         |
| Decode hint           | `next/image` defaults                                | Browser default                              |

### 7.2 Render frequency

- Blackburn's `useLightboxGestures` updates `dragX`/`dragY` on every `touchmove`, causing the carousel to re-render each frame. This is the *intended* cost of per-frame visual feedback. The render is cheap because the changes flow as `transform`/`opacity` only — no layout, no paint outside the composited layer.
- Vic Country's `Lightbox` re-renders only on photo change, info panel toggle, tag mode toggle, and detail fetch resolution. Steady-state cost is near zero.
- Blackburn's `useLightboxGestures` also has a `pageRef` resize listener that writes `viewportWidth` state on every resize tick — this re-renders the lightbox during window resize. Acceptable but wasteful; could be debounced.

### 7.3 Animation performance

- Blackburn's morph transitions seven properties simultaneously. Two of them (`top`, `left`) trigger layout. This is the *correct* tradeoff for FLIP — composited-only morphs cannot match the geometric correctness — but it does cost a layout pass per frame on the morphing element. `translateZ(0)` and `will-change` mitigate by promoting to a composited layer; subpixel rounding eliminates shimmer.
- Vic Country has no animations to perform.

### 7.4 GPU acceleration

- Blackburn applies `transform-gpu` (Tailwind), `translateZ(0)`, `will-change`, and `backface-visibility: hidden` on the right elements. The cost is a composited layer per element; the benefit is no jank during morph.
- Vic Country applies none. Acceptable today; required before adding any motion.

### 7.5 Bundle complexity

Both systems are remarkably lean for what they do. Neither pulls in framer-motion, GSAP, react-spring, swiper, embla, or yet-another-react-lightbox. The Blackburn gallery total is ≈600 LOC; Vic Country's gallery is larger but the bulk is product (TimelineGrid, info panel, face overlay, favourites) not framework wrapping.

### 7.6 Runtime memory

- Blackburn: bounded by 7 portrait images. Non-issue.
- Vic Country: `PhotoGrid` accumulates all loaded pages in state. With cursor pagination at 50/page, a member browsing deep into a season can hold 1000+ image elements in memory. There is no virtualisation. This is an unfixed scaling concern that will bite at the largest album sizes.

### 7.7 API / network dependency

Vic Country's lightbox open is **two network requests** in the worst case: `/img/[id]` for the bytes, `/api/photos/[id]` for the detail (only if the user opens info panel or enters tag mode). The detail request is cached in `detailCacheRef` for the session.

### 7.8 Mobile Safari risks

- Blackburn explicitly defends against the most common Safari issues: subpixel rounding for shimmer, `translateZ(0)` for compositing, `env(safe-area-inset-*)` for notch handling, `useLayoutEffect` for pre-paint scroll lock.
- Vic Country has none of these defences. The most likely Safari-specific failure modes today are (a) scroll position loss on close (already noted) and (b) URL bar shrink causing layout shift behind the dialog.

### 7.9 Scaling concerns

| Concern                              | Blackburn                | Vic Country                                                         |
| ------------------------------------ | ------------------------ | ------------------------------------------------------------------- |
| Catalogue size                       | n/a (curated)            | Tens of thousands per club; cursor pagination handles               |
| Grid render with N items             | n/a                      | Linear DOM growth in `PhotoGrid`; **no virtualisation**             |
| Timeline grouping with N months      | n/a                      | Linear; the Map build is O(N); fine to ~10k photos                  |
| Face crop generation                 | n/a                      | First access ~hundreds of ms (sharp); cached after; bursts on cold cache |
| SharePoint throttling                | n/a                      | Possible during sync; not in user-facing path                       |

---

## 8. Portability & Reuse Feasibility

### 8.1 Highly portable

These can move with minimal adaptation. Score 4–5.

| Module                  | Source       | Notes                                                      |
| ----------------------- | ------------ | ---------------------------------------------------------- |
| `useScrollLock`         | Blackburn    | Pure DOM; verify React 18 syntax                           |
| `constants.ts`          | Blackburn    | Pure values; consume with care (taste-tuned)               |
| `useReducedMotion`      | (greenfield) | ~10 LOC; both systems benefit                              |
| `useFocusTrap`          | (greenfield) | ~30 LOC; both systems benefit                              |
| `useSelection`          | Vic Country  | Generic Context-based selection model                      |
| `LightboxControls`      | Blackburn    | Headless if className passthrough is added                 |

### 8.2 Moderately portable

Score 2–3. Need parameterisation or contract negotiation.

| Module                  | Source       | What needs to change                                       |
| ----------------------- | ------------ | ---------------------------------------------------------- |
| `useLightboxGestures`   | Blackburn    | Consumer must render per-frame `dragX`/`dragY`             |
| `CarouselTrack`         | Blackburn    | Image element abstraction; viewport ratio externalised     |
| `MorphOverlay`          | Blackburn    | Image abstraction; `MorphOrigin` capture; viewport stable  |
| `GalleryImageCard`      | Blackburn    | Image abstraction; aspect ratio externalised               |
| `useFavorites`          | Vic Country  | SSR guard; consider server-sync optionality                |
| `useGalleryFilters`     | Vic Country  | URL contract is project-specific                           |

### 8.3 Tightly coupled

Score 1. Should be reasoned about as product, not primitive.

| Module                  | Source       | Why                                                        |
| ----------------------- | ------------ | ---------------------------------------------------------- |
| `Lightbox.tsx`          | Vic Country  | Interleaves viewer, info, tagging, deep-link, favourites   |
| `TimelineGrid.tsx`      | Vic Country  | Layout + grouping + mobile mode + jump nav                 |
| `PortraitsGrid.tsx`     | Blackburn    | Brand-defining hand-composed layout                        |
| `FaceTagOverlay.tsx`    | Vic Country  | Depends on face graph + admin endpoints                    |

### 8.4 Project-specific (forever)

| Module                              | Why                                                    |
| ----------------------------------- | ------------------------------------------------------ |
| `getImagesWithBlur`                 | Static-export filesystem only                          |
| Image proxy routes                  | SharePoint + Blob + auth                               |
| Prisma schema (gallery models)      | Data graph specific to the sports-photo product        |
| All page chrome and layouts         | Brand                                                  |
| All theming (dark vs accent colour) | Brand                                                  |

### 8.5 Premature abstractions to avoid

- A shared `<Lightbox>` component. Sample size of two; assumptions diverge.
- A shared `<Gallery>` component. Galleries are products.
- A shared image element. The choice between `next/image` and `<img>` is load-bearing for each system.
- A shared theming token system. Blackburn is dark; Vic Country has per-club accents. There is no overlap.
- A shared image-data shape. Adding `Photo`-like fields to `GalleryImage` would import operational concerns into the editorial system.

### 8.6 Do Not Share Yet

- The Lightbox composition.
- The morph overlay implementation (until at least one consumer outside Blackburn has driven the API).
- Animation easings as exported constants (until both consumers agree).
- Anything that names a route or a search param.
- Anything that mentions Tailwind utility classes by literal string.

### 8.7 Safe To Share

- `useScrollLock` (verbatim with React 18 check).
- `useReducedMotion` (greenfield).
- `useFocusTrap` (greenfield).
- A keyboard navigation reducer (Esc / arrows / configurable).
- `useSelection` (generic Context shape).

### 8.8 Needs Refactor Before Sharing

- `useLightboxGestures` — extract `MORPH_DURATION` from inline `260`; make image element agnostic; document required consumer render shape.
- `MorphOverlay` — replace `next/image` with a render prop; externalise viewport ratios.
- `LightboxControls` — accept className/style overrides; remove Blackburn-specific Tailwind literals from the API surface.

---

## 9. Recommended Evolution Strategy

The roadmap is conservative. Vic Country is production infrastructure that serves real members and admins; nothing should destabilise it. Blackburn is a brand-critical portfolio; nothing should regress its premium feel. **Each phase is independently shippable, reversible, and gated on the previous one delivering value.**

### Phase 1 — Low-Risk Quality Improvements (Vic Country only)

Goal: import behaviour from Blackburn *without restructuring* Vic Country. Six concrete, isolated changes.

| #  | Change                                          | Risk    | Effort | Notes                                                                             |
| -- | ----------------------------------------------- | ------- | ------ | --------------------------------------------------------------------------------- |
| 1  | `useReducedMotion()` hook                       | minimal | tiny   | Pure media-query subscription. Used by the next two changes.                      |
| 2  | Backdrop fade-in (200 ms, respects #1)          | low     | tiny   | CSS opacity transition.                                                           |
| 3  | Replace scroll lock with fixed-body technique   | low     | small  | Preserves scroll position on close. `useLayoutEffect`. Audit for stacking issues. |
| 4  | Preload adjacent images                         | low     | tiny   | `<link rel="preload" as="image">` for prev/next photo IDs while open.             |
| 5  | Improve swipe thresholds                        | low     | small  | Lift thresholds to constants. Add velocity tracking via timestamped `touchmove`. Vertical close at 100 px or velocity ≥ 0.5 px/ms. Strict axis lock at 10 px lead. |
| 6  | `useFocusTrap` + focus restore                  | low     | small  | Greenfield; ~40 LOC. WCAG win.                                                    |

**Out of scope for Phase 1:** morph, carousel restructure, `next/image` migration, LQIP, shared package, decomposition of `Lightbox.tsx`.

**Acceptance signal:** members report fewer "page jumped" complaints; QA confirms reduced-motion users see no animation regressions; keyboard QA confirms `Tab` is contained.

### Phase 2 — Interaction Layer Refactor (Vic Country only)

Goal: decompose `Lightbox.tsx` into the same shape Blackburn uses, **without changing the data architecture**.

Suggested layout (intentionally mirrors Blackburn naming):

```
app/gallery/(components)/lightbox/
├── constants.ts                # thresholds, durations (hoisted from Phase 1 inline)
├── useScrollLock.ts            # extracted from Phase 1
├── useReducedMotion.ts         # extracted from Phase 1
├── useFocusTrap.ts             # extracted from Phase 1
├── useLightboxGestures.ts      # ported from Blackburn, adapted to <img>
├── LightboxControls.tsx        # close + arrows + counter
├── LightboxInfoPanel.tsx       # split out: detail fetch, players, faces sidebar
├── LightboxFaceTagLayer.tsx    # tag mode (currently inline)
└── Lightbox.tsx                # composition + backdrop + keyboard + deep-link
```

Refactor risks and mitigations:

| Risk                             | Mitigation                                            |
| -------------------------------- | ----------------------------------------------------- |
| Regress info panel timing        | Move `detailCacheRef` and the fetch effect verbatim   |
| Regress face tagging             | Move overlay as a single unit; keep its API surface   |
| Regress deep-linking             | Keep the `?photo=ID` writer at the top-level Lightbox |
| Regress favourites               | `useFavorites` continues to be consumed unchanged     |
| Regress URL coordination         | This is an opportunity to coordinate with `useGalleryFilters` once and for all |

**Trigger:** do this only when (a) Phase 1 has shipped and stuck for at least one cycle and (b) at least one new lightbox-touching feature is planned. Decomposition for its own sake does not pay back.

### Phase 3 — Shared Primitive Layer (gated on third consumer)

Goal: extract pure-primitive hooks/components into a single shared package.

**Trigger condition:** a *third* consumer of these primitives exists (e.g. a club admin tool, a second blackburn-style site, a teammates app). With only two consumers, the cost of versioning, release coordination, and lowest-common-denominator API design exceeds the benefit. Until then, copy-with-attribution is fine.

What would be shared (see §10 for the boundary in detail):

- `useScrollLock`, `useReducedMotion`, `useFocusTrap`.
- `useLightboxGestures` and its `constants` (only after Vic Country has *adopted* them under Phase 2 and proved the fit).
- `LightboxControls` chrome (only after className passthrough is added).
- A keyboard navigation reducer.

What would **not** be shared:

- The Lightbox composition.
- Anything touching `next/image`, `next/link`, or any data layer.
- Anything that names a route or a search param.
- Anything that knows about Tailwind classes (consumer may use a different stylesheet).

### Phase 4 — Advanced Motion & Future Work (optional, item-by-item)

None of these is on the critical path. Sequence and gate independently.

- **View Transitions API pilot.** Lower fidelity than Blackburn's hand-tuned morph but a fraction of the code. Worth piloting in Vic Country *before* re-implementing the morph.
- **FLIP morph in Vic Country.** Requires Phase 2, plus a layout-stable viewer (commit to a fixed viewport ratio), plus a placeholder source for the destination (LQIP via the ingestion pipeline, or low-res `/thumb/` as the morph source). High risk on first attempt because Vic Country's grid does not currently expose `getBoundingClientRect()` from the click site.
- **Pinch-to-zoom + double-tap zoom.** Net new capability for both systems. Should be a separate primitive (`useImageZoom`). High complexity due to gesture composition with the existing pan/swipe.
- **Inertial flick after swipe.** Only after the resistance/velocity work is in place.
- **Backdrop blur ramp tied to drag progress.** Trivial once Vic Country has per-frame `dragY` plumbing.
- **Generalise Blackburn `getImagesWithBlur`** to accept a directory and sources array, enabling Couples / Families / Japan to share the helper.
- **Add LQIP to Vic Country ingestion pipeline.** Persist `blurDataUrl` on `Photo`. Render in grid + lightbox.

### Sequencing dependencies

```
Phase 1 (Vic Country quality wins)
     │
     ▼
Phase 2 (Vic Country decomposition)
     │
     ├─► Phase 3 (shared primitives, gated on 3rd consumer)
     │
     └─► Phase 4 items (each independently)
```

### High-risk areas

- Phase 4 morph in Vic Country before Phase 2 — too many integration surfaces to control.
- Any unilateral upgrade of React or Tailwind purely to enable sharing — pulls in unrelated breakage.
- Blanket adoption of Blackburn's gesture constants in Vic Country without re-tuning for sports-photo aspect ratios and crowd shots.
- Touching the deep-link contract during Phase 2 refactor — easy regression, observable to users via shared URLs.

### Things to delay indefinitely

- A shared `<Lightbox>` or `<Gallery>` component.
- A shared image-data shape.
- A shared theming system.
- A rewrite of either Lightbox.

---

## 10. Recommended Shared Package Boundary

> **Only create this package when a third consumer exists.** Until then, treat this section as a design sketch.

```
packages/lightbox-primitives/
├── gestures/
│   ├── useLightboxGestures.ts        # axis lock, velocity, resistance, taps
│   └── constants.ts                  # thresholds, easings, durations
├── motion/
│   ├── easings.ts                    # cubic-bezier strings
│   └── durations.ts                  # MORPH_DURATION, NAV_DURATION, REDUCED_MOTION_DURATION
├── accessibility/
│   ├── useFocusTrap.ts
│   └── useReducedMotion.ts
├── keyboard/
│   └── useKeyboardNavigation.ts      # Esc / arrows / configurable extras
├── scroll-lock/
│   └── useScrollLock.ts
└── chrome/                           # headless components (className passthrough)
    ├── CloseButton.tsx
    ├── PrevNextButtons.tsx
    └── Counter.tsx
```

### What belongs here

- Pure hooks with no rendering and no framework-specific imports.
- Numeric/string constants — only after both consumers agree.
- Headless chrome components (`<button>` semantics + className passthrough). No design system embedded.
- Type aliases that are app-agnostic (`Axis`, `MorphPhase`).

### What should never live here

- A `<Lightbox>` component (composition is product).
- A `<Gallery>` or `<Grid>` component (product surface).
- An image element abstraction (forces a single render strategy on both systems).
- Theming tokens (no overlap between consumers).
- Anything that imports `next/image`, `next/link`, `@prisma/client`, `next-auth`, or any Azure SDK.
- Anything that knows route paths or search-param names.

### What should stay app-specific forever

- All page chrome.
- All gallery composition and grid layouts.
- All data wiring (favourites, selection, deep-linking, info panels, face graph, admin endpoints).
- All theming.
- All proxy / API routes.

### Versioning posture

- Internal-stable, semver-strict. Any change to a hook signature is a major.
- Avoid peer-dependencies on React or Next.js majors in the package itself; declare ranges (`react: ">=18 <20"`).
- Both consumers pin exact versions and upgrade deliberately.
- Provide a changelog with explicit rationale per change — this package's value is its predictability, not its feature growth.

---

## 11. Final Recommendations

1. **Treat the systems as different products.** Blackburn is interaction innovation. Vic Country is production gallery infrastructure. Neither should adopt the other's posture wholesale.

2. **Migrate techniques, not components.** The unit of transfer is a hook, a constant, a CSS transition, a tuning value — never a `<Lightbox>` or `<Gallery>`.

3. **Start with Phase 1.** Six small changes inside one Vic Country file, plus one new hook file. Each is independently shippable. Each is reversible. Together they close the most visible quality gaps (scroll-position loss, no preload, no reduced motion, no focus trap, weak swipe).

4. **Defer the shared package indefinitely.** Two consumers do not justify a package. Three would. Until then, copy between the two repos with comments referencing the source — the cost of duplication is bounded; the cost of premature abstraction over a sample of two is not.

5. **Defer the morph indefinitely.** Vic Country's open path is currently size-unstable, the click site does not capture geometry, and the source image has no LQIP. A morph here would either re-architect everything or feel worse than the current instant mount. Pilot the View Transitions API as the lighter alternative when this becomes a priority.

6. **Compose, do not inherit.** The right way for Vic Country to gain Blackburn's gesture system is to *call* `useLightboxGestures(...)` and render its own slides — not to replace its Lightbox with Blackburn's. Hooks compose; component hierarchies do not.

7. **Extract primitives, not gallery systems.** The four hooks (scroll lock, reduced motion, focus trap, gestures) and a constants file are the export surface that survives. Anything larger is product.

8. **Close the cross-cutting accessibility gaps in both systems first.** Focus trap, focus restore, `inert`/`aria-hidden` on background. These are the highest leverage for the smallest risk and are unblocked by everything else on the roadmap.

### Long-term strategy

- Maintain the architectural distinction between **interaction layer**, **data layer**, and **gallery product layer**. Mixing them is what makes Vic Country's `Lightbox.tsx` 528 LOC; keeping them separable is what allows Blackburn's gallery to be ~600 LOC for the same surface area.
- Treat **constants of "feel"** as taste-tuned, not generic. Re-tune them per design surface; do not blindly copy Blackburn's gesture constants into a sports-photo context without a second tuning pass.
- Treat **the shared package** (if it ever exists) as a contract, not a convenience. Its value is its stability.
- Treat **the data layer** as inviolate during interaction work. Phase 1 and Phase 2 must not touch Prisma, the image proxy, or the deep-link contract beyond what is strictly required.

### Risk assessment

| Risk                                                | Severity | Mitigation                                                          |
| --------------------------------------------------- | -------- | ------------------------------------------------------------------- |
| Premature abstraction into shared package           | High     | Gate Phase 3 on third consumer. Resist convenience refactors.       |
| Adopting Blackburn morph into Vic Country too early | High     | Defer until Phase 2 + placeholder source + viewport stability       |
| Cargo-culting gesture constants                     | Medium   | Re-tune per design surface; document tuning sessions                |
| Regressing deep-link contract during Phase 2        | Medium   | Keep the writer at the top-level Lightbox; integration test         |
| Adding motion before reduced-motion branch          | Medium   | Phase 1 ordering: `useReducedMotion` ships before backdrop fade     |
| Unilateral React / Tailwind upgrade for sharing     | Medium   | Defer until each host has its own reason to upgrade                 |
| Lightbox refactor that breaks face-tag mode         | Medium   | Move tagging as a single unit; preserve API surface                 |
| Scroll-lock change causing scroll-position drift on other modals | Low | Audit for other body-locking code in Vic Country before merging |
| Focus-trap interfering with screen-reader tooling   | Low      | QA with NVDA/JAWS/VoiceOver before merging                          |

### Anti-patterns to avoid

- **"Just extract the Lightbox into a package."** It is product, not primitive.
- **"Standardise both repos on React 19 + Tailwind v4."** Sharing is not worth this.
- **"Make Vic Country use `next/image`."** It would force a renegotiation of the image proxy contract.
- **"Add LQIP to Vic Country in the Lightbox."** LQIP belongs in the ingestion pipeline.
- **"Rewrite Vic Country's Lightbox before Phase 1."** Phase 1 demonstrates demand for further investment; without it, the rewrite is unfunded.
- **"Build a shared `<Gallery>` that supports both static and dynamic data."** This is the abstraction that swallows everything; resist.

### Promote

- **Composition.** Hooks compose. JSX composes. Class hierarchies and component "extension" do not.
- **Primitive extraction.** Small, opinion-free, framework-light pieces.
- **Staged evolution.** Each phase has natural off-ramps. Stop at any phase that is no longer paying for itself.
- **App-owned product layers.** The gallery is the product. The product is owned by the app. The app owns its destiny.

---

_End of document._
