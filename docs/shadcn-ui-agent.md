# shadcn/ui Agent Rules

This document defines the UI implementation rules agents must follow in this project.

## Golden Rule

Use **shadcn/ui** as the default UI source for application components.

Do not hand-code common UI primitives when a shadcn/ui component exists. Install or add the
component with the shadcn CLI, then compose it for the feature.

## Required Workflow

Before building or changing UI:

1. Check whether the project already has shadcn/ui configured:
   - `components.json`
   - `components/ui/*`
   - `lib/utils.ts`
2. Check whether the needed component already exists in `components/ui`.
3. If the component exists, import and use it.
4. If the component is missing, add it with the shadcn CLI.
5. Only create custom UI code for project-specific composition, layout, business logic, or
   visual details that shadcn/ui does not provide.

## CLI Usage

If shadcn/ui is not initialized yet, initialize it first:

```bash
npx shadcn@latest init
```

When a component is needed but missing, add it with:

```bash
npx shadcn@latest add <component>
```

Examples:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add tabs
npx shadcn@latest add table
npx shadcn@latest add form
npx shadcn@latest add input
npx shadcn@latest add select
npx shadcn@latest add badge
npx shadcn@latest add tooltip
```

If multiple components are needed, add them together when the CLI supports it:

```bash
npx shadcn@latest add button card dialog input select tabs table
```

## Component Rules

Always prefer shadcn/ui for:

- Buttons
- Inputs and textareas
- Selects, checkboxes, radio groups, switches, sliders
- Forms and field layouts
- Dialogs, drawers, sheets, popovers, tooltips
- Dropdown menus and command palettes
- Tabs, accordions, navigation menus
- Tables, cards, badges, alerts, skeletons
- Toasts and notifications

Use `lucide-react` icons for icon buttons and UI actions when an icon is needed.

## Custom Code Boundaries

Allowed custom code:

- Feature-specific containers and screen layout
- Data fetching and state management
- Domain-specific visualizations such as maps, orbit paths, charts, canvases, or WebGL scenes
- Small wrappers around shadcn/ui components when they reduce repeated project code

Avoid custom code for:

- Rebuilding buttons, dialogs, dropdowns, tabs, forms, cards, tables, tooltips, badges, alerts,
  or other primitives that shadcn/ui already provides
- Copying random component snippets from the internet
- Creating one-off UI primitives with inconsistent class names, spacing, focus states, or variants

## Styling Rules

Follow the generated shadcn/ui conventions:

- Use the generated component APIs and variants.
- Use the project `cn` helper from `lib/utils` for conditional classes.
- Keep styling consistent with shadcn/ui tokens and Tailwind classes.
- Preserve accessible labels, focus states, keyboard behavior, and ARIA patterns from shadcn/ui.

## If Unsure

When unsure whether a component exists in shadcn/ui, check the local `components/ui` directory
first, then use the shadcn CLI to add the closest official component. Compose from official
components instead of inventing a new primitive.
