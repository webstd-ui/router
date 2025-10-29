# @webstd-ui/router

A framework-agnostic client-side router that mirrors the server API of `@remix-run/fetch-router` and surfaces navigation state via `@remix-run/events`. It ships as an ESM package that can drive UIs built with Remix DOM, Preact, Solid, Lit, Crank, or any other renderer that can consume the router's outlet value.

## Features

-   **Renderer agnostic** – works with any library that can render the router's outlet value
-   **Fetch Router parity** – reuse `route()`, `resources()`, loaders, and actions from `@remix-run/fetch-router`
-   **Event-driven updates** – subscribe to `Router.update` for fine-grained navigation state
-   **Link & form enhancement** – intercepts anchor clicks and form submissions out of the box
-   **Optimistic UI helpers** – `Router.optimistic()` dispatches mutation state for responsive updates
-   **Rich navigation state** – track loading/submitting transitions, current outlet, and AppStorage

## Installation

```sh
pnpm add @webstd-ui/router
```

## Quick Start

```ts
import { Router, render } from "@webstd-ui/router";
import { route } from "@remix-run/fetch-router";
import { events } from "@remix-run/events";

// Create a router instance
const router = new Router();

// Define routes
const routes = route({
    home: "/",
    about: "/about",
    contact: { method: "POST", pattern: "/contact" },
});

// Map routes to handlers
router.map(routes, {
    async home() {
        return render(`<h1>Home Page</h1>`);
    },
    async about() {
        return render(`<h1>About Page</h1>`);
    },
    async contact({ formData }) {
        // Handle form submission
        const name = formData.get("name") as string;
        return render(`<p>Thanks, ${name}!</p>`);
    },
});

// Listen for updates
events(
    router,
    Router.update(() => {
        // Re-render your UI
        render(router.outlet);
    })
);

// Programmatic navigation
await router.navigate("/about");
```

Handlers can return whatever your renderer understands (JSX, template results, custom objects, HTMLElements, strings, etc.). The helper `render(element, init)` stores the element on the underlying `Response` since `@remix-run/fetch-router` doesn't support returning non-`Response`s yet.

## API Highlights

-   `new Router({ globallyEnhance })` – create a router instance and optionally wire global click/submit listeners
-   `router.map(routeDefinition, handlers)` – register routes produced by `route()` or `resources()`
-   `router.navigate(to, options)` – programmatic navigation with replace, view transitions, and scroll control
-   `router.submit(target, options)` – submit `FormData`, JSON, or text payloads to a route action
-   `router.enhanceForm(optimisticHandler?)` – creates an event handler for SPA `<form>` navigations with optional optimistic updates
-   `router.enhanceLink(handler)` – creates an event handler for SPA `<a>` navigations
-   `router.navLink({ activeClass, pendingClass })` – creates a `@remix-run/dom`-specific event handler for automatically setting the active and pending classes on `<a>`
-   `router.isActive(path, exact?)` / `router.isPending(path, exact?)` – query routing state for rendering
-   `Router.update` – event descriptor you can pass to `events()` to subscribe to router state changes

Return values can be:

-   A `Response` instance (for redirects, JSON payloads, stream bodies, etc.)
-   Any renderable value, typically captured with `render(element)`
-   `null`/`undefined` for routes without UI

## Development

This package is part of a pnpm workspace managed via Mise tasks.

```sh
cd packages/router
mise run :install   # pnpm install (workspace aware)
mise run :dev       # tsdown --watch
mise run :build     # emit ESM bundle to dist/
mise run :typecheck # optional TypeScript diagnostics
```

The build output lives in `packages/router/dist` and is what gets published.

## Examples

You can see real integrations inside the repository's [examples](../../examples) folder:

-   Remix DOM applications in `examples/remix/*`
-   Framework ports in `examples/{crank,lit}/contacts`

Each example includes a `mise.toml` with `:install`, `:dev`, and `:build` tasks that mirror the package tooling.

## License

[MIT](LICENSE)
