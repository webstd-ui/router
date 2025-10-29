# Contacts Example (Crank)

Contacts demo rendered with [Crank](https://crank.js.org/), using [@webstd-ui/router](../../../packages/router) for navigation. It demonstrates how the router's outlet can drive renderers beyond Remix.

## Highlights

-   **Crank renderer** – hooks the router outlet into Crank's custom renderer
-   **Full CRUD** – loaders/actions cover create, read, update, delete flows
-   **Query-powered search** – synchronizes contact filtering with the URL
-   **Optimistic state** – leverages navigation state to show pending UI

## Tech Stack

-   **Router:** [`@webstd-ui/router`](../../../packages/router)
-   **Renderer:** [`@b9g/crank`](https://www.npmjs.com/package/@b9g/crank)
-   **Build:** Vite
-   **Language:** TypeScript/TSX

## Getting Started

From `examples/crank/contacts`:

```sh
mise run :install
mise run :dev
```

Vite reports the local dev URL (defaults to `http://localhost:1612`). Run `mise install` once at the repo root if the toolchain has not been bootstrapped yet.

## Project Layout

```
src/
├── app.tsx              # Crank renderer + router wiring
├── components/          # UI widgets (forms, list items)
├── lib/                 # In-memory contact store
├── main.tsx             # Entry point linking router to DOM
├── routes/              # Route loaders/actions
└── index.css            # Global styles
```

## Learn More

-   [Router Documentation](../../../packages/router)
-   [React Router Tutorial](https://reactrouter.com/tutorials/address-book) (original inspiration)
-   [Crank](https://crank.js.org/)
