# Blog Example

A content-focused workflow for `@webstd-ui/router`. It uses `resources()` from `@remix-run/fetch-router` to model blog post CRUD while rendering through `@remix-run/dom`.

## Highlights

-   **Resource routing** – handlers generated from `resources()` cover index/new/show/create flows
-   **AppStorage** – in-memory persistence for posts that mirrors `@remix-run/fetch-router` storage
-   **Interactive UI** – combines router-driven state with stateful components (e.g. counter)
-   **Type-safe handlers** – handlers co-located in `src/handlers.tsx` with full TypeScript inference

## Tech Stack

-   **Router:** [`@webstd-ui/router`](../../../packages/router)
-   **Renderer:** [`@remix-run/dom`](https://www.npmjs.com/package/@remix-run/dom)
-   **Build:** Vite
-   **Language:** TypeScript/TSX

## Getting Started

Inside `examples/remix/blog`:

```sh
mise run :install   # pnpm install
mise run :dev       # start Vite on http://localhost:1612
```

Run `mise install` at the repository root once if you have not already provisioned the toolchain.

## Project Layout

```
src/
├── App.tsx             # Router wiring + layout
├── components/         # Client-side components (counter, etc.)
├── handlers.tsx        # Route loaders/actions
├── lib/posts.ts        # AppStorage-backed data store
├── main.tsx            # Bootstraps the router
└── routes.ts           # Route map created via resources()
```

## Route Matrix

| Path        | Method | Handler       | Purpose                |
| ----------- | ------ | ------------- | ---------------------- |
| `/`         | GET    | `index`       | Home page with counter |
| `/about`    | GET    | `about`       | Static about page      |
| `/blog`     | GET    | `blog.index`  | List posts             |
| `/blog/new` | GET    | `blog.new`    | Post creation form     |
| `/blog`     | POST   | `blog.create` | Persist new post       |
| `/blog/:id` | GET    | `blog.show`   | Single post view       |

## Learn More

-   [Router Documentation](../../../packages/router)
-   [`@remix-run/fetch-router`](https://www.npmjs.com/package/@remix-run/fetch-router)
-   [Remix 3: Remixing UI](https://remix.run/blog/remix-jam-2025-recap#remixing-ui)
