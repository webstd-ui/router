# Remix v3

Remix 3 is not related in any way to the previous versions of Remix nor React Router; they are just created by the same team.

## Eventing

Remix 3 starts from events as its first principles since events are extraordinarily fundamental to interactive user interfaces on the web. To compliment these first principles, Remix 3 includes the `@remix-run/events` package, which provides a type-safe abstraction on top of DOM events and event composition.

Now instead of doing this:

```ts
const button = document.createElement("button");

let tempo = 0;

const handleTap = () => {
    // update average tempo
    button.textContent = tempo;
};

// Handle click events
button.addEventListener("pointerdown", handleTap);
// Handle keyboard events
button.addEventListener("keydown", event => {
    if (event.repeat) return;
    if (event.key === "Enter" || event.key === " ") {
        handleTap();
    }
});
```

You can simply do this:

```ts
import { events, dom } from "@remix-run/events";

const button = document.createElement("button");

let tempo = 0;

const handleTap = () => {
    // update average tempo
    button.textContent = tempo;
};

events(button, [
    dom.pointerdown(handleTap),
    dom.keydown(event => {
        if (event.repeat) return;
        if (event.key === "Enter" || event.key === " ") {
            handleTap();
        }
    }),
]);
```

The `dom` object includes type-safe event properties for DOM nodes. There is also a `win` object available from `@remix-run/events` which includes type-safe event properties for the global `window` object.

The example above can be farther simplified with some composed events shipped along with `@remix-run/events`, like so:

```ts
import { events, dom } from "@remix-run/events";
import { pressDown } from "@remix-run/events/press";

const button = document.createElement("button");

let tempo = 0;

const handleTap = () => {
    // update average tempo
    button.textContent = tempo;
};

events(button, [pressDown(handleTap)]);
```

`@remix-run/events` also includes an encapsulation and composition mechanism for creating your own type-safe events:

```ts
import { createInteraction, events } from "@remix-run/events";
import { pressDown } from "@remix-run/events/press";

// a 1-indexed range
function range(end: number) {
    return Array.from({ length: end }, (_, i) => i + 1);
}

export const tempo = createInteraction<HTMLButtonElement, number>(
    "rmx:tempo", // custom event name
    ({ target, dispatch }) => {
        let taps: number[] = [];
        let timerHandle;

        function handleTap() {
            clearTimeout(timerHandle);

            taps.push(new Date());
            taps = taps.filter(tap => Date.now() - tap > 4000);

            if (taps.length >= 4) {
                let intervals: Date[] = [];

                for (const i of range(taps.length)) {
                    intervals.push(taps[i] - taps[i - 1]);
                }

                let bpm = intervals.map(i => 60000 / i);
                let avgTempo = Math.round(bpm.reduce((sum, value) => sum + value, 0) / bpm.length);

                // `dispatch` takes a CustomEventInit generic over the second generic
                // argument for `createInteraction`; in this case CustomEventInit<number>
                dispatch({ detail: avgTempo });

                timerHandle = setTimeout(() => {
                    taps = [];
                }, 4000);
            }
        }

        return events(target, [pressDown(handleTap)]);
    }
);
```

This can then be used like so:

```ts
import { events } from "@remix-run/events";
import { tempo } from "./events.ts";

const button = document.createElement("button");

events(button, [
    tempo(event => {
        button.textContent = event.detail;
    }),
]);
```

If you have an `EventTarget` class that you want to include type-safe events with, a good practice is to assign them as static properties on the class itself so they can be used like so:

```ts
const [change, createChange] = createEventType("drum:change");
const [kick, createKick] = createEventType("drum:kick");
const [snare, createSnare] = createEventType("drum:snare");
const [hat, createHat] = createEventType("drum:hat");

class Drummer extends EventTarget {
    static change = change;
    static kick = kick;
    static snare = snare;
    static hat = hat;

    // ...

    someFunc() {
        someState += 1;
        this.dispatchEvent(createChange());
    }
}

// Later in a component:

const drummer = new Drummer({ bpm: 120 });
events(drummer, [Drummer.change(() => this.update())]);
```

This pattern is a handy way to propagate change/update management from custom state to your components.

### Key Events

The subfolder `@remix-run/events/key` provides a set of semantic keyboard events which can be used instead of the default `dom/win.keydown()` events.

```ts
import { events } from "@remix-run/events";
import { space, arrowUp, arrowDown } from "@remix-run/events/key";

events(window, [
    space(() => {
        // handle space press on the window
    }),
    arrowUp(() => {
        // handle arrow up press on the window
    }),
    arrowDown(() => {
        // handle arrow down press on the window
    }),
]);
```

### Cleanup

`event()` returns a cleanup function which can be used to remove event listeners when no longer needed.

```ts
const cleanup = events(button, [
    pressDown(() => {
        // ...
    }),
]);

// Later
cleanup();
```

## Components

Remix 3 uses JSX/TSX with the standard JSX transform and a custom virtual DOM reconciler which can handle diffing both client-side vDOM trees as well as HTML fragments received from the server. This is an example of a simple counter component in Remix 3:

```tsx
import type { Remix } from "@remix-run/dom";
import { dom } from "@remix-run/events";

function Counter(this: Remix.Handle) {
    let count = 1;

    return () => (
        <>
            <div>
                Double {count} is {count * 2}
            </div>
            <button
                on={dom.click(() => {
                    count += 1;
                    this.update();
                })}
            >
                Increment
            </button>
        </>
    );
}
```

Like above, you can use the type-safe event composition layer in your declarative components as well. Every JSX element has an `on` prop which can be passed type-safe event handler or an array of type-safe event handlers.

Your component function (similar to a setup script in Vue or class constructor in Lit) is run once on component creation and from this component function you return a render function which itself returns a vDOM tree. The `this` argument to the component function is a handle to the internal component instance on which you can call `this.update()` (similar to `this.requestUpdate()` in Lit). When `this.update()` is called, the render function is re-run and the resulting vDOM tree is diffed with the previous tree and necessary resulting updates are made directly to the DOM.

### Props

Props can be passed to the component function as an optional second argument (after the `this` argument) in addition to being passed to the render function as an optional first argument:

```tsx
import type { Remix } from "@remix-run/dom";

type CartButtonProps = { inCart: boolean; id: string; slug: string };

function CartButton(this: Remix.Handle, props: CartButtonProps) {
    // do something in the component function with `props`

    return (props: CartButtonProps) => (
        // do something in the render function with `props`
        <form>
            <input type="hidden" name="bookId" value={props.id} />
            <input type="hidden" name="slug" value={props.slug} />
            <input type="hidden" name="redirect" value="none" />
            <button type="submit">{props.inCart ? "Remove from Cart" : "Add to Cart"}</button>
        </form>
    );
}
```

### State Management

Since the only action necessary to re-render your component is to call `this.update()`, there is no need for a built-in state management solution for Remix 3. You can declare plain JavaScript variables in your component function, read them in your render function, mutate them and call `this.update()` in your event handlers, and everything should update. However, you will need to be careful about under-updating (forgetting to call `this.update()` when you need to) with this method.

Derived state can be accomplished by using simple closures or declaring derived state in the render function:

```tsx
import type { Remix } from "@remix-run/dom";
import { dom } from "@remix-run/events";

// simple closures
function Counter(this: Remix.Handle) {
    let count = 1;
    const double = () => count * 2;

    const increment = () => {
        count += 1;
        this.update();
    };

    return () => (
        <>
            <div>
                Double {count} is {double()}
            </div>
            <button on={dom.click(increment)}>Increment</button>
        </>
    );
}

// declaring derived state in the render function
function Counter(this: Remix.Handle) {
    let count = 1;

    const increment = () => {
        count += 1;
        this.update();
    };

    return () => {
        const double = count * 2;

        return (
            <>
                <div>
                    Double {count} is {double}
                </div>
                <button on={dom.click(increment)}>Increment</button>
            </>
        );
    };
}

// declaring derived state (inline) in the render function
function Counter(this: Remix.Handle) {
    let count = 1;

    const increment = () => {
        count += 1;
        this.update();
    };

    return () => (
        <>
            <div>
                Double {count} is {count * 2}
            </div>
            <button on={dom.click(increment)}>Increment</button>
        </>
    );
}
```

### Events

It's a good idea to attach any custom events to your component function as static properties (similarly to how we attached custom type-safe events as static properties to the `EventTarget` subclass), using this pattern:

```tsx
const [change, createChange] = createEventType<{ value: string }>("listbox:change");
// -OR-
export const change = createInteraction<HTMLSelectElement, { value: string }>(
    "listbox:change",
    ({ target, dispatch }) => {
        // ...
    }
);

function Listbox(
    this: Remix.Handle,
    props: {
        name: string;
        on?: EventDescriptor<HTMLSelectElement> | EventDescriptor<HTMLSelectElement>[];
    }
) {
    // ...
}

Listbox.change = change;

// Later...

<Listbox
    name="fruit"
    on={Listbox.change(event => {
        listboxValue = event.detail.value;
        this.update();
    })}
>
    <Option value="apple">Apple</Option>
    <Option value="banana">Banana</Option>
    <Option value="cherry"> Cherry</Option>
</Listbox>;
```

### Styling

Every Remix 3 component includes a `css` prop, which can be passed the standard CSS-in-JS object format for CSS, including descender selectors and other complicated selectors. The `css` props for every element in the rendered tree are collected at runtime, either during server rendering or client rendering, hashed into class names and rulesets, and placed into a global stylesheet in the `<head>` of the current document (or sometimes in `document.adoptedStyleSheets` — I'm not entirely clear on the implementation here and when which method is used). This allows you to co-locate your styles with your component, in a type-safe way, without using stringy class names or complicated build tooling set-ups.

Here is an example of the `css` prop in action:

```tsx
<form
    css={{
        margin: "24px",
        display: "flex",
        gap: "16px",
        "& label": {
            display: "block",
            marginBottom: "4px",
        },
    }}
>
    {/* ... */}
</form>
```

Eventually, Remix 3 will also include a bespoke component library (`@remix-run/library`) similar to `shadcn/ui` and a theming system (`@remix-run/theme`) to go along with it — based on CSS custom properties — but those features are not available in this preview.

### Imperative DOM References

Occasionally you may need an imperative reference to the DOM node being rendered by an element in your declarative template. To manage these references, you can use the `connect()` and `disconnect()` events:

```tsx
import type { Remix } from "@remix-run/dom";
import { connect, disconnect } from "@remix-run/dom";
import { dom } from "@remix-run/events";

function Counter(this: Remix.Handle) {
    let count = 1;
    let incButton: HTMLButtonElement;
    let decButton: HTMLButtonElement;

    const increment = () => {
        count += 1;
        this.update();
        this.queueTask(() => {
            decButton?.focus();
        });
    };

    const decrement = () => {
        count -= 1;
        this.update();
        this.queueTask(() => {
            incButton?.focus();
        });
    };

    return () => (
        <>
            <div>
                Double {count} is {count * 2}
            </div>
            <button
                on={[connect(event => (incButton = event.currentTarget)), dom.click(increment)]}
            >
                Increment
            </button>
            <button
                on={[connect(event => (decButton = event.currentTarget)), dom.click(decrement)]}
            >
                Decrement
            </button>
        </>
    );
}
```

### Context

Context is type-safe via the generic argument on `Remix.Handle<Value>`. It can be accessed via `this.context.get(Component)` and set via `this.context.set(value)`.

```tsx
import type { Remix } from "@remix-run/dom";
import { Drummer } from "./drummer.ts";

function App(this: Remix.Handle<Drummer>) {
    const drummer = new Drummer({ bpm: 120 });
    this.context.set(drummer);

    () => <>{/* ... */}</>;
}

function DrumControls(this: Remix.Handle) {
    const drummer = this.context.get(App);
    events(drummer, [Drummer.change(() => this.update())]);

    () => <>{/* ... */}</>;
}
```

### Abort Signals

As a rule, any time you hand a closure to Remix 3, it will pass an `AbortSignal` into that closure as the last argument so that you're able to know when to bail out (on re-renders or parent cancellation or what have you).

```tsx
<select
    on={dom.change(async (event, signal) => {
        fetchState = "loading";
        this.update();

        const response = await fetch(`*/api/data?state=${event.currentTarget.value}`, { signal });
        cities = await response.json();
        if (signal.aborted) return;

        fetchState = "loaded";
        this.update();
    })}
/>
```

### Stateless Components

Stateless components can be functions which return JSX. They don't need to return a function which returns JSX is there is no state associated with that particular component.

```tsx
export function App() {
    return (
        <Layout>
            <Equalizer />
            <DrumControls />
        </Layout>
    );
}
```

### Client Entry

To create a client-side Remix app, you simply:

```tsx
import { createRoot } from "@remix-run/dom";
import { App } from "./app.tsx";

createRoot(document.body).render(<App />);
```

### Render Batching

Remix 3 batches it's renders into a microtask queue in order to de-duplicate renders. If you need to do some work after the render batch has flushed, you can use the `this.queueTask()` API on `Remix.Handle`.

```tsx
function TempoDisplay(this: Remix.Handle) {
    return () => (
        <button
            on={pressDown(() => {
                this.queueTask(() => {
                    // Do work after the next `this.update()` is called
                    // and rendering has completed
                });
            })}
        >
            Play
        </button>
    );
}
```

### Component Cleanup

When a stateful component is unmounted from the vDOM tree, it's `this.signal` (an `AbortSignal`) is aborted, so you can use `this.signal` to manage cleanup in components.

```tsx
function App(this: Remix.Handle) {
    let drummer = new Drummer(120);
    events(this.signal, [dom.abort(drummer.stop)]);

    return () => <>{/* ... */}</>;
}
```

## Routing

I have built a client router for Remix 3 based on another Remix project, the web-standard `@remix-run/fetch-router`.

### What this library gives you

-   **Client-side navigation** that mirrors the server router’s API: map routes (with methods), intercept link clicks and form submissions, and swap out an “outlet” node.
-   **Programmatic navigation & submissions** via `router.navigate()` and `router.submit()`.
-   **First-class form semantics** (method overrides, GET→URLSearchParams, JSON bodies).
-   **Redirect fidelity**: treat `Response` with `Location` (3xx) like server redirects.
-   **Per-navigation storage** via `AppStorage` identical to server `fetch-router`.
-   **Streaming HTML rendering** via `render(element)` which returns a `Response` that carries the original element for client re-use.

### Quick start

```ts
// apps/contacts-spa/src/main.tsx
import { createRoot } from "@remix-run/dom";
import { App } from "./app.tsx";
import "./index.css";

createRoot(document.body).render(<App />);
```

```ts
// apps/contacts-spa/src/app.tsx
import type { Remix } from "@remix-run/dom";
import { Router } from "remix-client-router";
import { routes } from "./routes/mod.ts";
import { index } from "./routes/index.tsx";
import { show } from "./routes/show-contact.tsx";
import { edit } from "./routes/edit-contaxt.tsx";
import { create, destroy, favorite, update } from "./routes/actions.ts";
import { getContacts, CONTACTS_KEY } from "./lib/contacts.ts";

const router = new Router();

// Map pages
router.map(routes.index, index);
router.map(routes.contact.show, show);
router.map(routes.contact.edit, edit);

// Map actions (mutations)
router.map(routes.contact.update, update);
router.map(routes.contact.create, create);
router.map(routes.contact.destroy, destroy);
router.map(routes.contact.favorite, favorite);

// Seed per-request storage
const contacts = await getContacts();
router.storage.set(CONTACTS_KEY, contacts);

export function App(this: Remix.Handle<typeof Router>) {
  this.context.set(router);
  return () => (/* mount UI, use router.outlet */);
}
```

#### Rendering pages

Return a `Response` produced by `render(element)`. The response streams HTML on the server and—critically—carries the original element on `response._element` so the client can swap it into `router.outlet` without a second render.

```ts
// packages/remix-client-router/src/render.ts
export function render(element: Remix.RemixElement, init?: ResponseInit) {
    const response = new Response(init);
    response._element = element; // <— captured for the client
    return response;
}
```

### Core concepts

#### Router lifecycle

-   **Interception**:
    -   Clicks on same-origin `<a>` without `target`, `download`, or `rel="external"`.
    -   Submits on `<form>` (or programmatic `router.submit`) honoring `_method` override.
-   **Resolve & call**: finds a registered route by pathname & method, then calls its handler with a typed context.
-   **Outlet update**: sets `router.outlet` to the returned node (or the captured `_element` from `render()`).
-   **Events**: dispatches `Router.update` (a type-safe `CustomEvent`) when navigation state changes.

```ts
// Subscribe in a component/agent
import { events } from "@remix-run/events";
import { Router } from "remix-client-router";

events(router, [Router.update(() => /* re-render */)]);
```

#### Navigation state

The router exposes **where you’re going** and **where you came from**:

```ts
router.navigating.to.state; // "idle" | "loading" | "submitting"
router.navigating.to.url; // URL during navigation
router.location; // last *settled* Location (after success)
router.outlet; // latest rendered node
```

Helpers for UI logic:

```ts
router.isActive("/contact/ryan-florence"); // exact/partial matching
router.isPending("/contact"); // matches pending target
```

#### Storage

`router.storage` is an `AppStorage` instance shared for the active navigation:

```ts
// apps/contacts-spa/src/app.tsx
router.storage.set(CONTACTS_KEY, contacts);

// read later (e.g., in components)
const list = router.storage.get(CONTACTS_KEY) || [];
```

This mirrors the server router’s storage semantics, letting handlers and UI share transient state.

### Route mapping & handlers

Use the same route definitions you would with `@remix-run/fetch-router`. Map either **single Route**s or a **RouteMap tree**.

```ts
// apps/contacts-spa/src/routes/mod.ts
import { resources, route } from "@remix-run/fetch-router";

export const routes = route({
    index: "/",
    contact: {
        ...resources("/contact", {
            only: ["show", "edit", "destroy", "update", "create"],
            param: "contactId",
        }),
        favorite: { method: "PUT", pattern: "/contact/:contactId/favorite" },
    },
});
```

**Handler typing** is inferred via `InferRouteHandler<typeof routes.somePath>` and the client router’s **ClientRouteContext**. Pages typically `return render(<jsx/>)`. Mutations often `return redirect(...)`.

```tsx
// apps/contacts-spa/src/routes/index.tsx
import { render } from "remix-client-router";
export const index = async ({ storage, url }) => {
    // fetch, update storage
    return render(<p id="index-page">This is a demo for Remix.</p>);
};
```

```tsx
// apps/contacts-spa/src/routes/actions.ts (mutation)
import { redirect } from "@remix-run/fetch-router";
export const update = async ({ params, formData }) => {
    // mutate
    return redirect(`/contact/${params.contactId}`);
};
```

#### Redirects

If a handler returns a `Response` with `3xx` and `Location`, the router throws an internal redirect and **navigates** (303/307 sets `replace`).

### Programmatic APIs

#### `router.navigate(to, options?)`

-   `to`: string | URL | Partial<Path> | number (relative not yet implemented—`number` resolves to current path).
-   Options: `{ replace?, preventScrollReset?, relative?, flushSync?, viewTransition? }`.

```ts
await router.navigate("/contact/jon-jensen");
```

#### `router.submit(target, options?)`

Accepts: `HTMLFormElement | FormData | URLSearchParams | JsonValue | null`.

-   For **GET** with `FormData`, values become `?search=params` and no body is sent.
-   For **JSON**, `encType` is forced to `"application/json"`.

```ts
// "search as you type"
router.submit(event.currentTarget.form, { replace: true });
```

### Optimistic updates

Use `router.optimistic(handler, { signal? })` to broadcast a synthetic `"rmx:optimistic"` event around a submit.

```tsx
// apps/contacts-spa/src/components/Favorite.tsx
<form
    method="POST"
    action={routes.contact.favorite.href({ contactId: props.id })}
    on={router.optimistic(
        evt => {
            optimisticFavorite = evt.detail ? evt.detail.get("favorite") === "true" : null;
            this.update();
        },
        { signal: this.signal }
    )}
>
    <input type="hidden" name="rmx-method" value="PUT" />
    <button name="favorite" value={favorite ? "false" : "true"}>
        ...
    </button>
</form>
```

-   Before the real submit runs, your handler receives the `FormData`.
-   After completion (unless aborted), it dispatches `null` to clear optimistics.

### Rendering strategy

Handlers should return **JSX via `render()`**:

```ts
import { render } from "remix-client-router";

export const show = async ({ params, storage, url }) => {
    // compute data, set storage…
    return render(<div id="contact">…</div>);
};
```

-   **If you return a `Response` that is not a redirect and lacks `._element`, the router will throw.** Always use `render()` for JSX.
-   **JSON responses** (`Content-Type: application/json`) will not change `router.outlet` (useful for background refetch patterns).

### Events & reactivity

-   The router is an `EventTarget`. Listen for `Router.update` to re-render your UI layer:

```ts
import { events } from "@remix-run/events";
import { Router } from "remix-client-router";

export function Details(this: Remix.Handle) {
    const router = this.context.get(App);
    events(router, [Router.update(() => this.update(), { signal: this.signal })]);
    return () => <div id="detail">{router.outlet}</div>;
}
```

### Link & form interception semantics

The router’s click/submit handlers follow these rules:

-   **Clicks**: only left-click, same-origin anchors, no `target`, no `download`, no `rel="external"`. `mailto:` is ignored.
-   **Forms**:
    -   Honors `<form target>` (skips if not `_self`).
    -   Skips if `action` is cross-origin.
    -   Supports `_method` override via hidden input.
    -   For `method="GET"`, serializes FormData into query string and **does not** send a body.

### Useful helpers for agents

-   **Active/Pending UI**:
    ```ts
    const link = routes.contact.show.href({ contactId: id });
    const className = router.isActive(link)
        ? "active"
        : router.isPending(link)
        ? "pending"
        : undefined;
    ```
-   **Search-as-you-type** that preserves history on first query and replaces thereafter:
    ```ts
    const isFirstSearch = props.query === undefined;
    router.submit(form, { replace: !isFirstSearch });
    ```
-   **Cancel/back** buttons:
    ```tsx
    import { dom } from "@remix-run/events";
    const goBack = dom.click(() => history.back());
    <button on={goBack} type="button">
        Cancel
    </button>;
    ```

### Types (for static agents)

Key exported types (see `src/types.ts`):

-   `FormMethod` / `HTMLFormMethod` / `FormEncType`
-   `JsonValue` and friends
-   `Path`, `To`, `NavigateOptions`, `SubmitOptions`
-   `Navigation`, `Navigating`
-   `ClientRouteContext`, `GetClientRouteContext`, `MutationClientRouteContext`
-   `ClientRouteHandler`, `ClientRouteHandlers<T extends RouteMap>`

These match `@remix-run/fetch-router` expectations but return **JSX nodes** instead of `Response` for page handlers.

### Example: end-to-end page

```ts
import type { InferRouteHandler } from "@remix-run/fetch-router";
import { render } from "remix-client-router";
import { getContacts, CONTACTS_KEY } from "~/lib/contacts.ts";
import { routes } from "~/routes/mod.ts";

export const show: InferRouteHandler<typeof routes.contact.show> = async ({
    params,
    storage,
    url,
}) => {
    const query = url.searchParams.get("q");
    const contacts = await getContacts(query);
    storage.set(CONTACTS_KEY, contacts);

    const contact = contacts.find(c => c.id === params.contactId)!;

    return render(
        <div id="contact">
            <img src={contact.avatar ?? "…placeholder…"} alt="" />
            <h1>
                {contact.first} {contact.last}
            </h1>
            {/* … */}
        </div>
    );
};
```

### Error & redirect behavior

-   Any thrown non-redirect error logs to console, resets `navigating.to` → `"idle"`, and re-emits `Router.update`.
-   Redirects are produced by returning a `Response` with `3xx` and `Location` (e.g., via `redirect()` from `@remix-run/fetch-router`); the client will navigate there. Status **303/307** use `history.replaceState`.

### Gotchas

-   **Always use `render()` for HTML**; returning a plain `Response` without the internal `_element` will cause an error.
-   **Cross-origin** links/forms are left to the browser; the router only handles same-origin SPA transitions.
-   **Relative `navigate(number)`** currently resolves to the current path (no history walking).
-   **JSON responses** from a handler deliberately **do not** change the outlet.

### Reference surface

#### Class: `Router`

-   `constructor()`
-   `map(routes: RouteMap, handlers: ClientRouteHandlers<RouteMap>): void`
-   `map(route: Route, handler: ClientRouteHandler): void`
-   `navigate(to: To, options?: NavigateOptions): Promise<void>`
-   `submit(target: SubmitTarget, options?: SubmitOptions): Promise<void>`
-   `optimistic(handler, { signal }?): EventHandlerWrapper`
-   Getters: `location`, `navigating`, `outlet`, `storage`
-   Helpers: `isActive(path, exact?)`, `isPending(path, exact?)`
-   Event: `Router.update` (`CustomEvent<void>`)

#### Function: `render(element, init?) => Response`

Returns an HTML `Response` and attaches `._element` for client reuse.

### Minimal mental model for an LLM agent

1. **Define routes** with `@remix-run/fetch-router` (including HTTP methods).
2. **Map** those routes to **handlers** on a single `Router` instance.
3. **Handlers** return `render(<jsx/>)` for pages or `redirect(...)` for mutations.
4. The **app mounts** `router.outlet` where your page content should appear.
5. Use `router.navigate()` / `router.submit()` for programmatic transitions.
6. **Re-render** on `Router.update` when `router.navigating` or `router.outlet` changes.

That’s it.
