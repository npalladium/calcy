# User stories

User-facing capability stories, numbered `US-N`. Code that implements a story
references its number in a comment (e.g. `// … (US-1)`), so the number is the
link between intent and implementation — grep `US-<n>` to find the code.

| # | Story | Status |
|---|---|---|
| US-1 | **Expression-language cheat sheet** — learn the syntax by dropping working examples into the sheet (`src/lib/components/HelpPanel.svelte`). | Shipped |
| US-2 | **[Task & project estimation](US-2-task-project-estimation.md)** — write tasks as uncertain estimates, roll up into a project total with a 90% CI and deadline odds. | Shipped |
| US-3 | **[Traffic load forecasting](US-3-traffic-load-forecasting.md)** — express uncertain load, derive peak from average, project it forward at a growth rate. (Demand side.) | Shipped |
| US-4 | **[Capacity headroom & sizing](US-4-capacity-headroom-and-sizing.md)** — overload odds, headroom, and instance counts against an uncertain load. (Supply side.) | Shipped |

New stories: add a row here and a `US-N-<slug>.md` file. Keep the
`As a… I want… so that…` opening, then acceptance criteria as golden tests that
mirror the engine test style (`tests/engine.test.ts`).
