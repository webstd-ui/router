import {
    createEventType,
    createInteraction,
    doc,
    dom,
    type EventDescriptor,
    type EventHandler,
    events,
    win,
} from "@remix-run/events";
import { AppStorage, type RouteHandlers, type RouteMap } from "@remix-run/fetch-router";
import type {
    FormEncType,
    FormMethod,
    HTMLFormMethod,
    JsonValue,
    NavigateOptions,
    Navigating,
    Navigation,
    Path,
    SubmitOptions,
    SubmitTarget,
    To,
} from "./types.ts";

declare global {
    interface Response {
        _element: any;
    }
}

const [update, createUpdate] = createEventType("@webstd-ui/router:update");

// Cache the origin since it can't change
const origin = window.location.origin || `${window.location.protocol}//${window.location.host}`;

export namespace Router {
    export interface Options {
        globallyEnhance?: boolean;
    }
}

/**
 * Client-side router that mirrors the `@remix-run/fetch-router` API.
 *
 * The router listens for link clicks and form submissions, resolves them against the registered
 * route map, and updates the active outlet. Consumers can observe navigation state by listening
 * to {@link Router.update} events or by reading the exposed getters.
 *
 * @template Renderable - The type of renderable element this router handles (e.g., Remix.RemixNode, VNode, JSX.Element, TemplateResult, etc.)
 */
export class Router<Renderable> extends EventTarget {
    /**
     * Type-safe custom event that fires whenever the router updates its internal state.
     * Consumers can listen to `Router.update` on a router instance to trigger UI refreshes.
     */
    static update = update;

    #location: Location;
    #navigating: Navigating;
    #outlet: Renderable | null = null;
    #routes: Map<string, { pattern: any; method: string; handler: any }> = new Map();
    #storage: AppStorage;
    #currentNavigationAbortController: AbortController | null = null;
    #lastRevalidationTimestamp: number = 0;

    /**
     * Latest resolved browser location after the most recent successful navigation.
     * Mirrors `window.location`, but only updates once the router finishes loading.
     */
    get location(): Location {
        return this.#location;
    }

    /**
     * Current navigation status, including the route being left and the route being entered.
     * This is useful for rendering loading indicators or optimistic UI.
     */
    get navigating(): Navigating {
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
     * Per-request storage shared across route handlers during navigation.
     * Mirrors {@link AppStorage} from the server router.
     */
    get storage(): AppStorage {
        return this.#storage;
    }

    /**
     * The current location as a URL object.
     * Provides convenient access to search params and other URL properties.
     */
    get url(): URL {
        return new URL(this.#location.href);
    }

    #started = false;

    /**
     * Creates a new client router, wiring up window history listeners and form/click interception.
     */
    constructor({ globallyEnhance = true }: Router.Options = {}) {
        super();

        this.#location = window.location;
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
            events(window, [
                win.popstate(() => {
                    this.#gotoSelf();
                }),
            ]);
        }
    }

    // Call whenever the internal state changes
    #update(): void {
        this.dispatchEvent(createUpdate());
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
            void this.navigate(targetPath, {});
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
        // Include submitter to capture button values
        const formData = new FormData(form, event.submitter);
        let method = form.method.toUpperCase();
        const methodOverride = formData.get("webstd-ui:method");
        if (methodOverride && typeof methodOverride === "string") {
            method = methodOverride.toUpperCase();
            formData.delete("webstd-ui:method");
        }

        this.submit(form, { method: method as FormMethod });
    });

    async #goto(
        pathname: string,
        submission?: {
            formMethod: FormMethod;
            formAction: string;
            formEncType: FormEncType;
            formData?: FormData;
            json?: JsonValue;
            text?: string;
        },
        options?: { navigate?: boolean; signal?: AbortSignal; revalidationTimestamp?: number }
    ): Promise<void> {
        // Only abort in-flight GET navigations, not mutations
        // Mutations (POST/PUT/DELETE/PATCH) should complete even if user navigates away
        const isGetNavigation = !submission || submission.formMethod === "GET";
        if (isGetNavigation && this.#currentNavigationAbortController) {
            this.#currentNavigationAbortController.abort();
        }

        // Create a new abort controller for this navigation
        // If a signal is provided, chain it
        const navigationController = new AbortController();
        // Only track GET navigations - mutations should never be auto-aborted
        if (isGetNavigation) {
            this.#currentNavigationAbortController = navigationController;
        }

        // If a signal is provided, listen to it and abort our navigation if it aborts
        let externalAbortCleanup: (() => void) | undefined;
        if (options?.signal) {
            if (options.signal.aborted) {
                // Already aborted, bail out immediately
                return;
            }
            externalAbortCleanup = events(options.signal, [
                dom.abort(() => navigationController.abort()),
            ]);
        }
        // Parse the pathname
        const url = new URL(pathname, window.location.origin);
        const location = {
            ...window.location,
            pathname: url.pathname,
            search: url.search,
            hash: url.hash,
            href: url.href,
        } as Location;

        // Capture the current location href to detect if user navigates away during this request
        const hrefAtStart = this.#location.href;

        // Set up navigation state
        const fromNavigation = this.#navigating.to;
        const toNavigation: Navigation = submission
            ? {
                  state: "submitting",
                  location,
                  url,
                  formMethod: submission.formMethod,
                  formAction: submission.formAction,
                  formEncType: submission.formEncType,
                  formData: submission.formData,
                  json: submission.json,
                  text: submission.text,
              }
            : {
                  state: "loading",
                  location,
                  url,
                  formMethod: undefined,
                  formAction: undefined,
                  formEncType: undefined,
                  formData: undefined,
                  json: undefined,
                  text: undefined,
              };

        this.#navigating = {
            to: toNavigation,
            from: fromNavigation,
        };
        this.#update();

        try {
            // Match the route and get params
            const method = submission?.formMethod || "GET";
            const matchResult = this.#matchRoute(url, method);

            if (!matchResult) {
                throw new Error(`No route found for ${pathname} with method ${method}`);
            }

            // Call the route handler
            const result = await this.#callHandler(
                matchResult.params,
                matchResult.handler,
                url,
                submission
            );

            // Check if this navigation was aborted during the handler call
            if (navigationController.signal.aborted) {
                // Don't call this.#update() - the navigation that aborted this one already updated state
                externalAbortCleanup?.();
                return;
            }

            // If this is a revalidation, check if a newer one has started
            if (
                options?.revalidationTimestamp &&
                options.revalidationTimestamp !== this.#lastRevalidationTimestamp
            ) {
                externalAbortCleanup?.();
                return;
            }

            // Update outlet with the result
            this.#outlet = result;
            // Only update location for GET requests (navigation and GET form submissions)
            // For non-GET requests (mutations), keep the current location
            if (!submission || submission.formMethod === "GET") {
                this.#location = location;
            }

            // Set navigating to idle
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
                from: toNavigation,
            };
            this.#update();

            // Clear the current navigation controller if this is still the active one
            if (
                isGetNavigation &&
                this.#currentNavigationAbortController === navigationController
            ) {
                this.#currentNavigationAbortController = null;
            }

            // Cleanup external abort listener
            externalAbortCleanup?.();
        } catch (error) {
            // Check if this navigation was aborted
            if (navigationController.signal.aborted) {
                // Don't call this.#update() - the navigation that aborted this one already updated state
                externalAbortCleanup?.();
                return;
            }

            // Check if this is a redirect
            if (error && typeof error === "object" && "redirect" in error) {
                const redirectError = error as { redirect: string; replace: boolean };
                // Only perform redirect navigation if:
                // 1. navigate is not false, AND
                // 2. For mutations, the user hasn't navigated away (location href is still the same), AND
                // 3. The redirect destination is different from current location
                const userNavigatedAway = submission && this.#location.href !== hrefAtStart;
                const redirectUrl = new URL(redirectError.redirect, window.location.origin);
                const redirectTarget = redirectUrl.pathname + redirectUrl.search + redirectUrl.hash;
                const currentPath =
                    this.#location.pathname + this.#location.search + this.#location.hash;
                const alreadyAtDestination = redirectTarget === currentPath;

                if (options?.navigate !== false) {
                    if (!userNavigatedAway) {
                        if (alreadyAtDestination) {
                            // React Router style: revalidate current page instead of redirecting to same page
                            // Track timestamp to prevent stale revalidations from committing
                            const revalidationTimestamp = Date.now();
                            this.#lastRevalidationTimestamp = revalidationTimestamp;
                            await this.#goto(
                                window.location.pathname +
                                    window.location.search +
                                    window.location.hash,
                                undefined,
                                { revalidationTimestamp }
                            );
                        } else {
                            await this.navigate(redirectError.redirect, {
                                replace: redirectError.replace,
                                signal: options?.signal,
                            });
                        }
                    } else {
                        // User navigated away during mutation - revalidate current page to update shared data (like sidebar)
                        const revalidationTimestamp = Date.now();
                        this.#lastRevalidationTimestamp = revalidationTimestamp;
                        await this.#goto(
                            this.#location.pathname + this.#location.search + this.#location.hash,
                            undefined,
                            { revalidationTimestamp }
                        );
                    }
                }
                return;
            }

            // Handle error - for now just set to idle
            console.error("Navigation error:", error);
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
                from: toNavigation,
            };
            this.#update();

            // Clear the current navigation controller if this is still the active one
            if (
                isGetNavigation &&
                this.#currentNavigationAbortController === navigationController
            ) {
                this.#currentNavigationAbortController = null;
            }

            // Cleanup external abort listener
            externalAbortCleanup?.();

            throw error;
        }
    }

    async #gotoSelf() {
        await this.#goto(window.location.pathname + window.location.search + window.location.hash);
    }

    #matchRoute(
        url: URL,
        method: string = "GET"
    ): { params: Record<string, string>; handler: any } | null {
        const pathname = url.pathname;

        // Try to match against all registered routes
        for (const route of this.#routes.values()) {
            // Check if method matches
            const methodMatches = route.method === "ANY" || route.method === method;

            if (methodMatches) {
                const matchResult = route.pattern.match({ pathname });
                if (matchResult) {
                    // Decode URL parameters
                    const decodedParams: Record<string, string> = {};
                    for (const [key, value] of Object.entries(matchResult.params)) {
                        if (value) {
                            decodedParams[key] = decodeURIComponent(String(value));
                        }
                    }

                    return {
                        params: decodedParams,
                        handler: route.handler,
                    };
                }
            }
        }

        return null;
    }

    async #callHandler(
        params: Record<string, string>,
        handler: any,
        url: URL,
        submission?: {
            formMethod: FormMethod;
            formAction: string;
            formEncType: FormEncType;
            formData?: FormData;
            json?: JsonValue;
            text?: string;
        }
    ): Promise<Renderable | null> {
        const method = (submission?.formMethod || "GET") as FormMethod;

        // Build context based on method type
        let result: Renderable | Response | null;
        if (method === "GET") {
            result = await handler({
                params,
                method: "GET",
                url,
                storage: this.#storage,
            });
        } else {
            // For mutation methods, formData is required
            if (!submission?.formData) {
                throw new Error(`FormData is required for ${method} requests`);
            }

            result = await handler({
                params,
                method,
                formData: submission.formData,
                url,
                storage: this.#storage,
            });
        }

        // If the result is a Response, handle it
        if (result instanceof Response) {
            // Handle redirects
            if (result.status >= 300 && result.status < 400) {
                const location = result.headers.get("Location");
                if (location) {
                    // Throw a special redirect error that will be caught in #goto
                    throw {
                        redirect: location,
                        replace: result.status === 303 || result.status === 307,
                    };
                }
            }

            // Handle responses with _element (from render())
            if (result._element) {
                return result._element;
            }

            // Handle JSON responses - just return current outlet unchanged
            const contentType = result.headers.get("Content-Type");
            if (contentType?.includes("application/json")) {
                // For JSON responses, keep the current outlet
                return this.#outlet;
            }

            // Unknown response type
            throw new Error(
                "Response returned from handler does not have _element property. Make sure to use render() function for HTML responses."
            );
        }

        return result;
    }

    /**
     * Map routes to handlers, similar to `@remix-run/fetch-router`.
     *
     * Supports both single route objects as well as nested route maps produced by {@link route}.
     *
     * @param routes - Route definition or route map to register.
     * @param handlers - JSX-producing handlers that align with the route structure.
     */
    map<T extends RouteMap>(routes: T, handlers: RouteHandlers<T>): void;
    map(route: any, handler: any): void;
    map(routeOrRoutes: any, handlerOrHandlers: any): void {
        const wasEmpty = this.#routes.size === 0;

        // Single route mapping
        if (
            routeOrRoutes &&
            typeof routeOrRoutes === "object" &&
            "match" in routeOrRoutes &&
            typeof routeOrRoutes.match === "function"
        ) {
            // This is a single Route object
            const route = routeOrRoutes;
            const handler = handlerOrHandlers;
            const method = (route as any).method || "ANY";
            const key = `${method}:${(route as any).pattern}`;

            this.#routes.set(key, {
                pattern: route,
                method,
                handler,
            });
        } else {
            // Route map mapping - recursively process the route tree
            this.#mapRouteTree(routeOrRoutes, handlerOrHandlers);
        }

        // If this is the first route being registered, perform initial navigation
        if (wasEmpty && this.#routes.size > 0 && !this.#started) {
            this.#started = true;
            queueMicrotask(() => {
                this.#gotoSelf();
            });
        }
    }

    #mapRouteTree(routeMap: any, handlers: any): void {
        // Handle handlers with middleware wrapper
        if (handlers && typeof handlers === "object" && "handlers" in handlers) {
            // TODO: Add middleware support
            handlers = handlers.handlers;
        }

        for (const key in routeMap) {
            const route = routeMap[key];
            const handler = handlers[key];

            if (!handler) {
                continue;
            }

            // Check if this is a Route object (has a match method)
            if (
                route &&
                typeof route === "object" &&
                "match" in route &&
                typeof route.match === "function"
            ) {
                // This is a leaf route - register it
                const method = (route as any).method || "ANY";
                const pattern = (route as any).pattern;
                const routeKey = `${method}:${pattern}`;

                // Handle handler with middleware wrapper
                let finalHandler = handler;
                if (handler && typeof handler === "object" && "handler" in handler) {
                    // TODO: Add middleware support
                    finalHandler = handler.handler;
                }

                this.#routes.set(routeKey, {
                    pattern: route,
                    method,
                    handler: finalHandler,
                });
            } else if (route && typeof route === "object" && !("match" in route)) {
                // This is a nested RouteMap - recurse
                this.#mapRouteTree(route, handler);
            }
        }
    }

    /**
     * Programmatically navigate to a new location.
     *
     * This updates browser history, resolves the target against registered routes, and updates
     * the outlet with the resulting Remix node.
     *
     * @param to - Target location (string, URL, or partial path object).
     * @param options - Navigation behavior overrides such as history replacement.
     */
    async navigate(to: To, options: NavigateOptions = {}): Promise<void> {
        const pathname = this.#resolveTo(to);
        const currentPath =
            window.location.pathname + window.location.search + window.location.hash;

        // Update history only if the path is different
        if (pathname !== currentPath) {
            if (options.replace) {
                window.history.replaceState({}, "", pathname);
            } else {
                window.history.pushState({}, "", pathname);
            }
        }

        // Perform navigation
        await this.#goto(pathname, undefined, { signal: options.signal });
    }

    /**
     * Submit form data or arbitrary payloads to the router.
     *
     * The submission resolves against the registered mutation handler, updates navigation state,
     * and optionally triggers a browser navigation depending on the submission options.
     *
     * @param target - Form element, data object, or payload to submit.
     * @param options - Submission options such as method, encType, or navigation behavior.
     */
    async submit(target: SubmitTarget, options: SubmitOptions = {}): Promise<void> {
        let formData: FormData | undefined;
        let json: JsonValue | undefined;
        let text: string | undefined;
        let formAction: string;
        let formMethod: FormMethod;
        let formEncType: FormEncType;

        // Determine what we're submitting
        if (target instanceof HTMLFormElement) {
            formData = new FormData(target);
            formAction = options.action || target.action || window.location.pathname;
            formMethod = (options.method || target.method || "GET").toUpperCase() as FormMethod;
            formEncType = (options.encType ||
                target.enctype ||
                "application/x-www-form-urlencoded") as FormEncType;
        } else if (target instanceof FormData) {
            formData = target;
            formAction = options.action || window.location.pathname;
            formMethod = (options.method || "POST").toUpperCase() as FormMethod;
            formEncType = (options.encType || "application/x-www-form-urlencoded") as FormEncType;
        } else if (target instanceof URLSearchParams) {
            formData = new FormData();
            for (const [key, value] of target.entries()) {
                formData.append(key, value);
            }
            formAction = options.action || window.location.pathname;
            formMethod = (options.method || "POST").toUpperCase() as FormMethod;
            formEncType = (options.encType || "application/x-www-form-urlencoded") as FormEncType;
        } else if (
            typeof target === "string" ||
            typeof target === "number" ||
            typeof target === "boolean" ||
            target === null ||
            typeof target === "object"
        ) {
            json = target as JsonValue;
            formAction = options.action || window.location.pathname;
            formMethod = (options.method || "POST").toUpperCase() as FormMethod;
            formEncType = "application/json";
        } else {
            throw new Error("Invalid submit target");
        }

        // For GET requests, append form data as search params
        if (formMethod === "GET" && formData) {
            const url = new URL(formAction, window.location.origin);
            // Clear existing search params
            url.search = "";
            // Add form data as search params
            for (const [key, value] of formData.entries()) {
                if (typeof value === "string") {
                    url.searchParams.append(key, value);
                }
            }
            formAction = url.pathname + url.search;
            // For GET requests, we don't send formData in the body
            formData = undefined;
        }

        // Update history only for GET requests
        // Non-GET requests (POST, PUT, DELETE, etc.) should not change the URL or add history entries
        if (options.navigate !== false && formMethod === "GET") {
            if (options.replace) {
                window.history.replaceState({}, "", formAction);
            } else {
                window.history.pushState({}, "", formAction);
            }
        }

        // Perform submission
        await this.#goto(
            formAction,
            {
                formMethod,
                formAction,
                formEncType,
                formData,
                json,
                text,
            },
            { navigate: options.navigate, signal: options.signal }
        );
    }

    /**
     * Check if a path is currently active.
     * Supports partial matching - e.g., isActive("/blog") returns true for "/blog/post/1"
     * @param path - The path to check
     * @param exact - If true, requires exact match. Default is false (partial match)
     */
    isActive(path: string | URL | Path | undefined, exact = false): boolean {
        if (!path) return false;
        const pathname = this.#pathToString(path);
        const currentPath = this.#location.pathname;

        if (exact) {
            return currentPath === pathname;
        }

        // Partial match: current path starts with the given path
        // Ensure we match on segment boundaries
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
        if (!path) return false;
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
     *   (event) => {
     *     if (event.detail) {
     *       // Handle optimistic update with FormData
     *       console.log('Optimistic update:', event.detail);
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
        // Determine which overload is being used
        const hasOptimisticHandler = typeof handlerOrOptions === "function";
        const optimisticHandler = hasOptimisticHandler
            ? (handlerOrOptions as (data: FormData | null) => void | Promise<void>)
            : undefined;
        const options: AddEventListenerOptions = hasOptimisticHandler
            ? maybeOptions ?? {}
            : ((handlerOrOptions ?? {}) as AddEventListenerOptions);
        // Standard form enhancement without optimistic updates
        return dom.submit(async event => {
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
            // Include submitter to capture button values
            const formData = new FormData(form, event.submitter);
            let method = form.method.toUpperCase();
            const methodOverride = formData.get("webstd-ui:method");
            if (methodOverride && typeof methodOverride === "string") {
                method = methodOverride.toUpperCase();
                formData.delete("webstd-ui:method");
            }

            // Dispatch optimistic update
            optimisticHandler?.(formData);

            await this.submit(formData, {
                action: form.action,
                method: method as FormMethod,
            });

            if (options.signal?.aborted) return;

            // Clear optimistic state
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
     *
     * @example
     * ```tsx
     * <a href={href} on={router.enhanceLink({ activeClass: 'active', pendingClass: 'loading' })}>...</a>
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
                void this.navigate(targetPath, {});
            }
        }, options);
    }

    /**
     * Wrap a form submission handler to emit optimistic updates while the mutation is pending.
     *
     * The returned handler dispatches `rmx:optimistic` events with the submitted {@link FormData}
     * before delegating to {@link Router.submit}, and clears the optimistic state once the
     * submission completes.
     *
     * @deprecated Use {@link enhanceForm} with a handler parameter instead for the same functionality.
     *
     * @param handler - Event handler invoked with optimistic payload events.
     * @param options - Optional abort signal to cancel optimistic updates.
     */
    optimistic(
        handler: EventHandler<CustomEvent<FormData | null>, HTMLFormElement>,
        options: AddEventListenerOptions = {}
    ) {
        const optimisticUpdates = createInteraction<HTMLFormElement, FormData | null>(
            "rmx:optimistic",
            ({ target, dispatch }) => {
                return events(target, [
                    dom.submit(async event => {
                        event.preventDefault();
                        event.stopPropagation();
                        event.stopImmediatePropagation();

                        const formData = new FormData(event.currentTarget, event.submitter);
                        dispatch({ detail: formData });

                        await this.submit(formData, {
                            action: event.currentTarget.action,
                            method: (formData.get("webstd-ui:method") ??
                                event.currentTarget.method) as HTMLFormMethod,
                        });
                        if (options.signal?.aborted) return;

                        dispatch({ detail: null });
                    }, options),
                ]);
            }
        );

        return optimisticUpdates(handler);
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
