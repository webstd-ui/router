import { doc, dom, events, win, type EventDescriptor } from "@remix-run/events";
import { createEventFactory } from "./events.ts";
import { RoutePattern, type Params } from "@remix-run/route-pattern";
import { nav } from "./targets.ts";

function todo(): never {
    throw new Error("Not implemented");
}

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

/**
 * This event is fired from Routes controllers when their host is connected to
 * announce the child route and potentially connect to a parent routes controller.
 */
export class RoutesConnectedEvent extends Event {
    static name = "@webstd-ui/router:connected";

    #controller = new AbortController();
    controller: Router<any>;

    get signal() {
        return this.#controller.signal;
    }

    disconnect() {
        this.#controller.abort();
    }

    constructor(routes: Router<any>) {
        super(RoutesConnectedEvent.name, {
            bubbles: true,
            composed: true,
            cancelable: false,
        });

        this.controller = routes;
    }
}

// MARK: Router

export namespace Router {
    export interface Route<Renderable, Path extends string> {
        name?: string;
        pattern: RoutePattern<Path>;
        render: (params: Params<Path>) => Renderable;
        enter?: (params: Params<Path>) => Promise<boolean> | boolean;
    }

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

    export type To = string | URL | Partial<Path>;

    export interface Options {
        signal: AbortSignal;
        /** @default true */
        globallyEnhance?: boolean;
    }
}

export class Router<Renderable> extends EventTarget implements RouteState<Renderable> {
    // MARK: Static members
    // Cache the origin since it can't change
    static origin =
        window.location.origin || `${window.location.protocol}//${window.location.host}`;

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
    #routes: Router.Routes<Renderable> = [];
    #parent?: Router<Renderable>;

    // MARK: Stored properties
    children: Router<Renderable>[] = [];

    // MARK: Events
    #change = createEventFactory<RouteStateEvent<Renderable>, this>(this, RouteStateEvent.name);
    get change() {
        return this.#change.bind;
    }

    #dispatchChange() {
        this.#change.dispatchEvent(
            new RouteStateEvent({
                location: this.location,
                url: this.url,
                navigating: this.navigating,
                outlet: this.outlet,
                params: this.params,
            })
        );
    }

    // MARK: Constructor
    constructor(
        parent: Router<Renderable>,
        routes: Router.Routes<Renderable>,
        options: Router.Options
    );
    constructor(routes: Router.Routes<Renderable>, options: Router.Options);
    constructor(
        routesOrParent: Router.Routes<Renderable> | Router<Renderable>,
        routesOrOptions: Router.Routes<Renderable> | Router.Options | undefined,
        options?: Router.Options
    ) {
        super();

        if (routesOrParent instanceof Router) {
            // We are a child route
            const opts = options!;
            this.#routes = routesOrOptions as Router.Routes<Renderable>;

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

            const tailGroup = Router.#getTailGroup(this.params);
            if (tailGroup !== undefined) {
                this.navigate(tailGroup);
            }
        } else {
            // We are a root route
            const opts = routesOrOptions as Router.Options;
            this.#routes = routesOrParent;

            opts.globallyEnhance = opts.globallyEnhance ?? true;
            // Let the user choose whether they want to enhance all <a> navigations
            // If not they can use `Router.enhanceLink` to enhance specific <a>'s
            if (opts.globallyEnhance) {
                if ("navigation" in window) {
                    // If we're in a Chromium browser, let's use window.navigation to drive global routing
                    events(window.navigation, [
                        nav.navigate(event => todo(), { signal: opts.signal }),
                    ]);
                } else {
                    // If we're in a WebKit/Gecko browser, we have to use document.onclick and
                    // window.onpopstate to drive global routing
                    events(document, [doc.click(event => todo(), { signal: opts.signal })]);
                    events(window, [win.popstate(() => todo(), { signal: opts.signal })]);
                }
            }
        }
    }

    // MARK: Getters

    /**
     * Latest resolved browser location after the most recent successful navigation.
     * Mirrors `window.location`, but only updates once the router finishes loading.
     */
    get location(): Location {
        return todo();
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
        return todo();
    }

    /**
     * The latest rendered node returned by the matched route handler.
     * Consumers can mount this node inside their application's root.
     */
    get outlet(): Renderable | null {
        return todo();
    }

    get params(): Record<string, string> {
        return todo();
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
        todo();
    }

    /**
     * Check if a path is currently active.
     * Supports partial matching - e.g., isActive("/blog") returns true for "/blog/post/1"
     * @param path - The path to check
     * @param exact - If true, requires exact match. Default is false (partial match)
     */
    isActive(path: string | URL | Partial<Path> | undefined, exact = false): boolean {
        todo();
    }

    /**
     * Check if a path is currently pending navigation.
     * Supports partial matching - e.g., isPending("/blog") returns true when navigating to "/blog/post/1"
     * @param path - The path to check
     * @param exact - If true, requires exact match. Default is false (partial match)
     */
    isPending(path: string | URL | Partial<Path> | undefined, exact = false): boolean {
        todo();
    }

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
        return dom.click<HTMLAnchorElement>(event => {
            const isNonNavigationClick =
                event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey;

            if (event.defaultPrevented || isNonNavigationClick) {
                return;
            }

            const anchor = event.currentTarget;

            if (
                anchor.target !== "" ||
                anchor.hasAttribute("download") ||
                anchor.getAttribute("rel") === "external"
            ) {
                return;
            }

            const href = anchor.getAttribute("href") ?? anchor.href;
            if (href === "" || href.startsWith("mailto:")) {
                return;
            }

            if (anchor.origin !== Router.origin) {
                return;
            }

            event.preventDefault();
            const targetPath = anchor.pathname + anchor.search + anchor.hash;
            if (href !== window.location.href) {
                void this.navigate(targetPath, {});
            }
        }, options);
    }

    // MARK: Private methods

    #resolveTo(to: Router.To): string {
        if (typeof to === "string") {
            return to;
        }
        if (to instanceof URL) {
            return to.pathname + to.search + to.hash;
        }
        // Partial<Path>
        const pathname = to.pathname || window.location.pathname;
        const search = to.search || "";
        const hash = to.hash || "";
        return pathname + search + hash;
    }

    #pathToString(path: string | URL | Path): string {
        if (typeof path === "string") {
            return path;
        }
        if (path instanceof URL) {
            return path.pathname;
        }
        return path.pathname;
    }
}
