---
name: AdaptFit
description: Calm, movement-aware fitness guidance that keeps every body in control.
colors:
  cloud-canvas: "oklch(0.985 0.008 278)"
  clear-surface: "oklch(0.995 0.004 278)"
  lavender-mist: "oklch(0.965 0.022 278)"
  lavender-layer: "oklch(0.936 0.039 278)"
  grounded-ink: "oklch(0.235 0.028 278)"
  steady-muted: "oklch(0.55 0.026 278)"
  quiet-line: "oklch(0.9 0.018 278)"
  strong-line: "oklch(0.65 0.038 278)"
  active-periwinkle: "oklch(0.62 0.12 276)"
  action-periwinkle: "oklch(0.52 0.15 276)"
  pressed-periwinkle: "oklch(0.47 0.14 276)"
  selected-lavender: "oklch(0.93 0.05 276)"
  capable-green: "oklch(0.68 0.12 153)"
  attentive-amber: "oklch(0.7 0.13 56)"
  clear-danger: "oklch(0.53 0.15 22)"
typography:
  display:
    fontFamily: "Avenir Next, Avenir, Segoe UI, system-ui, sans-serif"
    fontSize: "2.35rem"
    fontWeight: 700
    lineHeight: 1.03
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Avenir Next, Avenir, Segoe UI, system-ui, sans-serif"
    fontSize: "1.45rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Avenir Next, Avenir, Segoe UI, system-ui, sans-serif"
    fontSize: "1.06rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Avenir Next, Avenir, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Avenir Next, Avenir, Segoe UI, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 750
    lineHeight: 1.25
    letterSpacing: "0.1em"
rounded:
  sm: "12px"
  control: "14px"
  field: "16px"
  md: "18px"
  nav: "20px"
  lg: "26px"
  pill: "999px"
spacing:
  compact: "0.5rem"
  control: "0.75rem"
  content: "1rem"
  section: "1.5rem"
  generous: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.action-periwinkle}"
    textColor: "{colors.clear-surface}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1.25rem"
    height: "3.25rem"
  button-secondary:
    backgroundColor: "{colors.clear-surface}"
    textColor: "{colors.action-periwinkle}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1.25rem"
    height: "3.25rem"
  search-field:
    backgroundColor: "{colors.clear-surface}"
    textColor: "{colors.grounded-ink}"
    rounded: "{rounded.field}"
    padding: "0 1rem"
    height: "3.35rem"
  selection-chip:
    backgroundColor: "{colors.clear-surface}"
    textColor: "{colors.steady-muted}"
    rounded: "{rounded.pill}"
    padding: "0.48rem 0.9rem"
    height: "2.75rem"
  surface-card:
    backgroundColor: "{colors.clear-surface}"
    textColor: "{colors.grounded-ink}"
    rounded: "{rounded.md}"
  bottom-navigation:
    backgroundColor: "{colors.clear-surface}"
    textColor: "{colors.steady-muted}"
    rounded: "{rounded.nav}"
    padding: "0.5rem"
---

# Design System: AdaptFit

## Overview

**Creative North Star: "The Capable Companion"**

The Capable Companion treats every screen like a clear spotter standing beside the user: composed, attentive, and never intrusive. A pale violet atmosphere and grounded ink create calm without slipping into clinical white or generic wellness pastels. The geometry is softly engineered, with generous breathing room, compact controls, crisp line art, and one decisive periwinkle action voice.

The system is task-first and quietly adaptive. A focused mobile column expands into purposeful analytics arrangements; critical choices remain obvious at 320px, and keyboard focus remains unmistakable. Motion confirms state and then gets out of the way. Compatibility is explained with language and iconography, never color alone.

**Key Characteristics:**

- Restrained periwinkle, tinted neutrals, and plain-language semantic colors.
- Strong, geometric hierarchy with calm body copy and generous line spacing.
- Mobile-first layouts that become wider compositions without changing the task model.
- Forgiving 44px or larger controls, visible focus, and equally clear camera-free paths.
- Purposeful illustration, anatomy, and activity visuals with honest data provenance.

## Colors

The palette is a cool, restrained field of clouded violet neutrals with one confident periwinkle voice and plainly differentiated semantic states.

### Primary

- **Active Periwinkle** (`colors.active-periwinkle`): selected filters, meaningful progress marks, and secondary emphasis.
- **Action Periwinkle** (`colors.action-periwinkle`): primary buttons, strong links, active navigation, and focus-adjacent emphasis.
- **Selected Lavender** (`colors.selected-lavender`): selected rows, chips, icon wells, and low-pressure callouts.

### Secondary

- **Capable Green** (`colors.capable-green`): confirmed compatibility and successful completion.
- **Attentive Amber** (`colors.attentive-amber`): cautions that need review without implying prohibition.
- **Clear Danger** (`colors.clear-danger`): destructive actions, hard incompatibility, and validation failures.

### Neutral

- **Cloud Canvas** (`colors.cloud-canvas`): the atmospheric page background.
- **Clear Surface** (`colors.clear-surface`): cards, controls, and navigation surfaces.
- **Lavender Mist** (`colors.lavender-mist`): quiet controls and secondary layers.
- **Lavender Layer** (`colors.lavender-layer`): skeletons and stronger tonal separation.
- **Grounded Ink** (`colors.grounded-ink`): headings, core instructions, and high-priority data.
- **Steady Muted** (`colors.steady-muted`): supporting copy that still meets text contrast.
- **Quiet Line** and **Strong Line** (`colors.quiet-line`, `colors.strong-line`): structural boundaries and focused control edges.

**The One Voice Rule.** Periwinkle is reserved for primary actions, selection, and progress state. It must never become decorative wallpaper.

## Typography

**Display Font:** Avenir Next, with Avenir, Segoe UI, and system sans fallbacks

**Body Font:** Avenir Next, with Avenir, Segoe UI, and system sans fallbacks

**Label Font:** Avenir Next, with Avenir, Segoe UI, and system sans fallbacks

**Character:** One warm geometric sans keeps the product familiar and capable. Weight and scale, not competing typefaces, create the hierarchy.

### Hierarchy

- **Display** (700, 2.35rem, 1.03): primary page and completion headings; reduce to 2rem below 540px.
- **Headline** (700, 1.45rem, 1.15): card groups, analytics sections, and workflow stages.
- **Title** (700, 1.06rem, 1.2): exercise names, metric groups, and local component headings.
- **Body** (400, 1rem, 1.55): instructions and explanatory copy, capped near 68ch.
- **Label** (750, 0.75rem, 0.1em): short uppercase eyebrows only; ordinary controls use sentence case.

**The Grounded Type Rule.** Lead with a bold task, then one calm sentence. Never stack multiple display treatments or let analytics labels shrink below 0.75rem.

## Elevation

Depth is ambient, not theatrical. Tonal layers and one-pixel cool borders do most of the work; shadows clarify floating navigation, media cards, and actionable surfaces without turning the interface glossy.

### Shadow Vocabulary

- **Ambient Low** (`0 2px 10px oklch(0.31 0.03 278 / 0.06)`): default cards, fields, and compact surfaces.
- **Ambient Raised** (`0 14px 35px oklch(0.31 0.04 278 / 0.09)`): persistent navigation and genuinely floating controls.
- **Action Lift** (`0 9px 20px oklch(0.58 0.13 276 / 0.22)`): primary buttons only, increasing gently on hover.

**The Ambient Depth Rule.** If the shadow is the first thing noticed, it is too dark. Borders and tonal change establish structure before elevation does.

## Components

### Buttons

- **Shape:** firm rounded rectangle (`rounded.control`, 14px) with a 3.25rem default height and no smaller than 44px in compact contexts.
- **Primary:** Action Periwinkle with near-white tinted text and confident horizontal padding.
- **Hover / Focus:** a one-pixel lift over 180ms, darker pressed color, and a three-pixel visible focus outline.
- **Secondary / Tertiary / Danger:** outlined surface, quiet transparent action, and semantic danger tint respectively. Loading replaces the icon, disables repeat input, and exposes busy state.

### Chips

- **Style:** pill shape (`rounded.pill`) with a clear surface, strong cool border, and at least 44px height.
- **State:** selection uses Selected Lavender, Action Periwinkle text, and a stronger border. Never rely on the color change without `aria-pressed` or adjacent text.

### Cards / Containers

- **Corner Style:** gently curved (`rounded.md`, 18px), with 26px reserved for large hero or camera surfaces.
- **Background:** Clear Surface over Cloud Canvas, with Lavender Mist for nested control groups rather than nested cards.
- **Shadow Strategy:** Ambient Low at rest; Ambient Raised only when the element genuinely floats.
- **Border:** one-pixel Quiet Line; semantic panels may use a matching tinted full border.
- **Internal Padding:** 1rem for compact content and 1.5rem to 2rem for task sections.

### Inputs / Fields

- **Style:** 3.35rem high Clear Surface with a one-pixel Strong Line and 16px corner radius.
- **Focus:** Action Periwinkle edge plus a soft three-pixel lavender ring.
- **Error / Disabled:** semantic copy appears beside the field; disabled states reduce contrast without hiding the value.

### Navigation

Mobile navigation floats above the safe area as a five-part rounded rail. The active item uses Selected Lavender and Action Periwinkle; the central Build action is circular and visually stronger. At desktop widths, the same rail moves to the top center so it never covers analytics while scrolling.

### Compatibility and Body Map

Interactive anatomy labels pair focus or avoid color with explicit words and a movement-region name. Compatibility surfaces always provide a reason, a safer adaptation, and a route back to browsing. A hard incompatibility cannot be overridden.

## Do's and Don'ts

### Do:

- **Do** keep primary controls at least 44px high with a three-pixel visible focus outline.
- **Do** use Action Periwinkle for the next meaningful action and Selected Lavender for reversible selection.
- **Do** pair every metric with its period, provenance, or plain-language meaning.
- **Do** preserve an equally clear camera-free workout path and stop media tracks when that path is chosen.
- **Do** let mobile screens breathe, then use wider desktop grids only when relationships become easier to compare.
- **Do** use full borders, tinted backgrounds, leading icons, and explicit status words for callouts.

### Don't:

- **Don't** create hospital and rehabilitation-software aesthetics; the product is supportive general wellness, not a clinical chart.
- **Don't** use macho or punishment-oriented fitness language or visuals.
- **Don't** fall into generic pastel SaaS dashboards; every lavender surface must communicate state or structure.
- **Don't** show dense analytics without plain-language meaning, time scope, and provenance.
- **Don't** build interfaces that assume every body moves the same way.
- **Don't** present camera tracking as mandatory or compatibility guidance as a diagnosis.
- **Don't** use colored side-stripe borders, gradient text, decorative glassmorphism, or a generic hero-metric template.
- **Don't** animate layout, add bounce, or choreograph page loads; motion must explain state.
