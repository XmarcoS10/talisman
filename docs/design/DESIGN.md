---
name: Talisman Football Manager
colors:
  surface: '#0f131d'
  surface-dim: '#0f131d'
  surface-bright: '#353944'
  surface-container-lowest: '#0a0e18'
  surface-container-low: '#171b26'
  surface-container: '#1c1f2a'
  surface-container-high: '#262a35'
  surface-container-highest: '#313540'
  on-surface: '#dfe2f1'
  on-surface-variant: '#b9cbbd'
  inverse-surface: '#dfe2f1'
  inverse-on-surface: '#2c303b'
  outline: '#849588'
  outline-variant: '#3b4a3f'
  surface-tint: '#00e38f'
  primary: '#cdffdc'
  on-primary: '#003920'
  primary-container: '#00f59b'
  on-primary-container: '#006b41'
  inverse-primary: '#006d42'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#fff1e4'
  on-tertiary: '#472a00'
  tertiary-container: '#ffce95'
  on-tertiary-container: '#835200'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#53ffab'
  primary-fixed-dim: '#00e38f'
  on-primary-fixed: '#002111'
  on-primary-fixed-variant: '#005231'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0f131d'
  on-background: '#dfe2f1'
  surface-variant: '#313540'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.04em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-compact: 0.5rem
  margin: 1.5rem
  margin-mobile: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.875rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system delivers a high-performance tactical workbench engineered for elite virtual football tacticians, analysts, and sporting directors. Inspired by cutting-edge sports analytics suites (StatsBomb, Wyscout) and the sleek, immersive darkness of modern stadium floodlights, the aesthetic fuses **glassmorphism** with **dense, high-precision technical data architecture**.

The emotional signature is cool, authoritative, and tactically surgical. Interfaces must never feel like standard administrative software; rather, they echo an elite esports war-room or an analytical cockpit at an international sporting arena. 

Key visual principles:
- **Atmospheric Obsidian Substrates:** Deep navy-slate and pitch-side night blacks establish infinite visual depth, letting vibrant tactical markers pop with luminescence.
- **Electric Vector Accents:** Neon mints, tactical teals, and intense cyber-cyans indicate high ratings, passing vectors, pressing zones, and critical momentum changes.
- **High-Density Information Architecture:** Clear spatial stratification that displays deep tactical data, attribute grids, and event feeds cleanly without visual clutter.

## Colors

The palette operates in a permanent default dark mode configured specifically for prolonged tactical sessions, night matches, and low eye fatigue.

### Palette Breakdown
- **Pitch Obsidian (Neutral Base - `#0B0F19`):** The foundational canvas color. Emulates stadium twilight and provides maximum contrast for analytics.
- **Tunnel Slate (Surface Containers - `#111827`, `#1A2234`, `#243048`):** Layered card surfaces, popovers, and side navigation. Tiered progressively to create optical elevation.
- **Electric Emerald / Mint (Primary - `#00F59B` / `#10B981`):** Represents optimal performance, world-class attributes (16–20), completed passes, positive xG deltas, and primary call-to-actions.
- **Tactical Cyan (Secondary - `#06B6D4`):** Represents playmaker paths, tactical instructions, assist indicators, and secondary metric filters.
- **Match Warning Amber (Tertiary - `#F59E0B`):** Represents caution, yellow cards, fitness degradation (60–75%), and moderate ratings (11–15).
- **Stoppage Crimson (System Negative - `#EF4444`):** Indicates red cards, injuries, severe fatigue (<60%), critical defensive errors, and low ratings (1–7).
- **Pitch Turf Spectrum (`#143823`, `#1E4D30`, `#275D3B`):** Specific muted tactical greens dedicated purely to rendering pitch grass zones without clashing against player markers.

## Typography

The typographic hierarchy harmonizes technical analysis with managerial authority:

- **Display & Headings (Space Grotesk):** Delivers a geometric, futuristic sports-broadcast feel. Used for match scores, club titles, screen banners, and major tactical headers.
- **Interface & Text (Hanken Grotesk):** A crisp, neutral workhorse sans-serif offering maximum legibility at compact body sizes across player profiles, inbox communiques, scout dispatches, and table cells.
- **Data & Telemetry (JetBrains Mono):** Dedicated to tabular numbers, player positions (GK, DC, MC, ST), kit numbers, match minute timers (`90'+4`), match ratings (`7.4`), and condition percentages. Monospaced tabular alignment ensures columns never shift during real-time match simulations.

## Layout & Spacing

The layout model uses a multi-tier modular dashboard architecture optimized for high data density.

### Grid & Structure
- **Sidebar-Docked Workspace:** A persistent primary rail (64px collapsed, 240px expanded) anchored to the left, containing club navigation (Squad, Tactics, Data Hub, Scouting, Transfers, Finance).
- **Matchday Split-Canvas:** When the 2D/3D match engine is active, the pitch occupies a flexible central viewport flanked by tactical sidebars (4:6 or 5:5 split), collapsing into floating drawer panels on narrower displays.
- **Rhythm & Padding:** Uses a strict 4px/8px modular scale. Spacing within player rating tables and line-up sheets defaults to `space-xs` and `space-sm` to maintain high vertical information capacity. Sectional metric cards utilize `space-md` internally.
- **Breakpoints:**
  - **Desktop Large (≥1680px):** 3-to-4 column modular panels with simultaneous pitch view, stats drawer, and live commentary.
  - **Desktop Compact (1280px - 1679px):** 2-to-3 column view with tabbed analytics.
  - **Tablet/Laptop (1024px - 1279px):** Collapsed tactical pitch with toggleable stat trays.
  - **Handheld/Mobile (<1024px):** Single-column stack with bottom floating tactical action controls.

## Elevation & Depth

Visual depth is achieved through layered dark glass surfaces, structural luminescence, and subtle rim lighting rather than muddy drop shadows.

- **Level 0 (Turf & Canvas):** Pitch Obsidian (`#0B0F19`). Solid, non-interactive base substrate.
- **Level 1 (Data Cards & Pitch Containers):** Semi-opaque background (`rgba(17, 24, 39, 0.75)`) layered over a `12px` backdrop blur with an ultra-fine border (`1px solid rgba(255, 255, 255, 0.08)`).
- **Level 2 (Popovers, Match Highlights, Floating Trays):** Elevated glass (`rgba(26, 34, 52, 0.88)`), backdrop blur `20px`, bordered by `1px solid rgba(255, 255, 255, 0.14)` and a tinted rim glow (`box-shadow: 0 8px 32px -4px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(6, 182, 212, 0.15)`).
- **Level 3 (Tactical Modals & Pitch Token Focus):** Active tactical token overlays and full-screen modals carry an intense tactical neon aura: `box-shadow: 0 0 24px rgba(0, 245, 155, 0.25)`.

## Shapes

The design system maintains balanced corner curvatures (8px on default elements, 16px on structural cards) to reconcile a modern consumer game feel with professional analytical precision.

- **Standard Cards & Modals:** Standardized at `0.5rem` (`rounded-md`) to `1rem` (`rounded-lg`), delivering clean, organized partitions for dense data tables.
- **Tactical Pitch Markers & Player Discs:** Pure circles (`9999px` / full pill) with high-contrast inner border strokes (`2px` solid white or contrast ring) to stand out against pitch grass stripes.
- **Tactical Role Badges (e.g., `B2B`, `IF`, `DLP`):** Truncated pills with `0.25rem` corners to fit within compact tabular columns.

## Components

### Buttons & Match Controllers
- **Match Play/Pause Controller:** Pill-shaped glass container holding neon action buttons. Active pause/play buttons feature glowing state indicators (`#00F59B` with soft pulse).
- **Primary Action (Continue / Confirm Tactics):** Electric emerald background (`#00F59B`), rich dark obsidian text (`#0B0F19`), bold weights, subtle internal radial glow on hover.
- **Secondary Buttons:** Translucent slate (`rgba(255, 255, 255, 0.06)`), 1px border (`rgba(255, 255, 255, 0.12)`), text rendered in `#F3F4F6`.

### Tactical Pitch Graphic
- **Pitch Surface:** Alternating vertical mower-stripe turf bands (`#143823` and `#1A452B`). Boundary and penalty marks rendered in semi-translucent crisp white (`rgba(255, 255, 255, 0.45)`).
- **Player Dots/Pins:** Dual-layered tokens. The core circle shows player jersey numbers in `JetBrains Mono` bold. Outer perimeter shows a dynamic dual-arc condition ring: green for fitness %, cyan for tactical familiarity.
- **Passing & Movement Arrows:** Curved vector paths using bright fluorescent strokes (`#00F59B` forward movement, `#06B6D4` overlapping runs, `#F59E0B` defensive tracking) with distinct SVG arrowhead terminals.

### Metric Cards & Radar Graphs
- **Condition & Match Rating Chips:** Color-coded badges with dynamic backgrounds:
  - 8.0+: Emerald Glow (`#00F59B` text, `rgba(0, 245, 155, 0.15)` background).
  - 6.8–7.9: Slate Cyan (`#38BDF8` text, `rgba(56, 189, 248, 0.1)` background).
  - 6.0–6.7: Neutral Gray (`#94A3B8` text, `rgba(148, 163, 184, 0.1)` background).
  - <6.0: Crimson Alert (`#EF4444` text, `rgba(239, 68, 68, 0.15)` background).
- **Octagonal Radar / Polygon Graphs:** Translucent polygon fills (`rgba(0, 245, 155, 0.2)`) with a high-contrast neon perimeter line (`#00F59B`), overlaid on concentric octagonal reference rings.

### Data Tables (Squad & Fixture Grids)
- Compact row height (36px). Alternating zebra striping via subtle alpha shifts (`rgba(255, 255, 255, 0.02)`).
- Sticky columns for position tags (`GK`, `DC`, `ST`) and player name, allowing horizontal scroll on dense attribute grids (Pace, Vision, Composure, etc.).
- Sort indicators: Minimal dual-chevron icons with active neon tinting.

### Form Inputs & Dropdowns
- Dark matte inputs (`#111827`) with inset borders (`rgba(255, 255, 255, 0.1)`). On focus: border changes to `#06B6D4` with a 2px outer cyan bloom.