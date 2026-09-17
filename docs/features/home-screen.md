# Home screen

The root route `/` opens a clock-centred home inspired by Lazify’s desktop.
`src/pages/Home.tsx` shows local time/date, All courses, New course and Settings
shortcuts, and the three newest courses with descriptions and direct links. The
clock and courses sit side by side on desktop and stack compactly on narrow
windows, keeping the home screen within the window at common sizes. The clock updates
at minute boundaries and when document visibility changes; its timer and event
listener are cleaned up when leaving the page.

Navigation uses a 160ms opacity-only entrance fade in `RootLayout`. Inner routes
fade the main content; entering or leaving Home fades the workspace below the
header because the sidebar layout changes. No route subtree is remounted just
to animate it. Interrupted fades are cancelled, and reduced-motion preferences
skip the animation. Browser checks cover links, back/forward navigation and
reduced motion; theme updates do not replay the route fade.

Shared dialogs match Lazify’s 300ms ease-out fade and 12px vertical slide,
with a 150ms opening delay and a lightly blurred backdrop. Cancel, Escape and the
close button and successful saves/deletions share a 300ms exit transition
before dismissal. CSS transitions reverse from the current opacity and position;
the backdrop stays mounted and fades with the panel.
Busy dialogs cannot be dismissed, closing dialogs are inert, and reduced motion
skips animation. Native dialog focus restoration remains intact.

The sidebar is hidden on Home. Other routes offer a Home link, and the brand
link returns home. A header button collapses or expands the sidebar on other
routes, reclaiming its full width without remounting the page. The sidebar
uses a 200ms ease-out horizontal slide and content fade. The content layout
adjusts immediately; sidebar width and height are not animated. Collapsed controls are inert and hidden from
assistive technology immediately. Reduced motion disables both transitions.
The collapsed state
is saved as `mneme.sidebar.collapsed` in local storage; unavailable storage
does not prevent toggling. The button supports keyboard activation and exposes
its expanded state. The original collection is `src/pages/Courses.tsx` at
`/courses`; course breadcrumbs, back links and active-course deletion point
there. All storage and course forms retain their existing Chain SDK flow.

The home uses the existing light/dark tokens and typography. Settings now uses
full-width page padding, a responsive Appearance row, larger theme previews and
a Back to home link. Theme persistence, keyboard radios and save-error feedback
are preserved. No window manager or new native integration is introduced.

Verification: frontend typecheck/build, existing Node tests, and browser checks
with a SQLite test adapter for shortcuts, create/delete, route destinations,
light/dark persistence, keyboard selection, failed preference saving and narrow
layouts. Native webview acceptance remains a manual check. No lint configuration
is available.
