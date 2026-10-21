# Z.O.O.T. design decisions

Zenith Operating Optimized Technology. Keep the same visual language across future pages. This change applies only to the home page; existing feature pages and account/operator/material data are unchanged.

## Home

- Plain background, no top navigation bar.
- Centered name, full English name, and a two-column, two-row card grid on desktop and mobile.
- Order: recruitment / operators, base / depot.
- Existing SVG icons on the left, function names on the right; no descriptions.
- Cards use a provisional 5:4 aspect ratio, upper-left and lower-right 45-degree cuts, no border, and a soft silhouette shadow.
- Hover changes the fill and increases shadow slightly.
- Bottom-right appearance button opens a centered dialog with a dimmed backdrop.
- Appearance options: system (default), light, dark. Apply saves; closing cancels. Close button, Escape, or backdrop click dismisses.
- Font: Chakra Petch 600 for English branding, Pretendard for Korean and UI.
- Light accent #D4E95C, dark accent #ACD13E. Light primary button text is white, without a text outline.
- Backgrounds #F4F4F4 / #121212; surfaces white / #1E1E1E.
- Shared status colors: success #79CF98, caution #F0C66B, error/shortage #FF8585.
- Short notices appear at the top center. Short transitions respect reduced-motion settings.
- Font copyright notices and OFL licenses are stored in docs/licenses.

## Deferred

Exact sizes, gaps, title size, and final corner-cut dimensions remain adjustable after visual review. Information density is decided separately for each content type.

Future feature-page navigation uses a fixed top bar with home and menu buttons. The menu overlays from the right and dims the background without hover changes. General settings use centered dialogs and an Apply action. Loading uses a spinner for indeterminate work and a progress bar only when progress is measurable. Tooltips appear on hover/focus on desktop and tap on mobile. These feature-page changes are not part of the home-only rollout.
