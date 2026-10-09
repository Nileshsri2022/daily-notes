# DiaryNotes Editorial Redesign — Design Spec

Date: 2026-10-08

## Intent

A full visual redesign of DiaryNotes (Expo / React Native, web + Android + iOS) into a calm, editorial, Medium-inspired reading and writing experience.

**Agreed by the user**
- Scope: every screen gets restyled.
- Mood: calm and editorial.
- Light mode only.
- Typography: serif headings, sans body.
- Accent: muted forest green.
- Home feed layout: Medium-style list (single column, hairline dividers).

**Assumptions (not explicitly stated)**
- Features and the Clerk/Convex backend are unchanged. Front end only.
- The existing 720px content width stays.

**Success criteria**
- All screens share one coherent paper / serif / green look.
- No functional regressions (search, tags, pinning, autosave, dictation, cover upload, trash, auth).
- Lint and the TypeScript check pass.
- Every screen is verified visually on web at phone and desktop widths.

## Approach

Design tokens first, then screen by screen. All styling flows from [theme.ts](../../../src/constants/theme.ts), which [theme-provider.tsx](../../../src/theme/theme-provider.tsx) maps to CSS variables used by NativeWind. Token names stay the same so components do not break. Only values change.

## 1. Design tokens

**Colors** (names in `colors` unchanged):

| Token | New value |
|---|---|
| canvas | `#FAF6EE` |
| surfaceCard | `#FFFDF8` |
| surfaceSoft | `#F1EBDD` |
| surfaceCreamStrong | `#EAE2D0` |
| ink, bodyStrong | `#1F1D1A` |
| body | `#4A443B` |
| muted | `#6F685B` |
| mutedSoft | `#8A8274` (placeholders only) |
| hairline | `#E6DFCF` |
| primary | `#3F6B4F` |
| primaryActive | `#2F5440` |
| primaryDisabled | `#BFD0C3` |
| onPrimary | `#FFFFFF` |
| error | `#A63D2F` |
| surfaceDark | `#2A2723` |
| onDark | `#FAF6EE` |

**Contrast on `#FAF6EE` (WCAG AA needs 4.5:1 for small text):**
- `muted` `#6F685B`: about 5.1:1. The earlier `#8A8274` was only about 3.5:1 and failed for small meta text such as dates and the autosave status.
- `primary` `#3F6B4F`: about 5.7:1, and white text on it is about 6:1.
- `error` `#A63D2F`: about 5.8:1.
- `primaryDisabled` is exempt as a disabled control.

**Decided from a usage grep of `src/`:**
- Removed because nothing uses them: `accentTeal`, `accentAmber`, `success`, `warning`, `hairlineSoft`, `onDarkSoft`, `surfaceDarkElevated`, `surfaceDarkSoft`.
- Kept and recolored (used by `editor.tsx`): `surfaceDark` `#2A2723` and `onDark` `#FAF6EE` (cover-remove button), and `mutedSoft` `#8A8274`.
- `mutedSoft` is for placeholders only. The mic hint in `editor.tsx` (`micHint`) is real text, so it switches to `muted`.
- `ThemeColors` derives from the `colors` keys, so removing keys needs no other type change. The plan step must re-grep before deleting.

**Typography**
- Serif (Lora) for `displayLg`, `displayMd`, `displaySm`, `titleMd`, and note titles.
- Sans (Inter) for body, buttons, chips, and meta text.
- Slightly larger reading size and line height for note bodies.
- **One family per weight.** Android cannot combine a custom `fontFamily` with `fontWeight`, so the `type` tokens drop `fontWeight` and name a family instead. Weights loaded (via `@expo-google-fonts/lora` and `@expo-google-fonts/inter`):
  - `Lora_600SemiBold` (display and note titles)
  - `Lora_700Bold` (bold inside serif headings)
  - `Inter_400Regular` (body)
  - `Inter_400Regular_Italic` (emphasis, blockquotes)
  - `Inter_500Medium` (buttons, chips, captions)
  - `Inter_600SemiBold` (bold in body text)
- **Loading is part of step 1.** The root layout calls `useFonts` and holds the splash screen (`expo-splash-screen`) until fonts are ready, so no later step shows unstyled text.
- Body text inside notes (`react-native-markdown-display`, `react-native-render-html`) must name these families explicitly, since they do not inherit from the tokens.

**Shape**
- Pills for chips and primary buttons.
- Gentler radius for cards and inputs.
- Hairline dividers instead of heavy borders and shadows.

**Light only, enforced (step 1)**
- `app.json`: change `userInterfaceStyle` from `"automatic"` to `"light"`, so system dark mode cannot leak into the keyboard, status bar, or native controls.
- Web: add `color-scheme: light` to `src/global.css` (plus `<meta name="color-scheme" content="light">` in the web head) so browser form controls and scrollbars stay light.
- `app.json` splash `backgroundColor` changes from `#208AEF` to `#FAF6EE` so the splash matches the paper color.
- `tailwind.config.js` keeps `darkMode: "class"` (required by react-native-css-interop on web) and no `dark:` variants are added.

## 2. Shared components and home feed

**`components/ui`**
- Button: fully rounded pill, sans text. Outline and ghost variants use hairline and beige.
- Badge: small green text label, not a filled box.
- Input: rounded cream field, soft hairline, green focus ring.
- Card: kept, but no longer used for feed rows.

**Home feed** ([index.tsx](../../../src/app/index.tsx))
- Rows with hairline dividers.
- Each row: meta line (green "Pinned" if pinned, short date like "Oct 5", draft/published label), serif title, two-line sans excerpt, small cover thumbnail on the right when present.
- Replace the 📌 emoji with the green "Pinned" label.
- Replace `toLocaleString()` with a friendly short date.
- Serif "Notes" header above the search field.
- Pill tag chips, active chip filled green.
- Floating new-note button kept, in green.
- Friendly serif empty and loading states.
- Search, tag filtering, pin sorting, and navigation logic are untouched.

## 3. Read view and editor

**Read view** ([note/[id].tsx](../../../src/app/note/%5Bid%5D.tsx))
- Full-width cover with gentle rounded corners.
- Large serif title.
- Meta line: short date, green "Pinned" label if applicable, draft/published.
- Small green-outline tag pills.
- Quiet action row (Edit, Pin, Publish, Delete). Delete in muted brick red.
- Body styled via [markdown-view.tsx](../../../src/components/markdown-view.tsx) and [html-view.tsx](../../../src/components/html-view.tsx), so markdown and rich-text notes look the same.
- Body: generous line height and paragraph spacing, serif headings, green blockquote rule, green links, code on soft beige.

**Editor** ([editor.tsx](../../../src/app/editor.tsx))
- Large borderless serif title input with faint placeholder.
- Editor content styled to match the read view (WYSIWYG feel).
- Slim cream toolbar with hairline top border and green active state.
- Tags as small pills. Cover picker and dictation as quiet ghost icons.
- Green pill for the main action, autosave status as small muted text.
- Behavior (autosave, dictation, tags, cover upload) is unchanged.

**Editor fonts (decision):** the 10Tap editor renders in a web view on native, and that web view cannot see fonts loaded through `expo-font`. Decision: embed the editor's fonts as base64 `@font-face` rules in the injected CSS so the editor matches the read view. Embed only latin-subset woff2 files for `Lora SemiBold` (headings) and `Inter Regular` and `Inter SemiBold` (body, bold). Italic is synthesized by the web view. If the injected CSS makes the editor load noticeably slower on a real device, the fallback is a system serif (Georgia / `serif`) for headings and system sans for body inside the editor only. On web, the editor uses the same fonts as the rest of the app through normal CSS. Colors and spacing are applied through the same injected CSS. This is a dedicated plan step, checked on web first. Native verification needs a device or emulator.

## 4. Sign-in, trash, app shell, verification

**Sign-in** ([sign-in.tsx](../../../src/app/sign-in.tsx))
- Centered column on paper background, serif app name, one-line tagline.
- Cream inputs, green focus ring, green pill submit.
- Sign-in/sign-up toggle and 2FA step share the styling.
- Logic and error messages are unchanged.

**Trash** ([trash.tsx](../../../src/app/trash.tsx))
- Same open-row layout as the feed.
- Restore is a green ghost action. Delete forever is brick red.
- Serif empty state.

**App shell** ([_layout.tsx](../../../src/app/_layout.tsx))
- Headers: cream background, serif title, no shadow, hairline bottom border.
- Font loading gate is done in step 1 (see Typography), not here.
- Status bar style "dark" on the paper background. Web page background, title, and `theme-color` match the paper color.

**Out of scope:** dark mode, backend and Clerk changes, feature changes, new screens.

## Verification

- `npm run lint` and a TypeScript check pass.
- Every screen checked in the browser at phone and desktop widths.
- Rich text editor checked on a device or emulator. If that is not possible, this is stated explicitly.

## Implementation order (for the plan)

1. Tokens, font loading and gate, light-only enforcement (the foundation; everything after builds on it)
2. Shared components
3. Home feed
4. Read view and body renderers
5. Editor (including editor font embedding)
6. Sign-in and trash
7. App shell polish (headers, status bar, web title and theme color)
