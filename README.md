# @webstd-ui/router

A framework-agnostic client-side router built on top of `@remix-run/fetch-router` and `@remix-run/events`. The repository hosts the core package plus a collection of example applications that integrate the router with different rendering libraries.

## Packages & Examples

-   [`packages/router`](packages/router) – `@webstd-ui/router` package
-   [`examples/remix/*`](examples/remix) – [Remix](https://remix.run/blog/remix-jam-2025-recap#remixing-ui) examples (blog, contacts, tasks)
-   [`examples/crank/contacts`](examples/crank/contacts) – [Crank](https://crank.js.org) example
-   [`examples/lit/contacts`](examples/lit/contacts) – [Lit](https://lit.dev) example

## Repository Layout

```
router/
├── packages/
│   └── router/                  # Core router source, build, and docs
└── examples/
    ├── remix/                   # @remix-run/dom demos
    │   ├── blog/                # Content-focused demo
    │   ├── contacts/            # CRUD/contact manager demo
    │   └── tasks/               # Async + optimistic UI demo
    ├── crank/
    │   └── contacts/            # Crank contacts demo
    └── lit/
        └── contacts/            # Lit contacts demo
```

## Prerequisites

The project uses [Mise](https://mise.jdx.dev/) for tool/version management and task automation.

1. [Install Mise](https://mise.jdx.dev/installing-mise.html)
2. Install the pinned tool versions once at the repository root:

    ```sh
    mise install
    ```

## Working on the Router Package

```sh
cd packages/router

# Install workspace dependencies
mise run :install

# Start the TypeScript build/watch pipeline (tsdown)
mise run :dev

# Build once for distribution
mise run :build

# Optional diagnostics
mise run :typecheck
mise run :lint
```

The package outputs ESM artifacts to `packages/router/dist`.

## Running the Examples

Each example is isolated in its own workspace. From the repository root:

```sh
# Remix DOM examples (blog, contacts, tasks)
cd examples/remix/<app>

# Alternative frameworks
cd examples/<framework>/contacts

# Install dependencies & start dev server
mise run :install
mise run :dev    # serves on http://localhost:1612 by default
```

The examples showcase how to integrate the router with different renderers, including link interception, form handling, optimistic updates, and navigation heuristics.

## Tech Stack

-   **Router runtime:** `@remix-run/fetch-router`, `@remix-run/events`, custom client integration
-   **Build tooling:** `tsdown` (package), `vite` (examples)
-   **Task runner:** `mise`
-   **Languages:** TypeScript, JSX/TSX
-   **Package manager:** pnpm (via workspace tooling)

## Contributing

-   Implement core changes in `packages/router/src`
-   Exercise the change in one or more examples
-   Use the provided Mise tasks for formatting, linting, and builds

## License

[MIT](LICENSE)
