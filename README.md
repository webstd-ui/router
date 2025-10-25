# @webstd-ui/router

A framework-agnostic client-side router built on top of `@remix-run/fetch-router` and `@remix-run/events`. This monorepo contains the core router package and example applications demonstrating its usage.

## Overview

This project provides a small, generic client-side router that can be integrated into any web application. It leverages the proven routing architecture from Remix/React Router while remaining independent of any specific UI framework.

## Repository Structure

```
router/
├── packages/
│   └── router/          # Core router package (@webstd-ui/router)
└── examples/
    ├── blog/            # Blog application example
    ├── contacts/        # Contact management example (SPA)
    └── tasks/           # Task management example
```

## Getting Started

### Prerequisites

This project uses [Mise](https://mise.jdx.dev/) for task automation and dependency management.

1. [Install Mise](https://mise.jdx.dev/installing-mise.html)
2. Install dependencies:
   ```sh
   mise install
   ```

### Development

The repository uses pnpm workspaces. To work on the router package:

```sh
# Install all dependencies
pnpm install

# Build the router package
cd packages/router
mise run :dev
```

### Running Examples

Each example application can be run independently:

```sh
# Run the contacts example
cd examples/contacts
mise run :dev

# Run the blog example
cd examples/blog
mise run :dev

# Run the tasks example
cd examples/tasks
mise run :dev
```

## Packages

### [@webstd-ui/router](./packages/router)

The core router package that provides framework-agnostic client-side routing capabilities.

**Features:**
- Framework-agnostic design
- Built on `@remix-run/fetch-router`
- Event-driven architecture using `@remix-run/events`
- TypeScript support
- ESM module format

## Examples

### [Contacts](./examples/contacts)

A contact management application demonstrating basic routing, data loading, and navigation. Based on the React Router address book tutorial.

### [Blog](./examples/blog)

A blog application example showcasing the router in a content-focused context.

### [Tasks](./examples/tasks)

A task management application demonstrating the router with state management and async operations.

## Technology Stack

- **Build Tool:** tsdown (router), Vite (examples)
- **Package Manager:** pnpm
- **Language:** TypeScript

## Contributing

This is a monorepo managed with pnpm workspaces. When making changes:

1. Make changes to the router package in `packages/router/`
2. Test your changes in one or more example applications
3. Ensure all TypeScript types are properly exported

## License

[MIT](LICENSE)
