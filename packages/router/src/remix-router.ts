import { createEventType, doc, events, win } from "@remix-run/events";
import type { EventDescriptor } from "@remix-run/events";
import type { Path, Location as RemixLocation } from "@remix-run/router";
import type {
    AppStorage,
    InferRouteHandler,
    RequestMethod,
    Route,
    RouteHandlers,
    RouteMap,
} from "@remix-run/fetch-router";
import type { RoutePattern } from "@remix-run/route-pattern";
import type { NavigateOptions, Navigation, SubmitOptions, SubmitTarget, To } from "./types.ts";
import { nav } from "./targets.ts";

function todo(): never {
    throw new Error("Not implemented");
}

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

    get location(): Router.Location {
        return todo();
    }

    get url(): URL {
        return todo();
    }

    get navigating(): Router.Navigating {
        return todo();
    }

    get outlet(): Renderable | null {
        return todo();
    }

    get storage(): AppStorage {
        return todo();
    }

    constructor({ globallyEnhance = true }: Router.Options = {}) {
        super();

        if (globallyEnhance) {
            if ("navigation" in window) {
                events(window.navigation, [nav.navigate(event => todo())]);
            } else {
                events(document, [doc.click(event => todo()), doc.submit(event => todo())]);
                events(window, [win.popstate(() => todo())]);
            }
        }

        todo();
    }

    #dispatchState() {
        this.dispatchEvent(createChange(todo()));
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
        todo();
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
        todo();
    }

    // TODO: Do we want/need `fetcher`/`fetch` here? Theoretically, it's integrated into submit...

    revalidate(): void {
        todo();
    }

    /**
     * Check if a path is currently active.
     * Supports partial matching - e.g., isActive("/blog") returns true for "/blog/post/1"
     * @param path - The path to check
     * @param exact - If true, requires exact match. Default is false (partial match)
     */
    isActive(path: string | URL | Path | undefined, exact = false): boolean {
        todo();
    }

    /**
     * Check if a path is currently pending navigation.
     * Supports partial matching - e.g., isPending("/blog") returns true when navigating to "/blog/post/1"
     * @param path - The path to check
     * @param exact - If true, requires exact match. Default is false (partial match)
     */
    isPending(path: string | URL | Path | undefined, exact = false): boolean {
        todo();
    }

    when<T, U>(
        path: string | URL | Path | undefined,
        state: { active: T; pending: U }
    ): T | U | undefined {
        todo();
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
        todo();
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
        todo();
    }

    /**
     * Mount a router at a given pathname prefix in the current router.
     */
    mount(router: Router): void;
    mount(pathnamePrefix: string, router: Router): void;
    mount(arg: string | Router, router?: Router): void {
        todo();
    }

    route<M extends RequestMethod | "ANY", P extends string>(
        method: M,
        pattern: P | RoutePattern<P> | Route<M | "ANY", P>,
        handler: InferRouteHandler<P>
    ): void {
        todo();
    }

    map<M extends RequestMethod | "ANY", P extends string>(
        route: P | RoutePattern<P> | Route<M, P>,
        handler: InferRouteHandler<P>
    ): void;
    map<T extends RouteMap>(routes: T, handlers: RouteHandlers<T>): void;
    map(routeOrRoutes: any, handler: any): void {
        todo();
    }

    get<P extends string>(
        pattern: P | RoutePattern<P> | Route<"GET" | "ANY", P>,
        handler: InferRouteHandler<P>
    ): void {
        this.route("GET", pattern, handler);
    }

    head<P extends string>(
        pattern: P | RoutePattern<P> | Route<"HEAD" | "ANY", P>,
        handler: InferRouteHandler<P>
    ): void {
        this.route("HEAD", pattern, handler);
    }

    post<P extends string>(
        pattern: P | RoutePattern<P> | Route<"POST" | "ANY", P>,
        handler: InferRouteHandler<P>
    ): void {
        this.route("POST", pattern, handler);
    }

    put<P extends string>(
        pattern: P | RoutePattern<P> | Route<"PUT" | "ANY", P>,
        handler: InferRouteHandler<P>
    ): void {
        this.route("PUT", pattern, handler);
    }

    patch<P extends string>(
        pattern: P | RoutePattern<P> | Route<"PATCH" | "ANY", P>,
        handler: InferRouteHandler<P>
    ): void {
        this.route("PATCH", pattern, handler);
    }

    delete<P extends string>(
        pattern: P | RoutePattern<P> | Route<"DELETE" | "ANY", P>,
        handler: InferRouteHandler<P>
    ): void {
        this.route("DELETE", pattern, handler);
    }

    options<P extends string>(
        pattern: P | RoutePattern<P> | Route<"OPTIONS" | "ANY", P>,
        handler: InferRouteHandler<P>
    ): void {
        this.route("OPTIONS", pattern, handler);
    }
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
//         component: () => html`<app-layout><router-outlet></router-outlet></app-layout>`,
//         children: {
//             home: () => html`<app-home></app-home>`,
//             posts: {
//                 index: {
//                     async loader({ storage }) {
//                         const posts = await getPosts(storage);
//                         return json({ posts });
//                     },
//                     component: ({ data }) =>
//                         html`<app-posts-list .posts=${data.posts}></app-posts-list>`,
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
//                         const post = await getPost(Number(params.id), storage);
//                         //                                       ^ params is typesafe
//                         //                                         will only show id: string
//                         return json(post);
//                     },
//                     component: ({ data: { title, content } }) =>
//                         html`<app-post title="${title}">${content}</app-post>`,
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
