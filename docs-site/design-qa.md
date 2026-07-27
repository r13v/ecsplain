# ECSplain documentation design QA

## Evidence

- Source visual truth: `design-reference.png`
- Browser-rendered implementation: `implementation-desktop.png`
- Responsive evidence: `implementation-mobile.png`
- Full-view comparison: `comparison-desktop.png`
- Focused workspace comparison: `comparison-workspace.png`
- Desktop CSS viewport: `1440 × 1024`
- Source pixels: `1487 × 1058`, normalized to `1440 × 1024`
- Implementation pixels: `1440 × 1050`, compared using the top `1440 × 1024`
- Density: `devicePixelRatio: 1`; no density scaling was required
- State: English, Systems lesson, `SelectedCell` enabled on `e2`

## Findings

No actionable P0, P1, or P2 differences remain.

- Typography: the implementation uses Inter for interface text and JetBrains Mono
  for code, preserving the reference hierarchy, weight contrast, compact labels,
  and readable code density.
- Spacing and layout: the fixed header, curriculum rail, hero, split code/world
  workspace, notes, and related-example regions follow the reference composition.
  The workspace is intentionally shorter because the real ECSplain system shown
  here contains 14 lines rather than the mock's illustrative 21-line system.
- Colors and tokens: the cool white/blue palette, pale selected rows, green live
  state, subtle dividers, and low-elevation controls match the selected direction.
- Image quality and assets: the target contains no photographic or raster artwork.
  All interface icons use the Phosphor icon library; no placeholder or custom
  SVG/CSS art was substituted.
- Copy and content: all product copy and navigation are available in English and
  Russian. Code identifiers remain unchanged across languages by design.
- Icons and controls: icons share one family and align consistently with control
  labels. The run, reset, copy, search, locale, navigation, and mobile-menu
  affordances are visibly distinct.
- Accessibility and responsiveness: semantic buttons, links, labels, focus styles,
  language metadata, reduced-motion handling, and a `390 × 844` mobile layout were
  checked. The mobile layout has no page-level horizontal overflow; code scrolls
  inside its own panel.

The full-view comparison verifies overall composition and hierarchy. The focused
workspace comparison verifies the code header, line rhythm, active line, entity
table, selected marker, and before/after summary at readable native density.

## Primary interactions tested

- Ran the ECS system and confirmed `SelectedCell` appears on entity `e2` and in the
  change summary.
- Switched from English to Russian and confirmed the URL, document language,
  lesson title, system label, and primary action update together.
- Filtered the curriculum and confirmed only the matching Russian table chapter
  remains.
- Opened and closed the mobile curriculum drawer.
- Confirmed the desktop page has no horizontal overflow.
- Checked browser console logs; no errors or warnings were emitted.

## Comparison history

1. Initial responsive pass found a P2 header-wrap issue at `390px`: the language
   switch moved to a second grid row and crowded the lesson hero.
   - Fix: hid the nonessential wordmark below `600px`, leaving menu, search, and
     locale controls in one stable row.
   - Post-fix evidence: `implementation-mobile.png` shows a single-row header,
     full-width primary action, readable hero, and correctly stacked workspace.
2. The final desktop pass used the same selected-component state as the reference.
   `comparison-desktop.png` and `comparison-workspace.png` show no remaining
   P0/P1/P2 mismatch.

## Follow-up polish

- P3: the reference includes a decorative progress card at the bottom of its
  shorter curriculum. The implementation prioritizes the real 22-chapter list in
  the same rail, so this decoration was intentionally omitted.

## Final result

final result: passed
