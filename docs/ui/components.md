# Shared UI components

Adapted from Lazify's `shared/typography/Typography.tsx` and
`shared/ui/form/FormInput.tsx`, using Mneme's existing palette and spacing.

## Typography

Import from `src/shared/ui/Typography.tsx`.

| Component | Default element | Use |
| --- | --- | --- |
| `PageTitle` | `h1` | Page heading |
| `SectionTitle` | `h2` | Section or dialog heading |
| `BodyText` | `p` | Descriptions, messages, prose |
| `Caption` | `p` | Metadata and hints |
| `Typography` | `p` | Explicit variant and semantic element |

`Typography` supports `pageTitle`, `sectionTitle`, `itemTitle`, `body`,
`caption`, and `label` variants. All components accept `tone="text"`,
`"muted"`, `"error"`, or `"inherit"`. Variant defines size/weight/line-height;
only tone defines colour, so the two do not add conflicting colour classes.
Use `as` to keep the correct heading level or render inline text.

```tsx
<PageTitle>Your courses</PageTitle>
<BodyText tone="muted">A place for everything you’re learning.</BodyText>
<SectionTitle as="h3">Course details</SectionTitle>
<Typography as="h2" variant="itemTitle">Cognitive psychology</Typography>
<Caption as="span" tone="muted">2 courses</Caption>
```

Use `className` for placement, width, wrapping and truncation. Add a shared
variant if a new text treatment is needed repeatedly. Avoid overriding variant
sizes or tone colours at each call site; `clsx` does not resolve conflicting
Tailwind classes.

## Inputs

Import `TextInput`, `TextArea`, and their prop types from
`src/shared/ui/Input.tsx`.

```tsx
<TextInput
  label="Course name"
  name="name"
  required
  value={name}
  onChange={(event) => setName(event.target.value)}
  hint="Use the name you recognise from your timetable."
  error={validationActive && !name.trim() ? "Enter a course name." : undefined}
/>

<TextArea
  label="Description"
  name="description"
  value={description}
  onChange={(event) => setDescription(event.target.value)}
/>
```

- `label` is required. The component associates it with the control using an
  explicit `id`, or a unique React-generated ID when omitted.
- Native `required` controls validation and the required/optional label.
- `hint` and `error` have IDs linked through `aria-describedby`. Caller-provided
  description IDs are preserved. An error sets `aria-invalid` and renders an
  alert; validation rules and when to show them belong to the caller.
- Native props, event handlers and React 19 refs reach the actual input or
  textarea, including `disabled`, `readOnly`, `autoComplete`, and `name`.
- `TextInput` defaults to `type="text"`. Use it for text-like native inputs,
  such as email, password or search. Radios and checkboxes remain separate.
- `TextArea` defaults to three rows and vertical resizing.
- `className` targets the control; `fieldClassName` targets the unstyled layout
  wrapper containing its label, control, hint and error.

These components are already used by the course form. Typography is also used
by the home/course pages, dialog heading, sidebar metadata and workspace states.
Storage, routes and course actions are unchanged.

## Verification

- `npm run build:web` — frontend typecheck and production build.
- `node --test tests/*.test.mjs` — course repository plus field label/error
  associations, native attributes and typography heading semantics.
- No lint script or configuration exists in this project.

## Appearance

The settings page at `/settings` offers Light and Dark. `ThemeProvider` shares
that selection, and `index.html` restores `mneme.theme` from localStorage before
React renders. Missing, invalid or unreadable preferences default to Light.
Saving happens before the active selection changes; a failed write leaves the
previous theme active and shows an error. Settings remains available when the
course database is unavailable.

Use semantic colour utilities in new components:

| Utility | Purpose |
| --- | --- |
| `bg-surface` | Main workspace and dialog background |
| `bg-sidebar` | Secondary background and read-only fields |
| `text-ink` | Main foreground |
| `text-muted` | Secondary text |
| `border-ink/15` | Subtle dividers and control borders |
| `bg-action text-on-action` | Primary actions |
| `text-danger` | Errors and destructive text |

The token values live in `src/App.css`. Brand colours remain fixed for the logo,
course colour choices and appearance previews. Course icons mix their saved
colour with the dark foreground for visibility; stored course colours do not
change when switching themes. Native control appearance follows `color-scheme`.

Verification includes both themes, reload persistence, keyboard radio selection,
failed preference writes, settings without course storage, and course operations
in dark mode. Browser persistence was verified; native desktop relaunch remains
a manual acceptance check.
