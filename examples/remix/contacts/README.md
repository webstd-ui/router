# Contacts Example

A Remix 3 contacts manager showcasing [@webstd-ui/router](../../../packages/router) features. It adapts the [React Router address book tutorial](https://reactrouter.com/tutorials/address-book) to run entirely on the client while reusing the same patterns.

## Highlights

-   **CRUD routing** – handlers for listing, creating, updating, and deleting contacts
-   **Enhanced forms** – demonstrates POST/PUT/DELETE intercepts with optimistic navigation state
-   **URL-driven search** – filters contacts through query parameters
-   **Config-driven routing** – handlers in `src/routes`
-   **Navigation feedback** – loading indicators driven by `router.navigating`

## Tech Stack

-   **Router:** [`@webstd-ui/router`](../../../packages/router)
-   **Renderer:** [`@remix-run/dom`](https://www.npmjs.com/package/@remix-run/dom)
-   **Build:** Vite
-   **Language:** TypeScript/TSX

## Getting Started

Run the commands inside `examples/remix/contacts`:

```sh
mise run :install   # pnpm install
mise run :dev       # start Vite on http://localhost:1612
```

If you have not already installed tools globally for the repo, run `mise install` once at the repository root.

## Project Layout

```
src/
├── app.tsx              # Router wiring + layout shell
├── components/          # UI widgets (forms, list, nav)
├── lib/                 # In-memory data + helpers
├── main.tsx             # App bootstrap
├── routes/              # Route handlers (loaders/actions)
└── index.css            # Global styles
```

## Learn More

-   [Router Documentation](../../../packages/router)
-   [React Router Tutorial](https://reactrouter.com/tutorials/address-book) (original inspiration)
-   [Remix 3: Remixing UI](https://remix.run/blog/remix-jam-2025-recap#remixing-ui)
