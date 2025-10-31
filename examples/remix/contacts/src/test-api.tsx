import {
    createEmptyContact,
    deleteContact,
    getContact,
    getContacts,
    updateContact,
} from "~/lib/contacts.ts";
import { redirect } from "@remix-run/fetch-router";
import { RoutePattern } from "@remix-run/route-pattern";
import type { Join, Params as RouteParams } from "@remix-run/route-pattern";
import { Details } from "~/components/Details.tsx";
import { RestfulForm } from "~/components/RestfulForm.tsx";
import { SearchBar } from "~/components/SearchBar.tsx";
import { Sidebar } from "~/components/Sidebar.tsx";
import type { Remix } from "@remix-run/dom";

type HandlerData<Handler> = Handler extends (...args: any[]) => infer Result
    ? Exclude<Awaited<Result>, Response | undefined | void>
    : undefined;

interface RouteHandlerContext<Path extends string> {
    params: RouteParams<Path>;
    request: Request;
    url: URL;
    formData: FormData;
}

type RouteHandler<Path extends string> = (context: RouteHandlerContext<Path>) => any;

interface RouteComponentContext<Path extends string, Handler, Renderable> {
    data: HandlerData<Handler>;
    params: RouteParams<Path>;
    request: Request;
    url: URL;
    formData: FormData;
    children: Renderable;
}

type RouteComponent<Path extends string, Handler, Renderable> = (
    context: RouteComponentContext<Path, Handler, Renderable>
) => Renderable;

export interface RouteDefinition<
    Method extends string,
    Path extends string,
    Handler = RouteHandler<Path> | undefined,
    Renderable = unknown,
    Children extends Record<string, any> | undefined = undefined
> {
    method: Method;
    pattern: RoutePattern<Path>;
    href: RoutePattern<Path>["href"];
    match: RoutePattern<Path>["match"];
    handler: Handler;
    component?: RouteComponent<Path, Handler, Renderable>;
    children: Children;
}

interface RouteConfig<Path extends string, Method extends string, Handler, Renderable> {
    pattern: Path | RoutePattern<Path>;
    method: Method;
    handler?: Handler;
    component?: RouteComponent<Path, Handler, Renderable>;
}

type PrefixedPattern<Prefix extends string, Path extends string> = Prefix extends "/"
    ? Path extends `/${string}`
        ? Path
        : Join<Prefix, Path>
    : Path extends `${Prefix}${string}`
      ? Path
      : Join<Prefix, Path>;

type PrefixedChildren<Prefix extends string, Children> = Children extends Record<string, any>
    ? PrefixedRoutes<Prefix, Children>
    : Children;

type PrefixedRoutes<Prefix extends string, Routes> = {
    [K in keyof Routes]: Routes[K] extends RouteDefinition<
        infer Method,
        infer Path,
        infer Handler,
        infer Renderable,
        infer Children
    >
        ? RouteDefinition<
              Method,
              PrefixedPattern<Prefix, Path>,
              Handler,
              Renderable,
              PrefixedChildren<PrefixedPattern<Prefix, Path>, Children>
          >
        : Routes[K] extends { pattern: infer Pattern extends string }
          ? RouteDefinition<
                Routes[K] extends { method: infer Method extends string } ? Method : string,
                PrefixedPattern<Prefix, Pattern>,
                Routes[K] extends { handler?: infer Handler }
                    ? Handler
                    : RouteHandler<PrefixedPattern<Prefix, Pattern>> | undefined,
                Routes[K] extends { component?: (...args: any[]) => infer Renderable }
                    ? Renderable
                    : unknown,
                undefined
            >
          : Routes[K] extends Record<string, any>
            ? PrefixedRoutes<Prefix, Routes[K]>
            : Routes[K];
};

function toRoutePattern<Path extends string>(pattern: Path | RoutePattern<Path>): RoutePattern<Path> {
    return pattern instanceof RoutePattern ? pattern : new RoutePattern(pattern);
}

export function route<
    const Path extends string,
    Method extends string,
    Renderable = unknown,
    Handler extends RouteHandler<Path> | undefined = RouteHandler<Path> | undefined
>(config: RouteConfig<Path, Method, Handler, Renderable>): RouteDefinition<Method, Path, Handler, Renderable, undefined> {
    const { pattern: patternInput, handler, component, method } = config;
    const pattern = toRoutePattern(patternInput);

    return {
        method,
        pattern,
        href: pattern.href.bind(pattern),
        match: pattern.match.bind(pattern),
        handler: handler as Handler,
        component,
        children: undefined,
    };
}

function isPlainObject(value: unknown): value is Record<string, any> {
    return typeof value === "object" && value !== null;
}

function isRouteDefinition(value: unknown): value is RouteDefinition<string, string, any, any> {
    return (
        isPlainObject(value) &&
        value.pattern instanceof RoutePattern &&
        typeof value.href === "function" &&
        typeof value.match === "function"
    );
}

function isRouteEntry(value: unknown): value is { pattern: string | RoutePattern<string> } {
    return isPlainObject(value) && "pattern" in value;
}

function ensureRoute(value: unknown): RouteDefinition<string, string, any, any> {
    if (isRouteDefinition(value)) {
        return value;
    }

    if (isRouteEntry(value)) {
        const record = value as Record<string, any>;
        const method = typeof record.method === "string" ? record.method : "GET";
        return route({
            pattern: record.pattern as string | RoutePattern<string>,
            method,
            handler: record.handler,
            component: record.component,
        });
    }

    throw new Error("Expected a route-like definition");
}

function joinPatterns<Prefix extends string, Path extends string>(
    parent: RoutePattern<Prefix>,
    child: RoutePattern<Path>
): RoutePattern<PrefixedPattern<Prefix, Path>> {
    const parentSource = parent.source;
    const childSource = child.source;
    const shouldSkipJoin =
        parentSource !== "/" &&
        childSource.startsWith(parentSource) &&
        (childSource.length === parentSource.length ||
            childSource[parentSource.length] === "/" ||
            childSource[parentSource.length] === ":");

    if (shouldSkipJoin) {
        return new RoutePattern(childSource) as RoutePattern<PrefixedPattern<Prefix, Path>>;
    }

    return parent.join(child) as RoutePattern<PrefixedPattern<Prefix, Path>>;
}

export function prefix<
    const Prefix extends string,
    Routes extends Record<string, any>
>(
    prefixInput: Prefix | RoutePattern<Prefix>,
    routes: Routes
): PrefixedRoutes<Prefix, Routes> {
    const basePattern = toRoutePattern(prefixInput);
    const result: Record<string, any> = {};

    for (const key of Object.keys(routes) as Array<keyof Routes>) {
        const value = routes[key];

        if (isRouteEntry(value)) {
            const routeDefinition = ensureRoute(value);
            const pattern = joinPatterns(basePattern, routeDefinition.pattern as RoutePattern<any>);
            const children = routeDefinition.children
                ? prefix(pattern, routeDefinition.children as Record<string, any>)
                : routeDefinition.children;

            result[key as string] = {
                ...routeDefinition,
                pattern,
                href: pattern.href.bind(pattern),
                match: pattern.match.bind(pattern),
                children,
            };
        } else if (isPlainObject(value)) {
            result[key as string] = prefix(basePattern, value as Record<string, any>);
        } else {
            result[key as string] = value;
        }
    }

    return result as PrefixedRoutes<Prefix, Routes>;
}

interface LayoutConfig<
    Path extends string,
    Handler,
    Renderable,
    Children extends Record<string, any>
> extends RouteConfig<Path, "GET", Handler, Renderable> {
    children: Children;
}

export function layout<
    Renderable,
    const Path extends string,
    Handler extends RouteHandler<Path> | undefined,
    Children extends Record<string, any>
>(config: LayoutConfig<Path, Handler, Renderable, Children>): RouteDefinition<
    "GET",
    Path,
    Handler,
    Renderable,
    PrefixedChildren<Path, Children>
> {
    const baseRoute = route<Path, "GET", Renderable, Handler>({
        pattern: config.pattern,
        method: "GET",
        handler: config.handler,
        component: config.component,
    });

    const children = prefix(baseRoute.pattern, config.children) as PrefixedChildren<Path, Children>;

    return {
        ...baseRoute,
        children,
    };
}

interface RootConfig<
    Path extends string,
    Method extends string,
    Handler,
    Renderable,
    Children extends Record<string, any>
> extends Omit<RouteConfig<Path, Method, Handler, Renderable>, "pattern" | "method"> {
    pattern?: Path | RoutePattern<Path>;
    method?: Method;
    children: Children;
}

type RootResult<
    Path extends string,
    Method extends string,
    Handler,
    Renderable,
    Children extends Record<string, any>
> = RouteDefinition<Method, Path, Handler, Renderable, PrefixedChildren<Path, Children>> &
    PrefixedRoutes<Path, Children>;

export function root<
    Renderable,
    const Path extends string = "/",
    Method extends string = "GET",
    Handler extends RouteHandler<Path> | undefined = RouteHandler<Path> | undefined,
    Children extends Record<string, any> = Record<string, any>
>(config: RootConfig<Path, Method, Handler, Renderable, Children>): RootResult<Path, Method, Handler, Renderable, Children> {
    const patternInput = (config.pattern ?? ("/" as Path)) as Path | RoutePattern<Path>;
    const method = (config.method ?? ("GET" as Method)) as Method;
    const baseRoute = route<Path, Method, Renderable, Handler>({
        pattern: patternInput,
        method,
        handler: config.handler,
        component: config.component,
    });

    const childRoutes = prefix(baseRoute.pattern, config.children) as PrefixedRoutes<Path, Children>;

    const result = {
        ...baseRoute,
        children: childRoutes as PrefixedChildren<Path, Children>,
    } as RootResult<Path, Method, Handler, Renderable, Children>;

    Object.assign(result, childRoutes);

    return result;
}

const RESOURCE_ACTIONS = [
    "index",
    "new",
    "create",
    "show",
    "edit",
    "update",
    "destroy",
] as const;

type ResourceAction = (typeof RESOURCE_ACTIONS)[number];

type ResourceMethod<Action extends ResourceAction> = Action extends "create"
    ? "POST"
    : Action extends "update"
      ? "PUT"
      : Action extends "destroy"
          ? "DELETE"
          : "GET";

type ResourcePath<Action extends ResourceAction, ParamName extends string> = Action extends "index" | "create"
    ? "/"
    : Action extends "new"
      ? "/new"
      : Action extends "edit"
          ? `/:${ParamName}/edit`
          : `/:${ParamName}`;

type ResourceRouteOptions<Action extends ResourceAction, ParamName extends string, Renderable> = Omit<
    RouteConfig<ResourcePath<Action, ParamName>, ResourceMethod<Action>, RouteHandler<ResourcePath<Action, ParamName>> | undefined, Renderable>,
    "pattern" | "method"
> & {
    pattern?: ResourcePath<Action, ParamName>;
    method?: ResourceMethod<Action>;
};

type ResourceOverrides<ParamName extends string, Renderable> = Partial<{
    [A in ResourceAction]: ResourceRouteOptions<A, ParamName, Renderable>;
}>;

type OverrideMethod<
    Overrides extends ResourceOverrides<any, any>,
    Action extends ResourceAction,
    Default extends string
> = Action extends keyof Overrides
    ? Overrides[Action] extends { method?: infer M extends string }
        ? M
        : Default
    : Default;

type OverridePattern<
    Overrides extends ResourceOverrides<any, any>,
    Action extends ResourceAction,
    Default extends string
> = Action extends keyof Overrides
    ? Overrides[Action] extends { pattern?: infer P extends string }
        ? P
        : Default
    : Default;

type OverrideHandler<
    Overrides extends ResourceOverrides<any, any>,
    Action extends ResourceAction,
    ParamName extends string
> = Action extends keyof Overrides
    ? Overrides[Action] extends {
          handler?: infer H extends RouteHandler<ResourcePath<Action, ParamName>> | undefined;
      }
        ? H
        : RouteHandler<ResourcePath<Action, ParamName>> | undefined
    : RouteHandler<ResourcePath<Action, ParamName>> | undefined;

type ResourceRoutesResult<
    ParamName extends string,
    Renderable,
    Overrides extends ResourceOverrides<ParamName, Renderable>
> = {
    [A in ResourceAction]: RouteDefinition<
        OverrideMethod<Overrides, A, ResourceMethod<A>>,
        OverridePattern<Overrides, A, ResourcePath<A, ParamName>>,
        OverrideHandler<Overrides, A, ParamName>,
        Renderable,
        undefined
    >;
};

interface ResourceOptions<ParamName extends string, Renderable> {
    param?: ParamName;
}

function resourceMethod(action: ResourceAction): string {
    switch (action) {
        case "index":
        case "show":
        case "new":
        case "edit":
            return "GET";
        case "create":
            return "POST";
        case "update":
            return "PUT";
        case "destroy":
            return "DELETE";
        default:
            return "GET";
    }
}

function buildResourcePattern(action: ResourceAction, paramName: string): string {
    switch (action) {
        case "index":
        case "create":
            return "/";
        case "new":
            return "/new";
        case "show":
        case "update":
        case "destroy":
            return `/:${paramName}`;
        case "edit":
            return `/:${paramName}/edit`;
        default:
            return "/";
    }
}

export function resources<
    ParamName extends string = "id",
    Renderable = unknown,
    Overrides extends ResourceOverrides<ParamName, Renderable> = ResourceOverrides<ParamName, Renderable>
>(
    overrides: Overrides
): ResourceRoutesResult<ParamName, Renderable, Overrides>;
export function resources<
    ParamName extends string = "id",
    Renderable = unknown,
    Overrides extends ResourceOverrides<ParamName, Renderable> = ResourceOverrides<ParamName, Renderable>
>(
    options: ResourceOptions<ParamName, Renderable>,
    overrides: Overrides
): ResourceRoutesResult<ParamName, Renderable, Overrides>;
export function resources<
    ParamName extends string = "id",
    Renderable = unknown,
    Overrides extends ResourceOverrides<ParamName, Renderable> = ResourceOverrides<ParamName, Renderable>
>(
    optionsOrOverrides: ResourceOptions<ParamName, Renderable> | Overrides,
    maybeOverrides?: Overrides
): ResourceRoutesResult<ParamName, Renderable, Overrides> {
    const hasOptions = maybeOverrides !== undefined;
    const options = (hasOptions ? optionsOrOverrides : {}) as ResourceOptions<ParamName, Renderable>;
    const overrides = (hasOptions ? maybeOverrides : optionsOrOverrides ?? {}) as Overrides;
    const paramName = (options.param ?? ("id" as ParamName)) as ParamName;

    const routes = {} as Record<ResourceAction, RouteDefinition<string, string, any, Renderable, undefined>>;

    for (const action of RESOURCE_ACTIONS) {
        const basePattern = buildResourcePattern(action, paramName);
        const baseMethod = resourceMethod(action);
        const override = overrides[action] ?? ({} as ResourceRouteOptions<typeof action, ParamName, Renderable>);
        const pattern = (override.pattern ?? basePattern) as ResourcePath<typeof action, ParamName>;
        const method = (override.method ?? baseMethod) as ResourceMethod<typeof action>;
        const handler = (override.handler ?? undefined) as OverrideHandler<Overrides, typeof action, ParamName>;
        const component = override.component as RouteComponent<
            ResourcePath<typeof action, ParamName>,
            typeof handler,
            Renderable
        > | undefined;

        routes[action] = route<ResourcePath<typeof action, ParamName>, typeof method, Renderable, typeof handler>({
            pattern,
            method,
            handler,
            component,
        }) as RouteDefinition<
            typeof method,
            ResourcePath<typeof action, ParamName>,
            typeof handler,
            Renderable,
            undefined
        >;
    }

    return routes as ResourceRoutesResult<ParamName, Renderable, Overrides>;
}

type ResourceSubsetAction = Exclude<ResourceAction, "index">;

type ResourceSubsetResult<
    ParamName extends string,
    Renderable,
    Overrides extends ResourceOverrides<ParamName, Renderable>
> = Pick<ResourceRoutesResult<ParamName, Renderable, Overrides>, ResourceSubsetAction>;

export function resource<
    ParamName extends string = "id",
    Renderable = unknown,
    Overrides extends ResourceOverrides<ParamName, Renderable> = ResourceOverrides<ParamName, Renderable>
>(
    overrides: Overrides
): ResourceSubsetResult<ParamName, Renderable, Overrides>;
export function resource<
    ParamName extends string = "id",
    Renderable = unknown,
    Overrides extends ResourceOverrides<ParamName, Renderable> = ResourceOverrides<ParamName, Renderable>
>(
    options: ResourceOptions<ParamName, Renderable>,
    overrides: Overrides
): ResourceSubsetResult<ParamName, Renderable, Overrides>;
export function resource<
    ParamName extends string = "id",
    Renderable = unknown,
    Overrides extends ResourceOverrides<ParamName, Renderable> = ResourceOverrides<ParamName, Renderable>
>(
    optionsOrOverrides: ResourceOptions<ParamName, Renderable> | Overrides,
    maybeOverrides?: Overrides
): ResourceSubsetResult<ParamName, Renderable, Overrides> {
    const routes = resources<ParamName, Renderable, Overrides>(
        optionsOrOverrides as any,
        maybeOverrides as any
    );

    const { index: _index, ...rest } = routes;

    return rest as ResourceSubsetResult<ParamName, Renderable, Overrides>;
}

export const routes = root<Remix.RemixNode>({
    handler: async ({ url }) => {
        const query = url.searchParams.get("q");
        return await getContacts(query);
    },
    component: ({ data: contacts, children }) => (
        <>
            <div id="sidebar">
                <h1>Remix Contacts</h1>
                <div>
                    <SearchBar />
                    <form action={routes.contact.create.href()} method="post">
                        <button type="submit">New</button>
                    </form>
                </div>
                <Sidebar contacts={contacts} />
            </div>
            <Details>{children}</Details>
        </>
    ),
    children: {
        index: route({
            pattern: "/",
            method: "GET",
            component: () => (
                <p id="index-page">
                    This is a demo for Remix.
                    <br />
                    Check out{" "}
                    <a href="https://github.com/remix-run/remix">
                        the preview at github.com/remix-run/remix
                    </a>
                    .
                </p>
            ),
        }),
        contact: prefix("/contact", {
            ...resources(
                {
                    param: "contactId",
                },
                {
                    show: {
                        handler: async ({ params }) => {
                            const contact = (await getContact(params.contactId))!;
                            const hasAvatar = !!contact.avatar;
                            return { contact, hasAvatar };
                        },
                        component: ({ data: { contact, hasAvatar } }) => (
                            <div id="contact">
                                {/* ... */}
                                {contact.id}
                                {hasAvatar}
                            </div>
                        ),
                    },
                    edit: {
                        handler: async ({ params }) => {
                            return (await getContact(params.contactId))!;
                        },
                        component: ({ data: contact, params }) => (
                            <RestfulForm
                                action={routes.contact.update.href({ contactId: params.contactId })}
                                id="contact-form"
                                method="put"
                            >
                                {contact.name}
                            </RestfulForm>
                        ),
                    },
                    destroy: {
                        handler: async ({ params }) => {
                            await deleteContact(params.contactId);
                            return redirect("/");
                        },
                    },
                    update: {
                        handler: async ({ params, formData }) => {
                            const contact = await updateContact(params.contactId, {
                                first: formData.get("first") as string,
                                last: formData.get("last") as string,
                                twitter: formData.get("twitter") as string,
                                avatar: formData.get("avatar") as string,
                                notes: formData.get("notes") as string,
                            });

                            return redirect(routes.contact.show.href({ contactId: contact.id }));
                        },
                    },
                    create: {
                        handler: async () => {
                            await createEmptyContact();
                            return redirect("/");
                        },
                    },
                    // Can define any of the Rails resource endpoints here
                }
            ),
            favorite: {
                // Prefer relative patterns so prefix() can compose them cleanly.
                ...route({
                    pattern: "/:contactId/favorite",
                    method: "PUT",
                    handler: async ({ params, formData, url }) => {
                        await updateContact(params.contactId, {
                            favorite: formData.get("favorite") === "true",
                        });

                        // Redirect back to the show page, preserving search params
                        return redirect(
                            routes.contact.show.href({ contactId: params.contactId }) + url.search
                        );
                    },
                }),
            },
        }),
    },
});
