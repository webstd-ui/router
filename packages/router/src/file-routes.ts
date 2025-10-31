import { Route } from "@remix-run/fetch-router";
import type { Route as FetchRoute, RouteHandler } from "@remix-run/fetch-router";
import {
    type HandlerContext,
    type RouterComponentContext,
    type RouterLoader,
} from "./remix-router.ts";
import type { InferRouteHandler, RouteMap, RequestMethod } from "@remix-run/fetch-router";
import type { AppStorage, RequestContext } from "@remix-run/fetch-router";

export interface RouteModule<
    TRoute extends FetchRoute<any, any>,
    Renderable,
    Loader extends RouterLoader<TRoute, any> | undefined,
    LoaderData,
> {
    readonly id: string;
    readonly route: TRoute;
    readonly loader: Loader;
    readonly component?: (context: RouterComponentContext<TRoute, Renderable, LoaderData>) => Renderable;
    readonly children: Record<string, RouteModule<any, Renderable, any, any>>;
    useLoaderData(): LoaderData;
    useParams(): HandlerContext<TRoute>["params"];
}

export type RouteModuleConfig<
    TRoute extends FetchRoute<any, any>,
    Renderable,
    Loader extends RouterLoader<TRoute, any> | undefined,
    LoaderData,
> = (Loader extends RouterLoader<TRoute, any>
    ? {
          loader: Loader;
          component?: (context: RouterComponentContext<TRoute, Renderable, LoaderData>) => Renderable;
      }
    : {
          loader?: Loader;
          component?: (
              context: RouterComponentContext<TRoute, Renderable, undefined>
          ) => Renderable;
      }) & {
    id?: string;
    children?: Record<string, RouteModule<any, Renderable, any, any>>;
};

class RouteModuleImpl<
    TRoute extends FetchRoute<any, any>,
    Renderable,
    Loader extends RouterLoader<TRoute, any> | undefined,
    LoaderData,
> implements RouteModule<TRoute, Renderable, Loader, LoaderData>
{
    readonly id: string;
    readonly route: TRoute;
    readonly loader: Loader;
    readonly component?: (context: RouterComponentContext<TRoute, Renderable, LoaderData>) => Renderable;
    readonly children: Record<string, RouteModule<any, Renderable, any, any>>;

    #currentContext: RouterComponentContext<TRoute, Renderable, LoaderData> | undefined;

    constructor(
        route: TRoute,
        config: RouteModuleConfig<TRoute, Renderable, Loader, LoaderData>
    ) {
        this.route = route;
        this.id = config.id ?? (route as any).pattern?.pattern ?? "";
        this.loader = config.loader as Loader;
        this.component = config.component as any;
        this.children = config.children ?? {};
    }

    runWithContext<T>(context: RouterComponentContext<TRoute, Renderable, LoaderData>, fn: () => T): T {
        this.#currentContext = context;
        try {
            return fn();
        } finally {
            this.#currentContext = undefined;
        }
    }

    useLoaderData(): LoaderData {
        if (!this.#currentContext) {
            throw new Error(`useLoaderData() called outside of route component for ${this.id}`);
        }
        return this.#currentContext.data;
    }

    useParams(): HandlerContext<TRoute>["params"] {
        if (!this.#currentContext) {
            throw new Error(`useParams() called outside of route component for ${this.id}`);
        }
        return this.#currentContext.params;
    }
}

export function createRoute<TRoute extends FetchRoute<any, any>>(route: TRoute) {
    return function defineRoute<
        Loader extends RouterLoader<TRoute, any> | undefined,
        Renderable,
        LoaderData = Loader extends RouterLoader<TRoute, infer Data> ? Awaited<Data> : undefined
    >(
        config: RouteModuleConfig<TRoute, Renderable, Loader, LoaderData>
    ): RouteModule<TRoute, Renderable, Loader, LoaderData> {
        return new RouteModuleImpl<TRoute, Renderable, Loader, LoaderData>(route, config);
    };
}

export function createFileRoute<Path extends string>(path: Path) {
    return createRoute(new Route("GET", path) as FetchRoute<"GET", Path>);
}

// =============================================================================
// Root Handler/Component Inference - Clean implementation
// =============================================================================

type RootRoute = Route<"GET", "/">;

// Helper to convert union to intersection
type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void
    ? I
    : never;

// Extract first argument of a function
type FirstArg<F> = F extends (arg: infer A, ...rest: any) => any ? A : never;

// Get the awaited return value of a handler function, excluding Response/void/undefined
type HandlerData<F> = F extends (...args: any[]) => infer R
    ? Exclude<Awaited<R>, Response | void | undefined>
    : unknown;

// Build component context from a handler function
type ComponentContext<Handler, Renderable> = FirstArg<Handler> extends infer Context
    ? {
          data: HandlerData<Handler>;
          loaderData: HandlerData<Handler>;
          params: Context extends { params: infer P } ? P : Record<string, unknown>;
          request: Context extends { request: infer R } ? R : Request;
          url: Context extends { url: infer U } ? U : URL;
          storage: Context extends { storage: infer S } ? S : AppStorage;
          outlet: Renderable | null;
          children: Renderable | null;
      }
    : never;

// Get all keys from nested children (both direct children and grandchildren)
type AllChildKeys<Children> = Children extends object
    ? keyof Children |
          ({
              [K in keyof Children]: Children[K] extends object
                  ? Children[K] extends (...args: any[]) => any
                      ? never
                      : keyof Children[K]
                  : never;
          }[keyof Children] extends infer U
              ? U extends never
                  ? never
                  : U
              : never)
    : never;

// Get the handler function for a given key from nested children
type GetHandlerForKey<Children, Key> = Children extends object
    ? Key extends keyof Children
        ? Children[Key] extends (...args: any[]) => any
            ? Children[Key]
            : never
        : {
              [K in keyof Children]: Children[K] extends object
                  ? Key extends keyof Children[K]
                      ? Children[K][Key] extends (...args: any[]) => any
                          ? Children[K][Key]
                          : never
                      : never
                  : never;
          }[keyof Children]
    : never;

// Build flat component contexts directly
type ComponentContextsFromHandlers<T, Renderable> = T extends {
    root: infer RootHandler;
    children: infer Children;
}
    ? RootHandler extends (...args: any[]) => any
        ? Children extends object
            ? {
                  root: ComponentContext<RootHandler, Renderable>;
              } & {
                  [K in AllChildKeys<Children>]: GetHandlerForKey<Children, K> extends infer Handler
                      ? Handler extends (...args: any[]) => any
                          ? ComponentContext<Handler, Renderable>
                          : never
                      : never;
              }
            : { root: ComponentContext<RootHandler, Renderable> }
        : {}
    : {};

// Map component contexts to component function signatures
type ComponentFunctionMap<Handlers, Renderable> = {
    [K in keyof ComponentContextsFromHandlers<Handlers, Renderable>]: (
        context: ComponentContextsFromHandlers<Handlers, Renderable>[K]
    ) => Renderable;
};

// Generic context for components without specific handlers
type GenericComponentContext<Renderable> = {
    data: unknown;
    loaderData: unknown;
    params: Record<string, unknown>;
    request: Request;
    url: URL;
    storage: AppStorage;
    outlet: Renderable | null;
    children: Renderable | null;
};

// Additional component functions for routes without handlers
type AdditionalComponentFunctions<Handlers, Renderable> = {
    [K in string]?: K extends keyof ComponentContextsFromHandlers<Handlers, Renderable>
        ? never
        : (context: GenericComponentContext<Renderable>) => Renderable;
};

// Infer the component structure matching the handler structure
export type InferRootComponents<Handlers, Renderable = any> = {
    root: Handlers extends { root: infer RootHandler }
        ? RootHandler extends (...args: any) => any
            ? (context: ComponentContext<RootHandler, Renderable>) => Renderable
            : never
        : never;
    children?: Partial<ComponentFunctionMap<Handlers, Renderable>> &
        Partial<AdditionalComponentFunctions<Handlers, Renderable>>;
};

// Infer root handlers structure (kept for compatibility)
type ChildMap<T extends RouteMap> = {
    [K in keyof T]?:
        | (T[K] extends FetchRoute<RequestMethod | "ANY", any>
              ? (context: HandlerContext<T[K]>) => any | Promise<any>
              : never)
        | (T[K] extends RouteMap ? ChildNode<T[K]> : never);
};

type ChildNode<T extends RouteMap> = ChildMap<T> & {
    children?: ChildMap<T>;
};

export type InferRootHandlers<T extends RouteMap> = {
    root: (context: HandlerContext<RootRoute>) => any | Promise<any>;
} & ChildNode<T>;

// =============================================================================
// Co-located Loader/Component Pattern
// =============================================================================

// A route node that contains both loader and component together
export type RouteNode<
    TRoute extends FetchRoute<any, any>,
    Renderable,
    Loader extends ((context: HandlerContext<TRoute>) => any) | undefined
> = {
    loader?: Loader;
    component?: (
        context: RouterComponentContext<
            TRoute,
            Renderable,
            Loader extends (context: any) => infer R
                ? Exclude<Awaited<R>, Response | void | undefined>
                : undefined
        >
    ) => Renderable;
};

// Helper to extract loader data type from a RouteNode
type ExtractLoaderData<Node> = Node extends RouteNode<any, any, infer Loader>
    ? Loader extends (context: any) => infer R
        ? Exclude<Awaited<R>, Response | void | undefined>
        : undefined
    : undefined;

// Type for a tree of route nodes
export type RouteTree<Renderable> = {
    root: RouteNode<any, Renderable, any>;
    children?: Record<string, RouteNode<any, Renderable, any> | RouteTree<Renderable>>;
};

// Helper to define a route tree with proper type inference
export function defineRouteTree<Renderable, Tree extends RouteTree<Renderable>>(
    tree: Tree
): Tree {
    return tree;
}

// Helper to extract the actual handler function from RouteHandler type
type ExtractHandler<T> = T extends (context: infer C) => infer R
    ? (context: C) => R
    : T extends { handler: infer H }
    ? H
    : T;

// Helper to create a route node builder for a specific Renderable type
export function createRouteNodeBuilder<Renderable>() {
    // Overload for loaders with components (fully typed)
    function defineRouteNode<TRoute extends FetchRoute<any, any>, Loader extends (context: HandlerContext<TRoute>) => any>(
        route: TRoute,
        config: {
            loader: Loader;
            component: (
                context: RouterComponentContext<
                    TRoute,
                    Renderable,
                    Loader extends (context: any) => infer R
                        ? Exclude<Awaited<R>, Response | void | undefined>
                        : undefined
                >
            ) => Renderable;
        }
    ): RouteNode<TRoute, Renderable, Loader>;

    // Overload for loaders without components (actions - less strict typing)
    function defineRouteNode<TRoute extends FetchRoute<any, any>, Loader>(
        route: TRoute,
        config: {
            loader: Loader;
            component?: undefined;
        }
    ): RouteNode<TRoute, Renderable, Loader>;

    // Overload for component-only (no loader)
    function defineRouteNode<TRoute extends FetchRoute<any, any>>(
        route: TRoute,
        config: {
            loader?: undefined;
            component?: (context: RouterComponentContext<TRoute, Renderable, undefined>) => Renderable;
        }
    ): RouteNode<TRoute, Renderable, undefined>;

    // Implementation
    function defineRouteNode<TRoute extends FetchRoute<any, any>>(route: TRoute, config: any): any {
        return config;
    }

    return defineRouteNode;
}

// Helper to define a single route node with explicit type parameters
export function defineRouteNode<
    TRoute extends FetchRoute<any, any>,
    Renderable,
    Loader extends ((context: HandlerContext<TRoute>) => any) | undefined = undefined
>(
    route: TRoute,
    config: {
        loader?: Loader;
        component?: (
            context: RouterComponentContext<
                TRoute,
                Renderable,
                Loader extends (context: any) => infer R
                    ? Exclude<Awaited<R>, Response | void | undefined>
                    : undefined
            >
        ) => Renderable;
    }
): RouteNode<TRoute, Renderable, Loader> {
    return config;
}
