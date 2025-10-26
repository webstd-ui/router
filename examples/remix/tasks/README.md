# Tasks Example

A task management application demonstrating the capabilities of [@webstd-ui/router](../../packages/router) with async operations, redirects, and optimistic UI patterns. This example shows how to build a task manager with create, view, and delete functionality.

## Features

- **Task Management**: Create, view, and delete tasks
- **Resource Routes**: Uses `resources()` helper for RESTful routing with custom destroy route
- **Async Operations**: Demonstrates loading states with simulated delays
- **Redirects**: Server-style redirects after mutations
- **Form Handling**: Create and delete tasks via form submissions
- **Navigation States**: Loading indicators during async operations
- **Type-Safe Routing**: Full TypeScript support with route type inference
- **Component-Based UI**: Reusable task components

## Technology Stack

- **Router**: [@webstd-ui/router](../../packages/router)
- **UI Framework**: [@remix-run/dom](https://www.npmjs.com/package/@remix-run/dom)
- **Build Tool**: Vite
- **Language**: TypeScript
- **Async Utilities**: [@std/async](https://jsr.io/@std/async) for delays

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
├── components/     # Reusable UI components
│   ├── NewTask.tsx    # New task creation form
│   └── TaskItem.tsx   # Individual task component
├── lib/           # Utilities and data management
│   └── task-data.ts   # Task data storage
├── handlers.tsx   # Route handlers for all pages
├── routes.ts      # Route definitions
├── app.tsx        # Main application component
└── main.tsx       # Application entry point
```

## Routes

| Path | Method | Handler | Description |
|------|--------|---------|-------------|
| `/` | GET | `index` | Redirects to first task |
| `/task/new` | GET | `tasks.new` | New task form |
| `/task` | POST | `tasks.create` | Create new task |
| `/task/:id` | GET | `tasks.show` | View task details |
| `/task/destroy/:id` | POST | `tasks.destroy` | Delete task |

## Testing Loading States

This example includes artificial delays (800ms) in async handlers to make loading states visible during development. This helps test:

- Loading indicators during navigation
- Pending states in the UI
- Navigation state transitions
- User experience during async operations

## Learn More

- [Router Documentation](../../packages/router)
- [@remix-run/fetch-router Resources](https://www.npmjs.com/package/@remix-run/fetch-router) - Learn about resource routes
- [@remix-run/dom](https://www.npmjs.com/package/@remix-run/dom)

## License

See the root repository for license information.
