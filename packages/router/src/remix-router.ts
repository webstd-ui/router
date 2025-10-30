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

// declare global {
//     interface Response {
//         _element?: any;
//     }
// }

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

    map<M extends RequestMethod | "ANY", P extends string>(
        route: P | RoutePattern<P> | Route<M, P>,
        handler: InferRouteHandler<P>
    ): void;
    map<T extends RouteMap>(routes: T, handlers: RouteHandlers<T>): void;
    map(routeOrRoutes: any, handler: any): void {
        const wasEmpty = this.#routeMap === null;

        // Store the route map for later conversion
        if (wasEmpty) {
            this.#routeMap = routeOrRoutes;
        }

        // Register routes with fetch-router
        this.#fetchRouter.map(routeOrRoutes, handler);

        // If this is the first route being registered, create the @remix-run/router instance
        if (wasEmpty && !this.#started) {
            this.#started = true;
            this.#initializeRemixRouter();
        }
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

            // Update outlet from loader data if available
            if (state.matches.length > 0) {
                const leafMatch = state.matches[state.matches.length - 1];
                const data = state.loaderData[leafMatch.route.id];
                if (data && data._element !== undefined) {
                    this.#outlet = data._element;
                }
            }

            this.#dispatchState();
        });

        // Initialize the router
        this.#remixRouter.initialize();
    }

    #convertRoutesToDataRoutes(): AgnosticDataRouteObject[] {
        if (!this.#routeMap) {
            return [];
        }

        // Extract all route patterns from the route map
        const patterns = this.#extractPatternsFromRouteMap(this.#routeMap);

        // Convert to AgnosticDataRouteObject[]
        const dataRoutes: any[] = [];
        let routeId = 0;

        for (const pattern of patterns) {
            const id = `route-${routeId++}`;
            dataRoutes.push({
                id,
                path: pattern,
                // Loader for GET requests - calls fetchRouter.fetch()
                loader: async ({ request }: any) => {
                    // Call fetchRouter.fetch() with the request
                    // fetch-router will create a RequestContext with its own storage
                    const response = await this.#fetchRouter.fetch(request);

                    // Check for _element from render()
                    if (response._element !== undefined) {
                        return { _element: response._element };
                    }

                    // Try to parse as JSON
                    const contentType = response.headers.get("Content-Type");
                    if (contentType?.includes("application/json")) {
                        return await response.json();
                    }

                    // Return the response as-is for remix-router to handle
                    return response;
                },
                // Action for POST/PUT/DELETE/etc - calls fetchRouter.fetch()
                action: async ({ request }: any) => {
                    // Call fetchRouter.fetch() with the request
                    // fetch-router will create a RequestContext with its own storage
                    const response = await this.#fetchRouter.fetch(request);

                    // Return the response for remix-router to handle redirects, etc.
                    return response;
                },
            });
        }

        return dataRoutes;
    }

    #extractPatternsFromRouteMap(routeMap: any, patterns: Set<string> = new Set()): string[] {
        for (const key in routeMap) {
            const route = routeMap[key];

            // Check if this is a Route object (has a match method or pattern property)
            if (route && typeof route === "object") {
                if ("match" in route && typeof route.match === "function") {
                    // This is a Route object - extract pattern
                    const pattern = (route as any).pattern || key;
                    patterns.add(pattern);
                } else if ("pattern" in route) {
                    // Has a pattern property
                    patterns.add(route.pattern);
                } else if (!("match" in route)) {
                    // This is a nested RouteMap - recurse
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
