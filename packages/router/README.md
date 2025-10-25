# @webstd-ui/router

A framework-agnostic client-side router built on `@remix-run/fetch-router` and `@remix-run/events`. This package provides a generic routing solution that works with any rendering library or framework.

## Features

- **Framework Agnostic**: Works with any UI library (Remix, Preact, Solid, Lit, vanilla JS, etc.)
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Event-Driven**: Built on `@remix-run/events` for reactive updates
- **Navigation States**: Track loading, submitting, and idle states
- **Form Handling**: Automatic interception of `<form>` submissions
- **Link Interception**: Handles `<a>` clicks for seamless SPA navigation
- **Optimistic UI**: Built-in support for optimistic updates
- **Redirects**: Server-style redirects with Response objects
- **History Management**: Integrated with browser History API for Safari and Firefox compatibility

## Installation

```sh
pnpm add @webstd-ui/router
```

## Basic Usage

```ts
import { Router } from "@webstd-ui/router";
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
    return `<h1>Home Page</h1>`;
  },
  async about() {
    return `<h1>About Page</h1>`;
  },
  async contact({ formData }) {
    // Handle form submission
    const name = formData.get('name') as string;
    return `<p>Thanks, ${name}!</p>`;
  },
});

// Listen for updates
events(router, Router.update(() => {
  // Re-render your UI
  render(router.outlet);
}));

// Programmatic navigation
await router.navigate("/about");
```

## API Reference

### Router Class

#### Properties

- **`location`**: Current browser location after successful navigation
- **`navigating`**: Navigation state object with `to` and `from` information
- **`outlet`**: The rendered content from the matched route handler
- **`storage`**: Per-request storage shared across route handlers

#### Methods

- **`map(routes, handlers)`**: Register routes and their handlers
- **`navigate(to, options)`**: Programmatically navigate to a path
- **`submit(target, options)`**: Submit form data to a route
- **`isActive(path, exact)`**: Check if a path is currently active
- **`isPending(path, exact)`**: Check if a path is pending navigation
- **`optimistic(handler, options)`**: Wrap a handler with optimistic UI support

#### Events

- **`Router.update`**: Fires whenever router state changes (navigation, loading, etc.)

### Route Handlers

Route handlers receive a context object with:

```ts
// GET requests
{
  params: Record<string, string>,
  method: 'GET',
  url: URL,
  storage: AppStorage
}

// POST/PUT/DELETE requests
{
  params: Record<string, string>,
  method: FormMethod,
  formData: FormData,
  url: URL,
  storage: AppStorage
}
```

Handlers can return:
- Renderable content (HTML string, JSX, VNode, etc.)
- `Response` object with redirects or JSON
- `null` for no content

## Examples

See the [examples directory](../../examples) for complete applications:

- [Contacts](../../examples/contacts) - Contact management with CRUD operations
- [Blog](../../examples/blog) - Blog application
- [Tasks](../../examples/tasks) - Task management with async operations

## Development

To start the development server:

1. [Install Mise](https://mise.jdx.dev/installing-mise.html)
2. Run:

```sh
mise install
mise run :dev
```

## License

[MIT](LICENSE)
