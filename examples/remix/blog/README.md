# Blog Example

A simple blog application demonstrating the capabilities of [@webstd-ui/router](../../packages/router) with a content-focused use case. This example shows how to build a blog with post creation, listing, and viewing functionality.

## Features

- **Post Management**: Create and view blog posts
- **Resource Routes**: Uses `resources()` helper for RESTful route structure
- **Post Listing**: Browse all blog posts
- **Individual Post Views**: View individual blog posts by ID
- **Form Handling**: Create new posts via form submission
- **AppStorage**: Demonstrates per-request storage for data persistence
- **Type-Safe Routing**: Full TypeScript support with route type inference
- **Interactive Components**: Includes a counter component for client-side interactivity

## Technology Stack

- **Router**: [@webstd-ui/router](../../packages/router)
- **UI Framework**: [@remix-run/dom](https://www.npmjs.com/package/@remix-run/dom)
- **Build Tool**: Vite
- **Language**: TypeScript

## Getting Started

### Prerequisites

- [Mise](https://mise.jdx.dev/) for task automation

### Installation & Running

1. Install dependencies:
   ```sh
   mise install
   ```

2. Start the development server:
   ```sh
   mise run :dev
   ```

3. Open your browser to the URL shown in the terminal (typically `http://localhost:5173`)

## Project Structure

```
src/
├── components/     # Reusable UI components (e.g., Counter)
├── lib/           # Utilities and data management (posts.ts)
├── handlers.tsx   # Route handlers for all pages
├── routes.ts      # Route definitions using resources()
├── App.tsx        # Main application component
└── main.tsx       # Application entry point
```

## Routes

| Path | Method | Handler | Description |
|------|--------|---------|-------------|
| `/` | GET | `index` | Home page with counter |
| `/about` | GET | `about` | About page |
| `/blog` | GET | `blog.index` | List all blog posts |
| `/blog/new` | GET | `blog.new` | New post form |
| `/blog` | POST | `blog.create` | Create new post |
| `/blog/:id` | GET | `blog.show` | View individual post |

## Learn More

- [Router Documentation](../../packages/router)
- [@remix-run/fetch-router Resources](https://www.npmjs.com/package/@remix-run/fetch-router) - Learn about resource routes
- [@remix-run/dom](https://www.npmjs.com/package/@remix-run/dom)
