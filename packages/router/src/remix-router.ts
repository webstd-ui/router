import { createEventType, doc, dom, type EventDescriptor, events } from "@remix-run/events";
import type {
    Location as RemixLocation,
    Path,
    Router as RemixRouter,
    AgnosticDataRouteObject,
} from "@remix-run/router";
import { createBrowserHistory, createRouter as createRemixRouter } from "@remix-run/router";
import {
    AppStorage,
    createRouter as createFetchRouter,
    type Router as FetchRouter,
    type InferRouteHandler,
    type RequestMethod,
    type Route,
    type RouteHandlers,
    type RouteMap,
} from "@remix-run/fetch-router";
import type { RoutePattern } from "@remix-run/route-pattern";
import type { NavigateOptions, Navigation, SubmitOptions, SubmitTarget, To } from "./types.ts";

// ============================================================================
// Router Handler Types
// ============================================================================

type AnyRouteDef = Route<any, any> | string;

type ExtractHandler<T> = T extends (...args: any) => any
    ? T
    : T extends { handler: infer H }
    ? ExtractHandler<H>
    : never;

type HandlerContext<T extends AnyRouteDef> = Parameters<ExtractHandler<InferRouteHandler<T>>>[0];

type AwaitedLoaderData<L> = L extends (...args: any) => infer R ? Awaited<R> : never;

/**
 * Context passed to a route component function.
 */
export interface RouterComponentContext<
    T extends AnyRouteDef = AnyRouteDef,
    Renderable = any,
    LoaderData = unknown,
> {
    outlet: Renderable | null;
    children: Renderable | null;
    data: LoaderData;
    params: HandlerContext<T>["params"];
    request: HandlerContext<T>["request"];
    url: HandlerContext<T>["url"];
    storage: HandlerContext<T>["storage"];
    loaderData: LoaderData;
}

/**
 * Component function used to render a route. Receives the composed outlet and request context.
 */
export type RouterComponent<
    T extends AnyRouteDef = AnyRouteDef,
    Renderable = any,
    LoaderData = unknown,
> = (context: RouterComponentContext<T, Renderable, LoaderData>) => Renderable;

/**
 * Loader function used to fetch data for a route component.
 */
export type RouterLoader<T extends AnyRouteDef = AnyRouteDef, LoaderData = unknown> = (
    context: HandlerContext<T>
) => LoaderData | Promise<LoaderData>;

export type RouterLeafHandlerWithLoader<
    TRoute extends Route<any, any>,
    Renderable,
    Loader extends RouterLoader<TRoute, any> = RouterLoader<TRoute, any>,
    Data = AwaitedLoaderData<Loader>,
> = {
    loader: Loader;
    component?: RouterComponent<TRoute, Renderable, Data>;
};

export type RouterLeafHandlerWithoutLoader<TRoute extends Route<any, any>, Renderable> = {
    loader?: undefined;
    component?: RouterComponent<TRoute, Renderable, undefined>;
};

export type RouterLeafHandler<TRoute extends Route<any, any>, Renderable> =
    | InferRouteHandler<TRoute>
    | RouterLeafHandlerWithLoader<TRoute, Renderable>
    | RouterLeafHandlerWithoutLoader<TRoute, Renderable>;

export type RouterBranchHandlerWithLoader<
    TRoute extends AnyRouteDef,
    TChildren extends RouteMap,
    Renderable,
    Loader extends RouterLoader<TRoute, any> = RouterLoader<TRoute, any>,
    Data = AwaitedLoaderData<Loader>,
> = {
    loader: Loader;
    component?: RouterComponent<TRoute, Renderable, Data>;
    children?: RouterHandlers<TChildren, Renderable>;
};

export type RouterBranchHandlerWithoutLoader<
    TRoute extends AnyRouteDef,
    TChildren extends RouteMap,
    Renderable,
> = {
    loader?: undefined;
    component?: RouterComponent<TRoute, Renderable, undefined>;
    children?: RouterHandlers<TChildren, Renderable>;
};

export type RouterBranchHandler<TRoute extends AnyRouteDef, TChildren extends RouteMap, Renderable> =
    | RouterBranchHandlerWithLoader<TRoute, TChildren, Renderable>
    | RouterBranchHandlerWithoutLoader<TRoute, TChildren, Renderable>;

type RouterHandlersTree<T extends RouteMap, Renderable> = {
    [K in keyof T]?: T[K] extends Route<any, any>
        ? RouterLeafHandler<T[K], Renderable>
        : T[K] extends RouteMap
        ? RouterHandlers<T[K], Renderable> | RouterBranchHandler<string, T[K], Renderable>
        : never;
};

/**
 * Handler map that supports nested { loader, children } structure and a root route.
 */
export type RouterHandlers<T extends RouteMap, Renderable = any> = {
    root?: RouterBranchHandler<string, T, Renderable>;
} & RouterHandlersTree<T, Renderable>;

/**
 * Helper type to infer the correct handler shape from a route map.
 * Use this when defining handlers to get type safety.
 */
export type InferRouterHandlers<T extends RouteMap, Renderable = any> = RouterHandlers<T, Renderable>;

export type RouterHandler<T extends RouteMap, Renderable = any> = RouterHandlers<T, Renderable>;

interface RouteComponentPayload<Renderable = any, LoaderData = unknown> {
    component: RouterComponent<any, Renderable, LoaderData>;
    data: LoaderData;
    params: Record<string, any>;
    request: Request;
    url: URL;
    storage: AppStorage;
}

// Cache the origin since it can't change
const origin = window.location.origin || `${window.location.protocol}//${window.location.host}`;

export namespace Router {
    export interface Options {
        globallyEnhance?: boolean;
    }

    export interface State<Renderable = any> {
        location: Router.Location;
        url: URL;
        navigating: Router.Navigating;
        /**
         * The fully composed outlet, with all nested routes rendered together.
         * Parent loaders wrap their children by receiving an `outlet` parameter.
         */
        outlet: Renderable | null;
    }

    export interface Navigating {
        to: Navigation;
        from: Navigation;
    }

    export type Location = RemixLocation;
}

const [change, createChange] = createEventType<Router.State>("@webstd-ui/router:change");

export class Router<Renderable = any> extends EventTarget {
    static change = change;

    #remixRouter: RemixRouter | null = null;
    #fetchRouter: FetchRouter;

    #storage: AppStorage;
    #outlet: Renderable | null = null;
    #routeMap: RouteMap | null = null;
    #started = false;
    #navigating: Router.Navigating;

    get location(): Router.Location {
        return this.#remixRouter?.state.location ?? (window.location as any);
    }

    get url(): URL {
        const loc = this.location;
        return new URL(loc.pathname + loc.search + loc.hash, window.location.origin);
    }

    get navigating(): Router.Navigating {
        return this.#navigating;
    }

    get outlet(): Renderable | null {
        return this.#outlet;
    }

    get storage(): AppStorage {
        return this.#storage;
    }

    constructor({ globallyEnhance = true }: Router.Options = {}) {
        super();

        this.#fetchRouter = createFetchRouter();
        this.#storage = new AppStorage();
        this.#navigating = {
            to: {
                state: "idle",
                location: undefined,
                url: undefined,
                formMethod: undefined,
                formAction: undefined,
                formEncType: undefined,
                formData: undefined,
                json: undefined,
                text: undefined,
            },
            from: {
                state: "idle",
                location: undefined,
                url: undefined,
                formMethod: undefined,
                formAction: undefined,
                formEncType: undefined,
                formData: undefined,
                json: undefined,
                text: undefined,
            },
        };

        if (globallyEnhance) {
            // Handle routing events
            events(document, [this.#handleClick, this.#handleSubmit]);
        }
    }

    #dispatchState() {
        const state: Router.State<Renderable> = {
            location: this.location,
            url: this.url,
            navigating: this.navigating,
            outlet: this.outlet,
        };
        this.dispatchEvent(createChange({ detail: state }));
    }

    #handleClick = doc.click(event => {
        const isNonNavigationClick =
            event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey;
        if (event.defaultPrevented || isNonNavigationClick) {
            return;
        }

        const anchor = event.composedPath().find(n => (n as HTMLElement).tagName === "A") as
            | HTMLAnchorElement
            | undefined;

        if (
            anchor === undefined ||
            anchor.target !== "" ||
            anchor.hasAttribute("download") ||
            anchor.getAttribute("rel") === "external"
        ) {
            return;
        }

        const href = anchor.href;
        if (href === "" || href.startsWith("mailto:")) {
            return;
        }

        if (anchor.origin !== origin) {
            return;
        }

        event.preventDefault();
        const targetPath = anchor.pathname + anchor.search + anchor.hash;
        if (href !== window.location.href) {
            void this.navigate(targetPath);
        }
    });

    #handleSubmit = doc.submit(event => {
        // Don't handle if preventDefault was already called
        if (event.defaultPrevented) {
            return;
        }

        const form = event.target as HTMLFormElement;

        // Check if form has target or external action
        if (form.target && form.target !== "_self") {
            return;
        }

        const action = form.action;
        if (action && new URL(action).origin !== origin) {
            return;
        }

        event.preventDefault();

        // Check for method override in form data
        const formData = new FormData(form, event.submitter);
        let method = form.method.toUpperCase();
        const methodOverride = formData.get("webstd-ui:method");
        if (methodOverride && typeof methodOverride === "string") {
            method = methodOverride.toUpperCase();
            formData.delete("webstd-ui:method");
        }

        this.submit(form, { method: method as any });
    });

    /**
     * Programmatically navigate to a new location.
     *
     * This updates browser history using @remix-run/router (not direct window.history manipulation),
     * resolves the target against registered routes, and updates the outlet with the resulting element.
     *
     * @param to - Target location (string, URL, or partial path object).
     * @param options - Navigation behavior overrides such as history replacement.
     */
    async navigate(to: To, options: NavigateOptions = {}): Promise<void> {
        if (!this.#remixRouter) {
            throw new Error("Router not initialized. Call router.map() to register routes first.");
        }

        const pathname = this.#resolveTo(to);

        // Use @remix-run/router's navigate method - it handles history internally
        await this.#remixRouter.navigate(pathname, {
            replace: options.replace,
            preventScrollReset: options.preventScrollReset,
            flushSync: options.flushSync,
            viewTransition: options.viewTransition,
        });
    }

    /**
     * Submit form data or arbitrary payloads to the router.
     *
     * This delegates to @remix-run/router's navigate() or fetch() depending on options.navigate,
     * which handles all the mutation logic, revalidation, and redirects.
     *
     * @param target - Form element, data object, or payload to submit.
     * @param options - Submission options such as method, encType, or navigation behavior.
     */
    async submit(target: SubmitTarget, options: SubmitOptions = {}): Promise<void> {
        if (!this.#remixRouter) {
            throw new Error("Router not initialized. Call router.map() to register routes first.");
        }

        let formData: FormData;
        let formAction: string;
        let formMethod: string;

        // Determine what we're submitting
        if (target instanceof HTMLFormElement) {
            formData = new FormData(target);
            formAction = options.action || target.action || window.location.pathname;
            formMethod = (options.method || target.method || "GET").toUpperCase();
        } else if (target instanceof FormData) {
            formData = target;
            formAction = options.action || window.location.pathname;
            formMethod = (options.method || "POST").toUpperCase();
        } else if (target instanceof URLSearchParams) {
            formData = new FormData();
            for (const [key, value] of target.entries()) {
                formData.append(key, value);
            }
            formAction = options.action || window.location.pathname;
            formMethod = (options.method || "POST").toUpperCase();
        } else {
            throw new Error("Invalid submit target");
        }

        // If navigate is false, use fetch() for non-navigating submissions
        if (options.navigate === false) {
            const fetcherKey = `fetcher-${Date.now()}-${Math.random()}`;
            this.#remixRouter.fetch(
                fetcherKey,
                // routeId - we need to find the matching route
                // For now, use empty string and let remix-router figure it out
                "",
                formAction,
                {
                    formMethod: formMethod as any,
                    formData,
                }
            );
        } else {
            // Use @remix-run/router's navigate with form submission
            // This handles GET/POST/PUT/DELETE, revalidation, redirects, etc.
            await this.#remixRouter.navigate(formAction, {
                formMethod: formMethod as any,
                formData,
                replace: options.replace,
                preventScrollReset: options.preventScrollReset,
                flushSync: options.flushSync,
                viewTransition: options.viewTransition,
            });
        }
    }

    // TODO: Do we want/need `fetcher`/`fetch` here? Theoretically, it's integrated into submit...

    revalidate(): void {
        if (!this.#remixRouter) {
            throw new Error("Router not initialized. Call router.map() to register routes first.");
        }
        this.#remixRouter.revalidate();
    }

    /**
     * Check if a path is currently active.
     * Supports partial matching - e.g., isActive("/blog") returns true for "/blog/post/1"
     * @param path - The path to check
     * @param exact - If true, requires exact match. Default is false (partial match)
     */
    isActive(path: string | URL | Path | undefined, exact = false): boolean {
        const pathname = this.#pathToString(path);
        const currentPath = this.location.pathname;

        if (exact) {
            return currentPath === pathname;
        }

        // Partial match: current path starts with the given path
        if (pathname === "/") {
            return currentPath === "/";
        }
        return currentPath === pathname || currentPath.startsWith(`${pathname}/`);
    }

    /**
     * Check if a path is currently pending navigation.
     * Supports partial matching - e.g., isPending("/blog") returns true when navigating to "/blog/post/1"
     * @param path - The path to check
     * @param exact - If true, requires exact match. Default is false (partial match)
     */
    isPending(path: string | URL | Path | undefined, exact = false): boolean {
        if (this.#navigating.to.state === "idle") {
            return false;
        }
        const pathname = this.#pathToString(path);
        const pendingPath = this.#navigating.to.location?.pathname;

        if (!pendingPath) {
            return false;
        }

        if (exact) {
            return pendingPath === pathname;
        }

        // Partial match: pending path starts with the given path
        if (pathname === "/") {
            return pendingPath === "/";
        }
        return pendingPath === pathname || pendingPath.startsWith(`${pathname}/`);
    }

    when<T, U>(
        path: string | URL | Path | undefined,
        state: { active: T; pending: U }
    ): T | U | undefined {
        if (this.isActive(path)) {
            return state.active;
        }
        if (this.isPending(path)) {
            return state.pending;
        }
        return undefined;
    }

    /**
     * Submit event handler for forms that routes submissions through the router.
     * Use this with event listeners for forms when you need manual control.
     *
     * Can be used in combination with the `{ globallyEnhance: false }` Router constructor option.
     *
     * @example
     * Basic form enhancement:
     * ```tsx
     * <form action={action} on={router.enhanceForm()}>...</form>
     * ```
     *
     * @example
     * Form enhancement with optimistic updates:
     * ```tsx
     * <form action={action} on={router.enhanceForm(
     *   (formData) => {
     *     if (formData) {
     *       // Handle optimistic update with FormData
     *       console.log('Optimistic update:', formData);
     *     } else {
     *       // Clear optimistic state (submission completed)
     *       console.log('Submission complete');
     *     }
     *   }
     * )}>...</form>
     * ```
     */
    enhanceForm(
        handler: (data: FormData | null) => void | Promise<void>,
        options: AddEventListenerOptions
    ): EventDescriptor<HTMLFormElement>;
    enhanceForm(options?: AddEventListenerOptions): EventDescriptor<HTMLFormElement>;
    enhanceForm(
        handlerOrOptions?:
            | ((data: FormData | null) => void | Promise<void>)
            | AddEventListenerOptions,
        maybeOptions?: AddEventListenerOptions
    ): EventDescriptor<HTMLFormElement> {
        const hasOptimisticHandler = typeof handlerOrOptions === "function";
        const optimisticHandler = hasOptimisticHandler
            ? (handlerOrOptions as (data: FormData | null) => void | Promise<void>)
            : undefined;
        const options: AddEventListenerOptions = hasOptimisticHandler
            ? maybeOptions ?? {}
            : ((handlerOrOptions ?? {}) as AddEventListenerOptions);

        return dom.submit(async event => {
            if (event.defaultPrevented) {
                return;
            }

            const form = event.target as HTMLFormElement;

            if (form.target && form.target !== "_self") {
                return;
            }

            const action = form.action;
            if (action && new URL(action).origin !== origin) {
                return;
            }

            event.preventDefault();

            const formData = new FormData(form, event.submitter);
            let method = form.method.toUpperCase();
            const methodOverride = formData.get("webstd-ui:method");
            if (methodOverride && typeof methodOverride === "string") {
                method = methodOverride.toUpperCase();
                formData.delete("webstd-ui:method");
            }

            optimisticHandler?.(formData);

            await this.submit(formData, {
                action: form.action,
                method: method as any,
            });

            if (options.signal?.aborted) return;

            optimisticHandler?.(null);
        }, options);
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
        return dom.click(event => {
            const isNonNavigationClick =
                event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey;
            if (event.defaultPrevented || isNonNavigationClick) {
                return;
            }

            const anchor = event.target as HTMLAnchorElement;
            if (anchor.tagName !== "A") {
                return;
            }

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

            if (anchor.origin !== origin) {
                return;
            }

            event.preventDefault();
            const targetPath = anchor.pathname + anchor.search + anchor.hash;
            if (href !== window.location.href) {
                void this.navigate(targetPath);
            }
        }, options);
    }

    /**
     * Mount a router at a given pathname prefix in the current router.
     */
    // mount(router: Router): void;
    // mount(pathnamePrefix: string, router: Router): void;
    // mount(arg: string | Router, router?: Router): void {
    //     throw new Error("mount() not yet implemented");
    // }

    // route<M extends RequestMethod | "ANY", P extends string>(
    //     method: M,
    //     pattern: P | RoutePattern<P> | Route<M | "ANY", P>,
    //     handler: InferRouteHandler<P>
    // ): void {
    //     throw new Error("route() not yet implemented - use map() instead");
    // }

    /**
     * Map routes to handlers. Supports both flat and nested structures.
     *
     * @example
     * ```typescript
     * // Flat structure (legacy)
     * router.map(routes, {
     *   home: () => render(<Home />),
     *   'posts.index': () => render(<Posts />)
     * });
     *
     * // Nested structure with root
     * router.map(routes, {
     *   root: {
     *     loader: () => render(<Layout />),
     *     children: {
     *       home: () => render(<Home />),
     *       posts: {
     *         loader: () => render(<Posts />),
     *         children: { ... }
     *       }
     *     }
     *   }
     * });
     * ```
     */
    map<M extends RequestMethod | "ANY", P extends string>(
        route: P | RoutePattern<P> | Route<M, P>,
        handler: InferRouteHandler<P>
    ): void;
    map<T extends RouteMap>(routes: T, handlers: RouteHandlers<T> | RouterHandlers<T, Renderable>): void;
    map(routeOrRoutes: any, handlers: any): void {
        const wasEmpty = this.#routeMap === null;

        // Store both the route map and handlers for later conversion
        if (wasEmpty) {
            this.#routeMap = routeOrRoutes;
            this.#handlers = handlers;
        }

        // Flatten handlers for fetch-router registration
        const flatHandlers = this.#flattenHandlers(handlers);

        // Register routes with fetch-router
        this.#fetchRouter.map(routeOrRoutes, flatHandlers);

        // If this is the first route being registered, create the @remix-run/router instance
        if (wasEmpty && !this.#started) {
            this.#started = true;
            this.#initializeRemixRouter();
        }
    }

    #handlers: any = null;

    #createRouteRequestHandler(handler: {
        loader?: RouterLoader<any>;
        component?: RouterComponent<any, Renderable>;
    }) {
        const loader =
            handler && typeof handler.loader === "function" ? handler.loader : undefined;
        const component =
            handler && typeof handler.component === "function" ? handler.component : undefined;

        if (!loader && !component) {
            throw new Error("GET routes must define loader() or component()");
        }

        return async (context: HandlerContext<any>) => {
            let loaderData: any = undefined;

            if (loader) {
                const result = await loader(context);

                if (result instanceof Response) {
                    throw new Error(
                        "Loader functions used with component() must return plain data, not Response instances."
                    );
                }

                loaderData = result;
            }

            if (!component) {
                return loaderData;
            }

            const payload: RouteComponentPayload<Renderable> = {
                component,
                data: loaderData,
                params: { ...context.params },
                request: context.request,
                url: new URL(context.url),
                storage: context.storage,
            };

            return payload;
        };
    }

    #flattenHandlers(handlers: any, result: any = {}): any {
        if (!handlers || typeof handlers !== "object") {
            return result;
        }

        for (const key in handlers) {
            const handler = handlers[key];

            if (typeof handler === "function") {
                result[key] = handler;
                continue;
            }

            if (!handler || typeof handler !== "object") {
                continue;
            }

            const hasLoader = typeof handler.loader === "function";
            const hasComponent = typeof handler.component === "function";

            if (hasLoader || hasComponent) {
                result[key] = this.#createRouteRequestHandler(handler);
            }

            if ("children" in handler && handler.children) {
                this.#flattenHandlers(handler.children, result);
            }
        }

        return result;
    }

    #resolveTo(to: To): string {
        if (typeof to === "number") {
            // Relative navigation
            return window.location.pathname;
        }
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

    #pathToString(path: string | URL | Path | undefined): string {
        if (!path) {
            return "";
        }
        if (typeof path === "string") {
            return path;
        }
        if (path instanceof URL) {
            return path.pathname;
        }
        return path.pathname;
    }

    #initializeRemixRouter(): void {
        // Convert our routes to AgnosticDataRouteObject[] for @remix-run/router
        const dataRoutes = this.#convertRoutesToDataRoutes();

        // Create the @remix-run/router instance
        this.#remixRouter = createRemixRouter({
            history: createBrowserHistory(),
            routes: dataRoutes,
        });

        // Subscribe to state changes
        this.#remixRouter.subscribe(state => {
            // Update navigating state based on remix-router's navigation
            const nav = state.navigation;

            if (nav.state === "idle") {
                this.#navigating = {
                    to: {
                        state: "idle",
                        location: undefined,
                        url: undefined,
                        formMethod: undefined,
                        formAction: undefined,
                        formEncType: undefined,
                        formData: undefined,
                        json: undefined,
                        text: undefined,
                    },
                    from: this.#navigating.to,
                };
            } else if (nav.state === "loading") {
                this.#navigating = {
                    to: {
                        state: "loading",
                        location: nav.location as any,
                        url: new URL(
                            nav.location.pathname + nav.location.search + nav.location.hash,
                            window.location.origin
                        ),
                        formMethod: nav.formMethod as any,
                        formAction: nav.formAction,
                        formEncType: nav.formEncType as any,
                        formData: nav.formData,
                        json: undefined,
                        text: undefined,
                    },
                    from: this.#navigating.to,
                };
            } else if (nav.state === "submitting") {
                this.#navigating = {
                    to: {
                        state: "submitting",
                        location: nav.location as any,
                        url: new URL(
                            nav.location.pathname + nav.location.search + nav.location.hash,
                            window.location.origin
                        ),
                        formMethod: nav.formMethod as any,
                        formAction: nav.formAction!,
                        formEncType: nav.formEncType as any,
                        formData: nav.formData!,
                        json: undefined,
                        text: undefined,
                    },
                    from: this.#navigating.to,
                };
            }

            // Compose outlets from leaf to root using component payloads
            if (state.matches.length > 0) {
                let outlet: Renderable | null = null;

                // Walk from leaf to root
                for (let i = state.matches.length - 1; i >= 0; i--) {
                    const match = state.matches[i];
                    const data = state.loaderData[match.route.id];

                    if (data && typeof data === "object" && "component" in data) {
                        const payload = data as RouteComponentPayload<Renderable>;
                        const rendered = payload.component({
                            outlet,
                            children: outlet,
                            data: payload.data,
                            loaderData: payload.data,
                            params: payload.params,
                            request: payload.request,
                            url: payload.url,
                            storage: payload.storage,
                        });
                        if (rendered && typeof rendered === "object" && "element" in rendered) {
                            outlet = (rendered as { element: Renderable | null }).element ?? null;
                        } else {
                            outlet = (rendered as Renderable) ?? null;
                        }
                    } else if (data && typeof data === "object" && "element" in data) {
                        outlet = (data as { element: Renderable | null }).element ?? null;
                    } else if (data !== undefined) {
                        outlet = data as Renderable;
                    }
                }

                this.#outlet = outlet;
            }

            this.#dispatchState();
        });

        // Initialize the router
        this.#remixRouter.initialize();
    }

    #convertRoutesToDataRoutes(): AgnosticDataRouteObject[] {
        if (!this.#routeMap || !this.#handlers) {
            return [];
        }

        // Check if there's a root handler
        if ("root" in this.#handlers && this.#handlers.root) {
            // Build tree starting from root
            return [this.#buildRouteTree("root", this.#routeMap, this.#handlers.root, "/")];
        }

        // Fallback: build flat routes
        const patterns = this.#extractPatternsFromRouteMap(this.#routeMap);
        return patterns.map((pattern, i) => this.#createRouteObject(`route-${i}`, pattern));
    }

    #buildRouteTree(
        key: string,
        routeMap: any,
        handler: any,
        basePath: string
    ): AgnosticDataRouteObject {
        const route = routeMap;
        const pattern = this.#getRoutePattern(route, basePath);

        const dataRoute: AgnosticDataRouteObject = {
            id: key,
            path: pattern,
        };

        // Add loader if handler has one or is a function
        if (typeof handler === "function") {
            dataRoute.loader = this.#createLoader();
        } else if (handler && typeof handler === "object" && "loader" in handler) {
            dataRoute.loader = this.#createLoader();
        }

        // Add action for mutations
        dataRoute.action = this.#createAction();

        // Process children if they exist
        if (handler && typeof handler === "object" && "children" in handler && handler.children) {
            const children: AgnosticDataRouteObject[] = [];

            // Get the children from the route map
            const routeChildren =
                route && typeof route === "object" && "children" in route
                    ? route.children
                    : routeMap;

            for (const childKey in handler.children) {
                const childHandler = handler.children[childKey];
                const childRoute = routeChildren[childKey];

                if (childRoute) {
                    const childPattern = this.#getRoutePattern(childRoute, pattern);
                    const childDataRoute = this.#buildRouteTree(
                        childKey,
                        childRoute,
                        childHandler,
                        childPattern
                    );
                    children.push(childDataRoute);
                }
            }

            if (children.length > 0) {
                dataRoute.children = children;
            }
        }

        return dataRoute;
    }

    #getRoutePattern(route: any, basePath: string): string {
        if (!route) return basePath;

        if (typeof route === "string") return route;

        if ("pattern" in route) {
            return route.pattern;
        }

        if ("match" in route && typeof route.match === "function") {
            return (route as any).pattern || basePath;
        }

        return basePath;
    }

    #createLoader() {
        return async ({ request }: any) => {
            const result = await this.#fetchRouter.fetch(request);

            // Try to parse as JSON
            if (result instanceof Response) {
                const contentType = result.headers.get("Content-Type");
                if (contentType?.includes("application/json")) {
                    return await result.json();
                }
                return result;
            }

            return result;
        };
    }

    #createAction() {
        return async ({ request }: any) => {
            const response = await this.#fetchRouter.fetch(request);
            return response;
        };
    }

    #createRouteObject(id: string, pattern: string): AgnosticDataRouteObject {
        return {
            id,
            path: pattern,
            loader: this.#createLoader(),
            action: this.#createAction(),
        };
    }

    #extractPatternsFromRouteMap(routeMap: any, patterns: Set<string> = new Set()): string[] {
        for (const key in routeMap) {
            const route = routeMap[key];

            if (route && typeof route === "object") {
                if ("match" in route && typeof route.match === "function") {
                    const pattern = (route as any).pattern || key;
                    patterns.add(pattern);
                } else if ("pattern" in route) {
                    patterns.add(route.pattern);
                } else if (!("match" in route)) {
                    this.#extractPatternsFromRouteMap(route, patterns);
                }
            }
        }

        return Array.from(patterns);
    }

    // get<P extends string>(
    //     pattern: P | RoutePattern<P> | Route<"GET" | "ANY", P>,
    //     handler: InferRouteHandler<P>
    // ): void {
    //     this.route("GET", pattern, handler);
    // }

    // head<P extends string>(
    //     pattern: P | RoutePattern<P> | Route<"HEAD" | "ANY", P>,
    //     handler: InferRouteHandler<P>
    // ): void {
    //     this.route("HEAD", pattern, handler);
    // }

    // post<P extends string>(
    //     pattern: P | RoutePattern<P> | Route<"POST" | "ANY", P>,
    //     handler: InferRouteHandler<P>
    // ): void {
    //     this.route("POST", pattern, handler);
    // }

    // put<P extends string>(
    //     pattern: P | RoutePattern<P> | Route<"PUT" | "ANY", P>,
    //     handler: InferRouteHandler<P>
    // ): void {
    //     this.route("PUT", pattern, handler);
    // }

    // patch<P extends string>(
    //     pattern: P | RoutePattern<P> | Route<"PATCH" | "ANY", P>,
    //     handler: InferRouteHandler<P>
    // ): void {
    //     this.route("PATCH", pattern, handler);
    // }

    // delete<P extends string>(
    //     pattern: P | RoutePattern<P> | Route<"DELETE" | "ANY", P>,
    //     handler: InferRouteHandler<P>
    // ): void {
    //     this.route("DELETE", pattern, handler);
    // }

    // options<P extends string>(
    //     pattern: P | RoutePattern<P> | Route<"OPTIONS" | "ANY", P>,
    //     handler: InferRouteHandler<P>
    // ): void {
    //     this.route("OPTIONS", pattern, handler);
    // }
}

// ==========================================================================================
// USAGE EXAMPLE
// ==========================================================================================

// // We can wrap and reexport these if we need to change their functionality and/or types
// import { json, redirect } from "@remix-run/fetch-router";
// // Not an implementation detail, just an example of a "framework"
// // You can ignore this
// import { html } from "@remix-run/html-template";

// const routes = defineRoute({
//     pattern: "/",
//     children: {
//         home: { method: "GET", pattern: "/" },
//         posts: new Resources("/posts", {
//             only: ["index", "create", "show", "update", "destroy"],
//         }),
//     },
// });

// const handlers = defineHandler<typeof routes>({
//     root: {
//         loader() {
//             return render(html`<app-layout><router-outlet></router-outlet></app-layout>`)
//         },
//         children: {
//             home: () => render(html`<app-home></app-home>`),
//             posts: {
//                 async index({ storage }) {
//                     const posts = await getPosts(storage);
//                     return render(html`<app-posts-list .posts=${posts}></app-posts-list>`);
//                 },
//                 async create({ formData, storage }) {
//                     const title = formData.get("title") as string;
//                     const content = formData.get("content") as string;

//                     // Create and persist the post using AppStorage
//                     const newPost = await createPost(title, content, storage);
//                     console.log("Created post:", newPost);

//                     return redirect(routes.posts.show.href({ id: newPost }), { status: 302 });
//                 },
//                 show: {
//                     async loader({ params, storage }) {
//                         const { title, content } = await getPost(Number(params.id), storage);
//                         //                                       ^ params is typesafe
//                         //                                         will only show id: string
//                         return render(html`<app-post title="${title}">${content}</app-post>`);
//                     },
//                     children: { /* ... */ }
//                 },
//                 async update({ formData, storage }) {
//                     // ...
//                 },
//                 async destroy({ params, storage }) {
//                     // ...
//                 },
//             },
//         },
//     },
// });

// const router = new Router();
// router.map(routes, handlers);
// // Should be able to break it up into multiple handlers and `router.map()` calls too
// Use the router as part of your framework here...

/**
 *
 * I want to define routes and nested routes as typical GET, POST, PUT, DELETE, etc.
 * methods and paths where GET handlers have a loader and a component which gets its
 * loader data passed in and any other method handler is basically just a data endpoint,
 * so that we're not tying mutations to UI so closely.
 *
 */

// I still want to be able to pass a POST endpoint URL to a <form> and have the form
// call the POST endpoint I defined using `router.submit()`.
