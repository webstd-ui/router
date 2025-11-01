import { doc, dom, events, win, type EventDescriptor } from "@remix-run/events";
import { createEventFactory } from "./events.ts";
import {
    RoutePattern,
    type Join,
    type Params,
    type RoutePatternOptions,
} from "@remix-run/route-pattern";
import { nav } from "./targets.ts";

export * from "./storage.ts";
export * from "./targets.ts";

// MARK: Types

/** Parsed representation of a URL used by the router helpers. */
export interface Path {
    /**
     * A URL pathname, beginning with a /.
     */
    pathname: string;
    /**
     * A URL search string, beginning with a ?.
     */
    search: string;
    /**
     * A URL fragment identifier, beginning with a #.
     */
    hash: string;
}

// MARK: Route state

export namespace RouteState {
    /** Fine-grained navigation states the router can report. */
    export interface NavigationStates {
        Idle: {
            state: "idle";
            location: undefined;
            url: undefined;
        };
        Loading: {
            state: "loading";
            location: Location;
            url: URL;
        };
    }
    /** Union of all navigation states exposed via {@link Navigating}. */
    export type Navigation = NavigationStates[keyof NavigationStates];

    /** Pair of navigation states describing where the router is coming from and going to. */
    export interface Navigating {
        to: Navigation;
        from: Navigation;
    }
}

export interface RouteState<Renderable> {
    /**
     * Latest resolved browser location after the most recent successful navigation.
     * Mirrors `window.location`, but only updates once the router finishes loading.
     */
    location: Location;

    /**
     * The current location as a URL object.
     * Provides convenient access to search params and other URL properties.
     */
    url: URL;

    /**
     * Current navigation status, including the route being left and the route being entered.
     * This is useful for rendering loading indicators or optimistic UI.
     */
    navigating: RouteState.Navigating;

    /**
     * The latest rendered node returned by the matched route handler.
     * Consumers can mount this node inside their application's root.
     */
    outlet: Renderable | null;

    params: Record<string, string>;
}

// MARK: Event Types

export class RouteStateEvent<Renderable> extends Event implements RouteState<Renderable> {
    static name = "@webstd-ui/router:change";

    location: Location;
    url: URL;
    navigating: RouteState.Navigating;
    outlet: Renderable | null;
    params: Record<string, string>;

    constructor(
        state: {
            location: Location;
            url: URL;
            navigating: RouteState.Navigating;
            outlet: Renderable | null;
            params: Record<string, string>;
        },
        init?: EventInit
    ) {
        super(RouteStateEvent.name, {
            bubbles: true,
            cancelable: true,
            ...init,
        });

        this.location = state.location;
        this.url = state.url;
        this.navigating = state.navigating;
        this.outlet = state.outlet;
        this.params = state.params;
    }
}

export class SearchStateEvent<Value extends string | undefined> extends Event {
    static name = "@webstd-ui/search-state:change";

    value: Value;

    constructor(value: Value, init?: EventInit) {
        super(SearchStateEvent.name, init);
        this.value = value;
    }
}

export class SearchState<Value extends string | undefined> extends EventTarget {
    #change = createEventFactory<SearchStateEvent<Value>>(SearchStateEvent.name);
    change = this.#change.bind;

    #router: Router<any, any>;
    #param: string;
    #value: Value;
    #isFirstChange = true;

    get value(): Value {
        return this.#value;
    }

    set value(newValue: Value) {
        console.log("[SearchState.value setter] Called with:", newValue);
        console.log("[SearchState.value setter] Current value:", this.#value);

        if (newValue === this.#value) {
            console.log("[SearchState.value setter] No change, returning early");
            return;
        }

        console.log("[SearchState.value setter] Value changed, updating URL");

        // Update the URL with the new search param value
        const url = new URL(this.#router.url);

        if (newValue === undefined || newValue === "") {
            url.searchParams.delete(this.#param);
        } else {
            url.searchParams.set(this.#param, newValue);
        }

        const fullUrl = url.pathname + url.search + url.hash;
        console.log("[SearchState.value setter] Updating browser URL to:", fullUrl);

        // Update browser URL directly without triggering route re-render
        // Search param changes shouldn't cause the entire route to re-render
        if ("navigation" in window) {
            // Use Navigation API if available
            const navigationMethod = this.#isFirstChange ? "push" : "replace";
            console.log("[SearchState.value setter] Using Navigation API with:", navigationMethod);
            (window.navigation as any).navigate(fullUrl, {
                history: navigationMethod
            });
        } else {
            // Fall back to History API
            if (this.#isFirstChange) {
                console.log("[SearchState.value setter] Using history.pushState");
                window.history.pushState({}, "", fullUrl);
            } else {
                console.log("[SearchState.value setter] Using history.replaceState");
                window.history.replaceState({}, "", fullUrl);
            }
        }

        // Update internal value
        this.#value = newValue;

        this.#isFirstChange = false;
        console.log("[SearchState.value setter] Done");
    }

    constructor(router: Router<any, any>, param: string, options: { defaultValue?: string }) {
        super();

        this.#router = router;
        this.#param = param;

        // Initialize value from current URL or default
        const currentValue = router.url.searchParams.get(param);
        this.#value = (currentValue ?? options.defaultValue) as Value;

        // Listen to router changes to update the value
        events(router, [
            router.change(({ url }) => {
                const newValue = url.searchParams.get(this.#param);
                const value = (newValue ?? options.defaultValue) as Value;

                // Only update and dispatch if the value actually changed
                if (this.#value !== value) {
                    this.#value = value;
                    this.#dispatchState();
                }
            }),
        ]);
    }

    #dispatchState() {
        const event = this.#change.createEvent(new SearchStateEvent(this.value));
        this.dispatchEvent(event);
    }
}

export function createSearchState(
    router: Router<any, any>,
    param: string,
    options?: { defaultValue?: undefined }
): SearchState<string | undefined>;
export function createSearchState(
    router: Router<any, any>,
    param: string,
    options?: { defaultValue: string }
): SearchState<string>;
export function createSearchState(
    router: Router<any, any>,
    param: string,
    options: { defaultValue?: string } = {}
) {
    return new SearchState(router, param, options);
}

// MARK: Router

export namespace Router {
    /**
     * Configuration for a single route in the router.
     * @template Renderable - The type of content that will be rendered by this route
     * @template Path - The URL pattern string type for type-safe parameter extraction
     */
    export interface Route<Renderable, Path extends string> {
        /** Optional name for the route, useful for debugging and logging */
        name?: string;
        /** URL pattern to match against incoming requests */
        pattern: RoutePattern<Path>;
        /** Function that renders the route content given the extracted URL parameters */
        render: (params: Params<Path>) => Renderable;
        /**
         * Optional guard function called before rendering.
         * Return false to prevent navigation to this route.
         */
        enter?: (params: Params<Path>, url: URL) => Promise<boolean> | boolean;
    }

    /**
     * Array of route configurations that the router will match against.
     * @template Renderable - The type of content that will be rendered by routes
     */
    export type Routes<Renderable> = Router.Route<Renderable, string>[];

    /** Options accepted by {@link Router.navigate | Router.navigate}. */
    export interface NavigateOptions {
        /** Replace the current entry in the history stack instead of pushing a new one */
        replace?: boolean;
        /** Prevent the scroll position from being reset to the top of the window when navigating */
        // preventScrollReset?: boolean;
        /** AbortSignal to cancel this navigation if needed */
        signal?: AbortSignal;
    }

    /**
     * Represents a navigation target that can be passed to {@link Router.navigate}.
     * Can be a string path, URL object, or partial path object with pathname/search/hash.
     */
    export type To = string | URL | Partial<Path>;

    /**
     * Configuration options for the Router constructor.
     */
    export interface Options {
        /** Signal that will abort the router when triggered */
        signal: AbortSignal;
        /**
         * Whether to automatically enhance all anchor tags and forms for client-side navigation.
         * @default true
         */
        globallyEnhance?: boolean;
    }
}

/**
 * A rendering-agnostic nested router for client-side navigation.
 *
 * The Router class provides client-side routing with support for nested routes,
 * navigation guards, and both the modern Navigation API and fallback history API.
 *
 * @template Renderable - The type of content that routes will render (e.g., JSX elements, HTML strings, DOM nodes)
 *
 * @example
 * ```ts
 * const router = new Router([
 *   { pattern: new RoutePattern("/"), render: () => <HomePage /> },
 *   { pattern: new RoutePattern("/about"), render: () => <AboutPage /> },
 * ], { signal: controller.signal });
 * ```
 */
class Router<Renderable, const R extends RouteDefs<Renderable>>
    extends EventTarget
    implements RouteState<Renderable>
{
    // MARK: Static members
    /**
     * The origin of the current page.
     * Cached since it cannot change during the lifetime of the page.
     */
    static origin =
        typeof window !== "undefined"
            ? window.location.origin || `${window.location.protocol}//${window.location.host}`
            : "";

    /**
     * Returns the tail of a pathname groups object. This is the match from a
     * wildcard at the end of a pathname pattern, like `/foo/*`
     */
    static #getTailGroup(groups: { [key: string]: string | undefined }) {
        // TODO: Can/should we replace some of this logic with `RoutePattern.match()`?
        let tailKey: string | undefined;
        for (const key of Object.keys(groups)) {
            if (/\d+/.test(key) && (tailKey === undefined || key > tailKey!)) {
                tailKey = key;
            }
        }
        return tailKey && groups[tailKey];
    }

    // MARK: Private properties
    #routes: R;
    #flatRoutes: Router.Route<Renderable, string>[] = [];
    #parent?: Router<Renderable, any>;

    // State storage
    #location: Location = typeof window !== "undefined" ? window.location : ({} as Location);
    #navigating: RouteState.Navigating = {
        to: { state: "idle", location: undefined, url: undefined },
        from: { state: "idle", location: undefined, url: undefined },
    };
    #outlet: Renderable | null = null;
    #params: Record<string, string> = {};
    #currentRoute?: Router.Route<Renderable, string>;

    // MARK: Stored properties
    /**
     * Child routers that handle nested routes.
     * Automatically populated when child routers are created with this router as parent.
     */
    children: Router<Renderable, any>[] = [];

    // MARK: Events
    #change = createEventFactory<RouteStateEvent<Renderable>, this>(RouteStateEvent.name);
    /**
     * Event binding helper for listening to router state changes.
     * Use this with the events() function from @remix-run/events to react to navigation.
     *
     * @example
     * ```ts
     * events(router, [router.change(() => {
     *   // Router state has changed
     *   console.log(router.location, router.outlet);
     * })]);
     * ```
     */
    get change() {
        return this.#change.bind;
    }

    #dispatchChange() {
        const event = this.#change.createEvent(
            new RouteStateEvent({
                location: this.location,
                url: this.url,
                navigating: this.navigating,
                outlet: this.outlet,
                params: this.params,
            })
        );
        this.dispatchEvent(event);
    }

    // MARK: Constructor
    constructor(
        routesOrParent: R | Router<Renderable, R>,
        routesOrOptions: R | Router.Options | undefined,
        options?: Router.Options
    ) {
        super();

        if (routesOrParent instanceof Router) {
            // We are a child route
            const opts = options!;
            this.#routes = routesOrOptions as R;
            this.#flattenRoutes(this.#routes);

            this.#parent = routesOrParent;
            this.#parent.children.push(this);

            const dispose = events(opts.signal, [
                dom.abort(() => {
                    // When our enclosing instance is aborted,
                    // remove ourself from our parent's children:
                    // `>>> 0` converts -1 to 2**32-1
                    const children = this.#parent!.children;
                    children.splice(children.indexOf(this));

                    dispose();
                }),
            ]);

            // Propagate tail match to children if present
            const tailGroup = Router.#getTailGroup(this.params);
            if (tailGroup !== undefined) {
                for (const child of this.children) {
                    child.navigate(tailGroup, options);
                }
            }
        } else {
            // We are a root route
            const opts = routesOrOptions as Router.Options;
            this.#routes = routesOrParent;
            this.#flattenRoutes(this.#routes);

            if (typeof window !== "undefined") {
                opts.globallyEnhance = opts.globallyEnhance ?? true;
                // Let the user choose whether they want to enhance all <a> navigations
                // If not they can use `Router.enhanceLink` to enhance specific <a>'s
                if (opts.globallyEnhance) {
                    if ("navigation" in window) {
                        // If we're in a Chromium browser, let's use window.navigation to drive global routing
                        events(window.navigation, [
                            nav.navigate(
                                event => {
                                    // Intercept if this is a same-document navigation
                                    if (
                                        event.canIntercept &&
                                        !event.hashChange &&
                                        event.destination.url
                                    ) {
                                        const url = new URL(event.destination.url);
                                        // Only intercept same-origin navigations
                                        if (url.origin === Router.origin) {
                                            event.intercept({
                                                handler: async () => {
                                                    // Call the internal navigation method directly
                                                    await this.#performNavigation(
                                                        url.pathname + url.search + url.hash
                                                    );
                                                },
                                            });
                                        }
                                    }
                                },
                                { signal: opts.signal }
                            ),
                        ]);
                    } else {
                        // If we're in a WebKit/Gecko browser, we have to use document.onclick and
                        // window.onpopstate to drive global routing
                        events(document, [
                            doc.click(
                                event => {
                                    // Find the anchor element in the composed path
                                    const anchor = event
                                        .composedPath()
                                        .find(
                                            (n): n is HTMLAnchorElement =>
                                                (n as HTMLElement).tagName === "A"
                                        );

                                    if (!anchor) {
                                        return;
                                    }

                                    this.#handleLinkClick(event, anchor);
                                },
                                { signal: opts.signal }
                            ),
                        ]);

                        events(window, [
                            win.popstate(
                                () => {
                                    // Navigate to the current location when back/forward is pressed
                                    void this.navigate(
                                        window.location.pathname +
                                            window.location.search +
                                            window.location.hash,
                                        {
                                            replace: true, // Use replace since history already changed
                                        }
                                    );
                                },
                                { signal: opts.signal }
                            ),
                        ]);
                    }
                }

                // Initial navigation to current location
                void this.navigate(
                    window.location.pathname + window.location.search + window.location.hash,
                    {
                        replace: true,
                    }
                );
            }
        }
    }

    // MARK: Getters

    /**
     * Latest resolved browser location after the most recent successful navigation.
     * Mirrors `window.location`, but only updates once the router finishes loading.
     */
    get location(): Location {
        return this.#location;
    }

    /**
     * The current location as a URL object.
     * Provides convenient access to search params and other URL properties.
     */
    get url(): URL {
        return new URL(
            this.location.pathname + this.location.search + this.location.hash,
            Router.origin
        );
    }

    /**
     * Current navigation status, including the route being left and the route being entered.
     * This is useful for rendering loading indicators or optimistic UI.
     */
    get navigating(): RouteState.Navigating {
        return this.#navigating;
    }

    /**
     * The latest rendered node returned by the matched route handler.
     * Consumers can mount this node inside their application's root.
     */
    get outlet(): Renderable | null {
        return this.#outlet;
    }

    /**
     * The current route parameters extracted from the URL.
     * For example, if the route pattern is "/users/:id" and the URL is "/users/123",
     * this will be `{ id: "123" }`.
     */
    get params(): Record<string, string> {
        return this.#params;
    }

    /**
     * The array of route configurations registered with this router.
     * Useful for accessing route patterns to generate URLs with their `.href()` method.
     *
     * @example
     * ```ts
     * const contactRoute = router.routes.find(r => r.name === "contact");
     * const url = contactRoute?.pattern.href({ id: "123" });
     * ```
     */
    get routes(): RouteDefs<Renderable> {
        return this.#routes;
    }

    /**
     * The currently matched route, or undefined if no route is matched yet.
     * Useful for accessing the current route's pattern to generate related URLs.
     *
     * @example
     * ```ts
     * const currentPattern = router.currentRoute?.pattern;
     * const editUrl = currentPattern?.href({ ...router.params, action: "edit" });
     * ```
     */
    get currentRoute(): Router.Route<Renderable, string> | undefined {
        return this.#currentRoute;
    }

    // MARK: Methods

    /**
     * Programmatically navigate to a new location.
     *
     * This updates browser history, resolves the target against registered routes, and updates
     * the outlet with the resulting renderable node.
     *
     * @param to - Target location (string, URL, or partial path object).
     * @param options - Navigation behavior overrides such as history replacement.
     */
    async navigate(to: Router.To, options: Router.NavigateOptions = {}): Promise<void> {
        // If the Navigation API is available, use it
        if ("navigation" in window) {
            const path = this.#resolveTo(to);
            const url = new URL(path, Router.origin);
            const fullUrl = url.pathname + url.search + url.hash;

            // Use Navigation API for programmatic navigation
            const { finished } = window.navigation.navigate(fullUrl, {
                history: options.replace ? "replace" : "push",
            });
            await finished;
            return; // Navigation API handler will call #performNavigation
        }

        // Otherwise, perform navigation directly (for child routers or when Navigation API is not available)
        await this.#performNavigation(to, options);
    }

    /**
     * Internal method that performs the actual navigation logic.
     * Called by either navigate() (when Navigation API is not available) or by the Navigation API intercept handler.
     */
    async #performNavigation(to: Router.To, options: Router.NavigateOptions = {}): Promise<void> {
        // If aborted, bail out early
        if (options.signal?.aborted) {
            return;
        }

        const path = this.#resolveTo(to);
        const url = new URL(path, Router.origin);

        // Update navigating state to loading
        this.#navigating = {
            from: { state: "idle", location: undefined, url: undefined },
            to: {
                state: "loading",
                location: url as any as Location,
                url: url,
            },
        };
        this.#dispatchChange();

        try {
            // Match route
            const match = this.#matchRoute(url);
            if (!match) {
                console.warn(`No route found for ${url.pathname}`);
                // Reset navigating state
                this.#navigating = {
                    from: { state: "idle", location: undefined, url: undefined },
                    to: { state: "idle", location: undefined, url: undefined },
                };
                this.#dispatchChange();
                return;
            }

            const { route, params } = match;

            // Check if we should abort
            if (options.signal?.aborted) {
                return;
            }

            // Call enter guard if present
            if (route.enter) {
                const shouldEnter = await route.enter(params, url);
                if (shouldEnter === false) {
                    // Navigation cancelled by guard
                    this.#navigating = {
                        from: { state: "idle", location: undefined, url: undefined },
                        to: { state: "idle", location: undefined, url: undefined },
                    };
                    this.#dispatchChange();
                    return;
                }
            }

            // Check again if aborted after async enter guard
            if (options.signal?.aborted) {
                return;
            }

            // Update browser history (only for root router when Navigation API is NOT available)
            // When Navigation API is available, it handles history updates automatically
            const hasNavigationAPI = "navigation" in window;
            if (!this.#parent && !hasNavigationAPI) {
                const fullUrl = url.pathname + url.search + url.hash;
                if (options.replace) {
                    window.history.replaceState({}, "", fullUrl);
                } else {
                    window.history.pushState({}, "", fullUrl);
                }
            }

            // Render the route
            const outlet = route.render(params);

            // Update state
            this.#location = url as any as Location;
            this.#outlet = outlet;
            this.#params = params;
            this.#currentRoute = route;

            // Reset navigating state to idle
            this.#navigating = {
                from: { state: "idle", location: undefined, url: undefined },
                to: { state: "idle", location: undefined, url: undefined },
            };

            // Dispatch change event
            this.#dispatchChange();

            // Propagate tail match to children if present
            const tailGroup = Router.#getTailGroup(params);
            if (tailGroup !== undefined) {
                for (const child of this.children) {
                    await child.navigate(tailGroup, options);
                }
            }
        } catch (error) {
            console.error("Navigation error:", error);
            // Reset navigating state on error
            this.#navigating = {
                from: { state: "idle", location: undefined, url: undefined },
                to: { state: "idle", location: undefined, url: undefined },
            };
            this.#dispatchChange();
            throw error;
        }
    }

    /**
     * Check if a path is currently active.
     * Supports partial matching - e.g., isActive("/blog") returns true for "/blog/post/1"
     * @param path - The path to check
     * @param exact - If true, requires exact match. Default is false (partial match)
     */
    isActive(path: string | URL | Partial<Path> | undefined, exact = false): boolean {
        if (!path) {
            return false;
        }

        const pathString = this.#pathToString(path);
        const currentPath = this.#location.pathname;

        if (exact) {
            return currentPath === pathString;
        }

        // Partial match: check if current path starts with the given path
        return currentPath.startsWith(pathString);
    }

    /**
     * Check if a path is currently pending navigation.
     * Supports partial matching - e.g., isPending("/blog") returns true when navigating to "/blog/post/1"
     * @param path - The path to check
     * @param exact - If true, requires exact match. Default is false (partial match)
     */
    isPending(path: string | URL | Partial<Path> | undefined, exact = false): boolean {
        if (!path) {
            return false;
        }

        // Check if we're in a loading state
        if (this.#navigating.to.state !== "loading") {
            return false;
        }

        const pathString = this.#pathToString(path);
        const pendingPath = this.#navigating.to.url?.pathname;

        if (!pendingPath) {
            return false;
        }

        if (exact) {
            return pendingPath === pathString;
        }

        // Partial match: check if pending path starts with the given path
        return pendingPath.startsWith(pathString);
    }

    /**
     * Helper method that returns different values based on whether a path is active or pending.
     * Useful for conditional rendering or styling.
     *
     * @param path - The path to check
     * @param options - Object with `active` and `pending` values to return
     * @returns The `active` value if path is active, `pending` value if path is pending, or undefined otherwise
     *
     * @example
     * ```ts
     * const className = router.when("/dashboard", {
     *   active: "text-blue-600 font-bold",
     *   pending: "text-gray-400 animate-pulse"
     * });
     * ```
     */
    when<T>(
        path: string | URL | Partial<Path> | undefined,
        options: { active: T; pending?: undefined }
    ): T | undefined;
    when<U>(
        path: string | URL | Partial<Path> | undefined,
        options: { active?: undefined; pending: U }
    ): U | undefined;
    when<T, U>(
        path: string | URL | Partial<Path> | undefined,
        options: { active: T; pending: U }
    ): T | U | undefined;
    when<T, U>(
        path: string | URL | Partial<Path> | undefined,
        options: { active: T; pending: U }
    ): T | U | undefined {
        if (this.isActive(path)) {
            return options.active;
        }

        if (this.isPending(path)) {
            return options.pending;
        }

        return undefined;
    }

    /**
     * Click event handler for links that routes navigation through the router.
     * Use this with event listeners for links when you need manual control.
     *
     * Can be used in combination with the `{ globallyEnhance: false }` Router constructor option.
     *
     * @example
     * ```tsx
     * <a href={href} on={router.enhanceLink()}>...</a>
     * ```
     */
    enhanceLink(options: AddEventListenerOptions = {}): EventDescriptor<HTMLAnchorElement> {
        return dom.click<HTMLAnchorElement>(
            event => this.#handleLinkClick(event, event.currentTarget),
            options
        );
    }

    // MARK: Private methods

    /**
     * Recursively flattens the nested RouteDefs structure into a flat array of routes.
     * This makes route matching more efficient by avoiding recursive traversal during navigation.
     */
    #flattenRoutes(routes: RouteDefs<Renderable>, parentKey = ""): void {
        for (const key in routes) {
            const value = routes[key];
            const fullKey = parentKey ? `${parentKey}.${key}` : key;

            // Check if value is a Route instance (extends RoutePattern)
            if (value instanceof Route) {
                this.#flatRoutes.push({
                    name: fullKey,
                    pattern: value as unknown as RoutePattern<string>,
                    render: value.render as (params: Params<string>) => Renderable,
                    enter: (value as any).enter,
                });
            }
            // Check if it's a RouteDef object
            else if (
                typeof value === "object" &&
                value !== null &&
                "pattern" in value &&
                "render" in value
            ) {
                const routeDef = value as RouteDef<Renderable>;
                this.#flatRoutes.push({
                    name: fullKey,
                    pattern: new RoutePattern(routeDef.pattern),
                    render: routeDef.render,
                    enter: routeDef.enter,
                });
            }
            // Otherwise it's a nested RouteDefs object
            else {
                this.#flattenRoutes(value as RouteDefs<Renderable>, fullKey);
            }
        }
    }

    /**
     * Handles link click navigation logic.
     * Checks if the anchor should be handled by the router and navigates if so.
     * @returns true if navigation was handled, false otherwise
     */
    #handleLinkClick(event: MouseEvent, anchor: HTMLAnchorElement): boolean {
        const isNonNavigationClick =
            event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey;

        if (event.defaultPrevented || isNonNavigationClick) {
            return false;
        }

        if (
            anchor.target !== "" ||
            anchor.hasAttribute("download") ||
            anchor.getAttribute("rel") === "external"
        ) {
            return false;
        }

        const href = anchor.getAttribute("href") ?? anchor.href;
        if (href === "" || href.startsWith("mailto:")) {
            return false;
        }

        if (anchor.origin !== Router.origin) {
            return false;
        }

        event.preventDefault();
        const targetPath = anchor.pathname + anchor.search + anchor.hash;
        if (href !== window.location.href) {
            void this.navigate(targetPath);
        }
        return true;
    }

    /**
     * Matches the given URL against registered routes and returns the best match.
     * @returns The matched route and extracted parameters, or undefined if no match found
     */
    #matchRoute(
        url: URL
    ): { route: Router.Route<Renderable, string>; params: Params<string> } | undefined {
        for (const route of this.#flatRoutes) {
            const match = route.pattern.match(url);
            if (match) {
                return { route, params: match.params };
            }
        }
        return undefined;
    }

    #resolveTo(to: Router.To): string {
        if (typeof to === "string") {
            return to;
        }
        if (to instanceof URL) {
            return to.pathname + to.search + to.hash;
        }
        // Partial<Path>
        const pathname = to.pathname || window.location.pathname;
        const search = to.search ? (to.search.startsWith("?") ? to.search : `?${to.search}`) : "";
        const hash = to.hash ? (to.hash.startsWith("#") ? to.hash : `#${to.hash}`) : "";
        return pathname + search + hash;
    }

    #pathToString(path: string | URL | Partial<Path>): string {
        if (typeof path === "string") {
            return path;
        }
        if (path instanceof URL) {
            return path.pathname;
        }
        return path.pathname || "";
    }
}

export type { Router };

export function createRouter<Renderable, const R extends RouteDefs<Renderable>>(
    parent: Router<Renderable, any>,
    routes: R,
    options: Router.Options
): Router<Renderable, R>;
export function createRouter<Renderable, const R extends RouteDefs<Renderable>>(
    routes: R,
    options: Router.Options
): Router<Renderable, R>;
export function createRouter<Renderable, const R extends RouteDefs<Renderable>>(
    routesOrParent: R | Router<Renderable, any>,
    routesOrOptions: R | Router.Options | undefined,
    options?: Router.Options
) {
    return new Router<Renderable, R>(routesOrParent as any, routesOrOptions as any, options);
}

export interface RouteDef<Renderable, Path extends string = string> {
    pattern: Path;
    render: (params: Params<Path>) => Renderable;
    enter?: (params: Params<Path>, url: URL) => Promise<boolean> | boolean;
}

export type Simplify<T> = { [K in keyof T]: T[K] } & {};

export type BuildRouteMap<
    Renderable,
    P extends string,
    R extends RouteDefs<Renderable>
> = Simplify<{
    -readonly [K in keyof R]: R[K] extends { pattern: infer S extends string; render: any }
        ? Route<Renderable, Join<P, S>>
        : R[K] extends RouteDefs<Renderable>
        ? BuildRouteMap<Renderable, P, R[K]>
        : never;
}>;

export interface RouteDefs<Renderable> {
    [K: string]: RouteDef<Renderable> | RouteDefs<Renderable> | Route<Renderable, string>;
}

export class Route<Renderable, Path extends string> extends RoutePattern<Path> {
    render: () => Renderable;
    enter?: (params: Params<Path>, url: URL) => Promise<boolean> | boolean;

    constructor(
        source: Path | RoutePattern<Path>,
        render: () => Renderable,
        options?: RoutePatternOptions & {
            enter?: (params: Params<Path>, url: URL) => Promise<boolean> | boolean;
        }
    ) {
        super(source, options);
        this.render = render;
        this.enter = options?.enter;
    }
}

function buildRouteMap<Renderable, P extends string, R extends RouteDefs<Renderable>>(
    base: RoutePattern<P>,
    defs: R
): BuildRouteMap<Renderable, P, R> {
    const routes: any = {};

    for (let key in defs) {
        const def = defs[key];

        if (def instanceof Route) {
            routes[key] = new Route(base.join(def), def.render, { enter: def.enter });
        } else if (typeof def === "object" && def != null && "pattern" in def) {
            routes[key] = new Route(base.join((def as any).pattern), (def as any).render, {
                enter: (def as any).enter,
            });
        } else {
            routes[key] = buildRouteMap(base, def as any);
        }
    }

    return routes;
}

export function route<Renderable, const R extends RouteDefs<Renderable>>(
    baseOrDefs: R,
    defs?: RouteDefs<Renderable>
): BuildRouteMap<Renderable, "/", R> {
    // TODO: Put this back once the other types are fixed and fix these types
    // return typeof baseOrDefs === "string" || baseOrDefs instanceof RoutePattern
    //     ? buildRouteMap(
    //           typeof baseOrDefs === "string" ? new RoutePattern(baseOrDefs) : baseOrDefs,
    //           defs!
    //       )
    //     :

    return buildRouteMap(new RoutePattern("/"), baseOrDefs);
}

export interface CreateRoute<Renderable> {
    <const R extends RouteDefs<Renderable>>(
        baseOrDefs: R,
        defs?: RouteDefs<Renderable>
    ): BuildRouteMap<Renderable, "/", R>;
}

export interface CreateRouter<Renderable> {
    <const R extends RouteDefs<Renderable>>(
        parent: Router<Renderable, any>,
        routes: R,
        options: Router.Options
    ): Router<Renderable, R>;
    <const R extends RouteDefs<Renderable>>(routes: R, options: Router.Options): Router<
        Renderable,
        R
    >;
}

export interface Helpers<Renderable> {
    route: CreateRoute<Renderable>;
    createRouter: CreateRouter<Renderable>;
}

export const createHelpers = <Renderable>(): Helpers<Renderable> => ({
    route: <const R extends RouteDefs<Renderable>>(
        baseOrDefs: R,
        defs?: RouteDefs<Renderable>
    ): BuildRouteMap<Renderable, "/", R> => {
        return buildRouteMap(new RoutePattern("/"), baseOrDefs);
    },
    createRouter: (<const R extends RouteDefs<Renderable>>(
        routesOrParent: R | Router<Renderable, any>,
        routesOrOptions: R | Router.Options | undefined,
        options?: Router.Options
    ) => {
        return new Router<Renderable, R>(routesOrParent as any, routesOrOptions as any, options);
    }) as CreateRouter<Renderable>,
});
