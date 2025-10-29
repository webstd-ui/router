# Tasks Example

An async-heavy Remix 3 demo that exercises [@webstd-ui/router](../../../packages/router) features such as redirects, optimistic updates, and loading indicators while managing a list of tasks.

## Highlights

-   **Async loaders/actions** – artificial delays keep navigation state visible for debugging
-   **Redirect patterns** – handlers return `redirect()` to guide follow-up navigation
-   **Optimistic UI** – optimistic task creation/removal wired through `router.optimistic`
-   **Resource routing** – `resources()` definition in `src/routes.ts` mirrors REST semantics

## Tech Stack

-   **Router:** [`@webstd-ui/router`](../../../packages/router)
-   **Renderer:** [`@remix-run/dom`](https://www.npmjs.com/package/@remix-run/dom)
-   **Build:** Vite
-   **Language:** TypeScript/TSX

## Getting Started

From `examples/remix/tasks`:

```sh
mise run :install
mise run :dev
```

Open the dev server at the URL emitted by Vite (defaults to `http://localhost:1612`). Run `mise install` at the repo root beforehand to provision the toolchain if needed.

## Project Layout

```
src/
├── app.tsx             # Layout + router wiring
├── components/
│   ├── NewTask.tsx     # Task creation form
│   └── TaskItem.tsx    # Individual task row
├── handlers.tsx        # Route loaders/actions with async delays
├── lib/task-data.ts    # In-memory task store
├── main.tsx            # Entry point
└── routes.ts           # Route definition via resources()
```

## Route Matrix

| Path                | Method | Handler         | Purpose                |
| ------------------- | ------ | --------------- | ---------------------- |
| `/`                 | GET    | `index`         | Redirect to first task |
| `/task/new`         | GET    | `tasks.new`     | Render creation form   |
| `/task`             | POST   | `tasks.create`  | Create a task          |
| `/task/:id`         | GET    | `tasks.show`    | Show task details      |
| `/task/destroy/:id` | POST   | `tasks.destroy` | Delete a task          |

## Learn More

-   [Router Documentation](../../../packages/router)
-   [`@remix-run/fetch-router`](https://www.npmjs.com/package/@remix-run/fetch-router)
-   [Remix 3: Remixing UI](https://remix.run/blog/remix-jam-2025-recap#remixing-ui)
