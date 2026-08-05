# UnlockPi — Brand & UI Guideline

This is the one place that decides how our UI looks. If you're building or
changing any screen, read this first. Follow it and you will never have to guess
which color, border, or shadow to use again.

**The golden rule:** our palette is **neutral greys + one red**. Visual interest
comes from **depth (stacking light/dark greys)** and **using red sparingly** —
never from adding new colors. If a screen looks flat, you are under-using the
grey ladder, not missing a color.

---

## 1. The tokens (the only colors you may use)

Always use these **semantic token classes** (`bg-card`, `text-muted-foreground`,
`border-border`…). **Never** use raw Tailwind colors (`bg-gray-800`,
`text-green-500`) or hex values in components. Tokens automatically flip between
light and dark mode; raw colors do not, and they break one of the two themes.

| Token | `bg-` / `text-` / `border-` | What it's for |
| --- | --- | --- |
| `background` | page background | the base layer, level 0 |
| `foreground` | primary text | default text color |
| `card` | raised surfaces | cards, panels, popovers (level 1) |
| `popover` | floating surfaces | menus, dropdowns, tooltips |
| `muted` | inset wells | code blocks, input fills, skeletons (level 2) |
| `muted-foreground` | secondary text | captions, hints, labels, icons |
| `secondary` | subtle fills | quiet chips/badges |
| `accent` | hover fills | hover state of rows/cards (level 3) |
| `border` | hairlines | all structural borders |
| `input` | form borders | borders of inputs/selects |
| `ring` | focus glow | focus rings (red, used at low opacity) |
| `primary` | brand red | primary CTA, selected/active state |
| `destructive` | deep red | delete / error only |
| `success` | green | success status only |
| `warning` | amber | warning status only |

> `success`, `warning`, and a distinct `destructive` were added specifically so
> you never hardcode `green-500` / `amber-400` again. Use them.

---

## 2. Depth: the elevation ladder

Depth comes from **stepping through greys**, not from shadows-everywhere or
color. Each level is one step lighter/darker than the one it sits on.

```
level 0  page            bg-background
level 1  card / panel     bg-card        (+ border-border + shadow-xs/5)
level 2  inset well       bg-muted/40    (code, input bg, skeleton, nested box)
level 3  hover            hover:bg-accent
   *     selected/active  bg-primary/8 + border-primary/40 + text-primary
```

### ✅ Do
- Nest surfaces by going **up the ladder**: a well inside a card is
  `bg-muted/40`, not another `bg-card`.
- Give cards a hairline **and** a whisper of shadow: `border border-border shadow-xs/5`.
- On hover of a clickable surface, step to `hover:bg-accent` (don't recolor).

### ❌ Don't
- Don't put `bg-card` directly on `bg-card` with no border or step — they merge
  and look flat (this is our #1 flatness bug).
- Don't reach for a new color to separate two things. Change **elevation**.
- Don't stack heavy `shadow-lg` everywhere to fake depth. One subtle shadow +
  the grey step is enough.

---

## 3. Focus rings (the most common mistake)

Our `ring` token is **red**, so a full-opacity ring is a loud red halo. Never do
that. Use the soft recipe — a 3px ring at 24% opacity plus a border tint.

### ✅ Do
```html
<!-- Easiest: the shared utility -->
<button class="... focus-ring">…</button>

<!-- Or the explicit classes (identical result) -->
<button class="... outline-none focus-visible:ring-[3px] focus-visible:ring-ring/24 focus-visible:border-ring">
```

### ❌ Don't
```html
<!-- Harsh red halo. Never. -->
<button class="focus-visible:ring-2 focus-visible:ring-ring">
```

For inputs and selects, **just use the coss `<Input>` / `<Select>` primitives** —
they already have the correct soft ring, border, and bevel. Don't rebuild them.

---

## 4. Borders — three weights, nothing else

| Purpose | Class |
| --- | --- |
| Structural hairline (default) | `border-border` |
| Form control border | `border-input` |
| Emphasis / selected | `border-primary/40` |

### ❌ Don't
- Don't use `border-white/10`, `border-black/20`, or arbitrary opacities. Use
  `border-border`. It's already tuned for both themes.

---

## 5. The red budget (this keeps the app from looking "shouty")

Red = **primary CTA**, **current/selected state**, or **true destructive**.

### ✅ Do
- At most **~one red element per view at rest**. Red draws the eye — spend it on
  the one thing you want clicked.
- Selected state: `bg-primary/8 border-primary/40 text-primary` (tinted, not solid).

### ❌ Don't
- Don't use red for resting borders or resting rings.
- Don't make two things in the same cluster red — one of them is wrong.
- Don't use `destructive` for anything that isn't delete/error. It's a different
  red on purpose.

---

## 6. Status colors

Use the semantic tokens, as a **tint** (10% fill + solid text + soft border):

| State | Recipe |
| --- | --- |
| Success | `bg-success/10 text-success border-success/30` |
| Warning | `bg-warning/10 text-warning border-warning/30` |
| Error | `bg-destructive/10 text-destructive border-destructive/30` |
| Neutral / info | `bg-muted text-muted-foreground border-border` |

### ❌ Don't
```html
<!-- Hardcoded, breaks theming, not our palette -->
<span class="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
<span class="bg-amber-400"></span>
```

---

## 7. Copy-paste recipes

**Card / panel**
```html
<div class="rounded-2xl border border-border bg-card shadow-xs/5 p-4">
```

**Inset well (code block, nested box, skeleton container)**
```html
<div class="rounded-lg border border-border bg-muted/40 p-2.5">
```

**Clickable chip / option card**
```html
<button class="rounded-xl border border-border bg-card p-2.5 transition-colors
               hover:bg-accent focus-ring
               aria-pressed:border-primary/40 aria-pressed:bg-primary/8 aria-pressed:text-primary">
```

**Text hierarchy**
```html
<p class="text-sm text-foreground">Primary text</p>
<p class="text-sm text-muted-foreground">Secondary / hint text</p>
<p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Section label</p>
```

---

## 8. Quick reference cheat sheet

| I'm building… | Background | Border | Hover | Focus |
| --- | --- | --- | --- | --- |
| Page card / panel | `bg-card` `shadow-xs/5` | `border-border` | — | — |
| Nested well | `bg-muted/40` | `border-border` or none | — | — |
| Input / select | *use coss primitive* | `border-input` | — | soft ring (built-in) |
| Clickable chip / card | `bg-card` | `border-border` | `bg-accent` | `focus-ring` |
| Selected chip / card | `bg-primary/8` | `border-primary/40` | — | `focus-ring` |
| Primary button | `bg-primary` | — | — | `focus-ring` |
| Success/Warning/Error | `bg-{token}/10` | `border-{token}/30` | — | — |

---

## 9. Reviewer checklist (before you open a PR)

- [ ] No raw Tailwind colors (`gray-`, `green-`, `blue-`, `amber-`…) or hex in
      components. Only semantic tokens.
- [ ] No `focus-visible:ring-ring` at full opacity. Use `focus-ring`.
- [ ] Cards are distinguishable from the page (border + `shadow-xs/5`, and a grey
      step when nested).
- [ ] At most one red element per view at rest.
- [ ] Nested surfaces step through the ladder (`card` → `muted` → `accent`), not
      `card` on `card`.
- [ ] Checked in **both** light and dark mode.

The reference implementation of every rule here lives on **`/dashboard/visuals`** —
when in doubt, copy how that page does it.
