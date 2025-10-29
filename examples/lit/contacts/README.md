# Contacts Example (Lit)

Contacts demo rendered with [Lit](https://lit.dev/) custom elements, using [@webstd-ui/router](../../../packages/router) for navigation. It demonstrates how the router's outlet can drive renderers beyond Remix.

## Highlights

- **Custom elements** – routes return `render()` responses that mount Lit components
- **Controller pattern** – field validation and state live in `src/controllers`
- **Scoped styles** – shared styles exported from `src/styles.ts`
- **URL-synchronized search** – filters contacts via query parameters

## Tech Stack

- **Router:** [`@webstd-ui/router`](../../../packages/router)
- **Renderer:** [`lit`](https://www.npmjs.com/package/lit)
- **Build:** Vite
- **Language:** TypeScript

## Getting Started

Inside `examples/lit/contacts`:

```sh
mise run :install
mise run :dev
```

Vite logs the local dev URL (defaults to `http://localhost:1612`). Run `mise install` at the repo root first if the toolchain has not been provisioned yet.

## Project Layout

```
src/
├── app.ts             # Router wiring + top-level custom element
├── controllers/       # Lit controllers for form + navigation state
├── custom-elements/   # Web components used across routes
├── directives/        # Lit directives for templating helpers
├── lib/               # In-memory data utilities
├── mixins/            # Shared mixins for components
├── routes/            # Route handlers and definitions
├── styles.ts          # Shared CSS-in-JS
└── main.ts            # Entry point bootstrapping the router
```

## Learn More

- [Router Documentation](../../../packages/router)
- [React Router Tutorial](https://reactrouter.com/tutorials/address-book) (original inspiration)
- [Lit Documentation](https://lit.dev/docs/)
