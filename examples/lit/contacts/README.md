# Contacts Example

A contact management application demonstrating the capabilities of [@webstd-ui/router](../../packages/router). This example is based on the [React Router address book tutorial](https://reactrouter.com/tutorials/address-book), adapted to use our framework-agnostic client-side router.

## Features

- **Contact Management**: Create, read, update, and delete contacts
- **Search Functionality**: Real-time contact search with URL integration
- **Favorite Contacts**: Mark contacts as favorites
- **Form Handling**: Demonstrates POST/PUT/DELETE form submissions
- **Navigation States**: Loading indicators and optimistic UI
- **URL-Driven State**: All state reflected in the URL
- **File-Based Routing**: Organized route structure in `src/routes/`

## Technology Stack

- **Router**: [@webstd-ui/router](../../packages/router)
- **UI Framework**: [lit](https://www.npmjs.com/package/lit)
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
├── components/     # Reusable UI components
├── lib/           # Utilities and data storage
├── routes/        # Route handlers for different pages
├── app.tsx        # Main application component
├── main.tsx       # Application entry point
└── index.css      # Global styles
```

## Learn More

- [Router Documentation](../../packages/router)
- [React Router Tutorial](https://reactrouter.com/tutorials/address-book) (original inspiration)
- [lit](https://www.npmjs.com/package/lit)
