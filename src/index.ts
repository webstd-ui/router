import {
    AgnosticIndexRouteObject,
    AgnosticNonIndexRouteObject,
    AgnosticRouteMatch,
    LazyRouteFunction,
    Router as RemixRouter,
    Action as NavigationType,
    RouterState as RemixRouterState,
    Location,
    Navigation,
    Path,
    To,
    resolveTo,
    HydrationState,
    createBrowserHistory,
    createMemoryHistory,
    createRouter,
    isRouteErrorResponse,
    AgnosticDataRouteMatch,
} from "@remix-run/router"
import {
    CustomElement,
    EmptyView,
    Environment,
    EnvironmentKey,
    Modifier,
    Property,
    Show,
    State,
    TemplateResult,
    View,
    html,
    modifier,
} from "@webstd-ui/view"
import { EnvironmentConsumer, EnvironmentProvider, getViewContext } from "@webstd-ui/view/internals"
import invariant from "tiny-invariant"
import {
    SubmitTarget,
    createPath,
    createURL,
    enhanceManualRouteObjects,
    getPathContributingMatches,
    submitImpl,
} from "./utils"
import { SubmitOptions } from "./dom"
import { withObservationTracking } from "@webstd-ui/observable"

export { defer, isRouteErrorResponse, json, redirect } from "@remix-run/router"
export type {
    ActionFunction,
    ActionFunctionArgs,
    LoaderFunction,
    LoaderFunctionArgs,
} from "@remix-run/router"

// Create WebStd-specific types from the agnostic types in @remix-run/router to
// export from @webstd-ui/router
export interface IndexRouteObject {
    caseSensitive?: AgnosticIndexRouteObject["caseSensitive"]
    path?: AgnosticIndexRouteObject["path"]
    id?: AgnosticIndexRouteObject["id"]
    loader?: AgnosticIndexRouteObject["loader"]
    action?: AgnosticIndexRouteObject["action"]
    hasErrorBoundary?: AgnosticIndexRouteObject["hasErrorBoundary"]
    shouldRevalidate?: AgnosticIndexRouteObject["shouldRevalidate"]
    handle?: AgnosticIndexRouteObject["handle"]
    index: true
    children?: undefined
    template?: TemplateResult | null
    errorTemplate?: TemplateResult | null
}

export interface NonIndexRouteObject {
    caseSensitive?: AgnosticNonIndexRouteObject["caseSensitive"]
    path?: AgnosticNonIndexRouteObject["path"]
    id?: AgnosticNonIndexRouteObject["id"]
    loader?: AgnosticNonIndexRouteObject["loader"]
    action?: AgnosticNonIndexRouteObject["action"]
    hasErrorBoundary?: AgnosticNonIndexRouteObject["hasErrorBoundary"]
    shouldRevalidate?: AgnosticNonIndexRouteObject["shouldRevalidate"]
    handle?: AgnosticNonIndexRouteObject["handle"]
    index?: false
    children?: RouteObject[]
    template?: TemplateResult | null
    errorTemplate?: TemplateResult | null
    lazy?: LazyRouteFunction<RouteObject>
}

export type RouteObject = IndexRouteObject | NonIndexRouteObject

export type DataRouteObject = RouteObject & {
    children?: DataRouteObject[]
    id: string
}

export interface RouteMatch<
    ParamKey extends string = string,
    RouteObjectType extends RouteObject = RouteObject
> extends AgnosticRouteMatch<ParamKey, RouteObjectType> {}

export interface DataRouteMatch extends RouteMatch<string, DataRouteObject> {}

// Global context holding the singleton router and the current state
export interface RouterEnvironment {
    router: RemixRouter
    // this should be reactive, consider wrapping in a signal/observanle
    state: RemixRouterState
}

// Wrapper context holding the route location in the current hierarchy
export interface RouteEnvironment {
    id: string
    matches: DataRouteMatch[]
    index: boolean
}

// Wrapper context holding the captured render error
export interface RouteErrorEnvironment {
    error: unknown
}

export interface NavigateOptions {
    replace?: boolean
    state?: unknown
}

export interface NavigateFunction {
    (to: To, options?: NavigateOptions): void
    (delta: number): void
}

interface CreateRouterOpts {
    basename?: string
    hydrationData?: HydrationState
}

interface CreateMemoryRouterOpts extends CreateRouterOpts {
    initialEntries?: string[]
    initialIndex?: number
}

interface CreateBrowserRouterOpts extends CreateRouterOpts {
    window?: Window
}

function createRemixMemoryRouter(
    routes: RouteObject[],
    { basename, hydrationData, initialEntries, initialIndex }: CreateMemoryRouterOpts = {}
) {
    return createRouter({
        basename,
        history: createMemoryHistory({
            initialEntries,
            initialIndex,
        }),
        hydrationData,
        routes: enhanceManualRouteObjects(routes),
    }).initialize()
}

function createRemixBrowserRouter(
    routes: RouteObject[],
    { basename, hydrationData, window }: CreateBrowserRouterOpts = {}
) {
    return createRouter({
        basename,
        history: createBrowserHistory({ window }),
        hydrationData,
        routes: enhanceManualRouteObjects(routes),
    }).initialize()
}

const RemixRouterKey = new EnvironmentKey<RouterEnvironment | undefined>({
    key: "env-remix-router",
    defaultValue: undefined,
    createProvider: false,
})

const RemixRouteKey = new EnvironmentKey<RouteEnvironment | undefined>({
    key: "env-remix-route",
    defaultValue: undefined,
    createProvider: false,
})

const RemixRouteErrorKey = new EnvironmentKey<RouteErrorEnvironment | undefined>({
    key: "env-remix-route-error",
    defaultValue: undefined,
    createProvider: false,
})

export class Router {
    #element: HTMLElement
    #view: View

    #routerConsumer: EnvironmentConsumer<RouterEnvironment | undefined>
    #routeConsumer: EnvironmentConsumer<RouteEnvironment | undefined>
    #routeErrorConsumer: EnvironmentConsumer<RouteErrorEnvironment | undefined>

    private get routerEnvironment(): RouterEnvironment {
        invariant(this.#routerConsumer.data !== undefined, "No RouterEnvironment available")
        return this.#routerConsumer.data
    }

    private get routeEnvironment(): RouteEnvironment {
        invariant(this.#routeConsumer.data !== undefined, "No RouteEnvironment available")
        return this.#routeConsumer.data
    }

    private get routeErrorEnvironment(): RouteErrorEnvironment {
        invariant(this.#routeErrorConsumer.data !== undefined, "No RouteErrorEnvironment available")
        return this.#routeErrorConsumer.data
    }

    constructor(view: View, element: HTMLElement) {
        this.#view = view
        this.#element = element

        this.#routerConsumer = new EnvironmentConsumer(RemixRouterKey, element)
        this.#routeConsumer = new EnvironmentConsumer(RemixRouteKey, element)
        this.#routeErrorConsumer = new EnvironmentConsumer(RemixRouteErrorKey, element)
    }

    public get navigationType(): NavigationType {
        return this.routerEnvironment?.state.historyAction
    }

    public get location(): Location {
        return this.routerEnvironment?.state.location
    }

    public get matches(): DataRouteMatch[] {
        return this.routerEnvironment.state.matches.map(match => ({
            id: match.route.id,
            pathname: match.pathname,
            pathnameBase: match.pathnameBase,
            route: match.route,
            params: match.params,
            data: this.routerEnvironment.state.loaderData[match.route.id] as unknown,
            handle: match.route.handle as unknown,
        }))
    }

    public get navigation(): Navigation {
        return this.routerEnvironment.state.navigation
    }

    public loaderData<T = unknown>(): T | undefined {
        let routeId = this.routeEnvironment.id
        return this.routeLoaderData(routeId) as any
    }

    public routeLoaderData<T = unknown>(routeId: string): T | undefined {
        return this.routerEnvironment.state.loaderData[routeId] as any
    }

    public actionData<T = unknown>(): T | undefined {
        let routeId = this.routeEnvironment.id
        return this.routerEnvironment.state.actionData?.[routeId] as any
    }

    public get routeError(): unknown {
        let ctx = this.routerEnvironment
        let routeId = this.routeEnvironment.id
        let errorCtx = this.routeErrorEnvironment

        // If this was a render error, we put it in a RouteError context inside
        // of RenderErrorBoundary.  Otherwise look for errors from our data router
        // state
        return (errorCtx?.error || ctx.router.state.errors?.[routeId]) as unknown
    }

    public resolvedPath = (to: To): Path => {
        let { matches } = this.routeEnvironment

        return resolveTo(
            to,
            getPathContributingMatches(matches).map(match => match.pathnameBase),
            this.location.pathname
        )
    }

    public href = (to: To): string => {
        let { router } = this.routerEnvironment
        let path = this.resolvedPath(to)
        return router.createHref(createURL(router, createPath(path)))
    }

    public navigate: NavigateFunction = (to: To | number, options: NavigateOptions = {}) => {
        let { router } = this.routerEnvironment
        let { matches } = this.routeEnvironment

        if (typeof to === "number") {
            router.navigate(to)
            return
        }

        let path = resolveTo(
            to,
            getPathContributingMatches(matches).map(match => match.pathnameBase),
            this.location.pathname
        )

        router.navigate(path, {
            replace: options?.replace,
            state: options?.state,
        })
    }

    public formAction = (action = "."): string => {
        let { matches } = this.routeEnvironment
        let route = this.routeEnvironment

        let path = resolveTo(
            action,
            getPathContributingMatches(matches).map(match => match.pathnameBase),
            this.location.pathname
        )

        let search = path.search
        if (action === "." && route.index) {
            search = search ? search.replace(/^\?/, "?index&") : "?index"
        }

        return path.pathname + search
    }

    public submit = (
        /**
         * Specifies the `<form>` to be submitted to the server, a specific
         * `<button>` or `<input type="submit">` to use to submit the form, or some
         * arbitrary data to submit.
         *
         * Note: When using a `<button>` its `name` and `value` will also be
         * included in the form data that is submitted.
         */
        target: SubmitTarget,
        /**
         * Options that override the `<form>`'s own attributes. Required when
         * submitting arbitrary data without a backing `<form>`.
         */
        options?: SubmitOptions
    ) => {
        let { router } = this.routerEnvironment
        let defaultAction = this.formAction()
        submitImpl(router, defaultAction, target, options)
    }

    // TODO: fetcher
    // TODO: fetchers

    // private modifiers = {
    //     link: modifier(LinkModifier),
    //     form: modifier(FormModifier),
    // }

    // // FIXME: return type
    // public enhanceLink = (): any => {
    //     return this.modifiers.link(this)
    // }

    // // FIXME: return type
    // public enhanceForm = (options: { replace: boolean } = { replace: false }): any => {
    //     return this.modifiers.form(this as any, options.replace, null, null)
    // }

    // TODO: await
}

export const RouterKey = new EnvironmentKey<Router | undefined>({
    key: "env-router",
    defaultValue: undefined,
    createProvider: false,
})

@CustomElement("env-router")
export class RouterProvider implements View {
    @Property() public routes!: RouteObject[]
    @Property() public fallback?: TemplateResult
    @Property() public hydrationData?: HydrationState

    #router: RemixRouter
    #unsubscribe!: () => void

    @State private state!: RemixRouterState

    #outlet = outletImpl(this, true)

    constructor() {
        // create router based on if we're on the client or server
        if (typeof document !== undefined) {
            this.#router = createRemixBrowserRouter(this.routes)
        } else {
            this.#router = createRemixMemoryRouter(this.routes)
        }

        getViewContext(this).onAppear(event => {
            const provider = new EnvironmentProvider(RemixRouterKey, event.element)

            this.state = this.#router.state
            provider.provide({ router: this.#router, state: this.state })

            this.#unsubscribe = this.#router.subscribe(state => {
                this.state = state
                provider.provide({ router: this.#router, state })
            })
        })
    }

    onDisappear() {
        this.#unsubscribe()
    }

    get body() {
        if (!this.state.initialized) {
            return this.fallback ? this.fallback : html`<span></span>`
        }

        return this.#outlet()
    }
}

@CustomElement("router-error-wrapper")
export class ErrorWrapper implements View {
    @Property() error!: unknown

    constructor() {
        getViewContext(this).onAppear(event => {
            const provider = new EnvironmentProvider(RemixRouteErrorKey, event.element)
            provider.provide({ error: this.error })
        })
    }

    get body() {
        return html`<slot></slot>`
    }
}

@CustomElement("router-error-boundary")
export class ErrorBoundary implements View {
    @Property() template!: TemplateResult
    @Property() error?: unknown

    @State private _error?: unknown

    #handleError = (event: ErrorEvent | PromiseRejectionEvent) => {
        event.stopPropagation()
        this._error = (event as any).error ?? (event as any).reason
    }

    constructor() {
        this._error = this.error
        window.addEventListener("error", this.#handleError)
        window.addEventListener("rejectionhandled", this.#handleError)
        // TODO: more sophistocated error handling
        // Catch errors in each View method called and bubble them as events
    }

    get body() {
        if (this._error) {
            return html`
                <router-error-wrapper .error="${this._error}">
                    ${this.template}
                </router-error-wrapper>
            `
        }

        return html`<slot></slot>`
    }
}

@CustomElement("route-wrapper")
export class RouteWrapper implements View {
    @Property() id!: string
    @Property() index!: boolean

    @Environment(RouterKey) router?: Router

    constructor() {
        getViewContext(this).onAppear(event => {
            const provider = new EnvironmentProvider(RemixRouteKey, event.element)

            withObservationTracking(() => {
                if (this.router) {
                    provider.provide({
                        id: this.id,
                        matches: this.router.matches.slice(
                            0,
                            this.router.matches.findIndex(m => m.route.id === this.id) + 1
                        ),
                        index: this.index === true,
                    })
                }
            })
        })
    }

    get body() {
        return html`<slot></slot>`
    }
}

@CustomElement("router-default-error")
export class DefaultError implements View {
    @Environment(RouterKey) router?: Router

    get error() {
        return this.router?.routeError
    }

    @State message!: string
    @State stack?: string

    onAppear() {
        if (isRouteErrorResponse(this.error)) {
            this.message = `${this.error.status} ${this.error.statusText}`
        } else if (this.error instanceof Error) {
            this.message = this.error.message
            this.stack = this.error.stack
        } else {
            this.message = JSON.stringify(this.error)
        }
    }

    lightgrey = "rgba(200, 200, 200, 0.5)"
    preStyles = `padding: 0.5rem; background-color: ${this.lightgrey}`
    codeStyles = `padding: 2px 4px; background-color: ${this.lightgrey}`

    get body() {
        return html`
            <h2>Unhandled Thrown Error!</h2>
            <h3 style="font-style: italic">${this.message}</h3>
            ${Show(
                { when: !!this.stack },
                () => html`<pre style="${this.preStyles}">${this.stack}</pre>`
            )}
            <p>💿 Hey developer 👋</p>
            <p>
                You can provide a way better UX than this when your app throws errors by providing
                your own <code style="${this.codeStyles}">errorElement</code> props on your routes.
            </p>
        `
    }
}

function outletImpl(view: View, root: boolean = false) {
    let matchToRender: () => DataRouteMatch | undefined
    let error: () => any
    let errorTemplate: () => TemplateResult | null | undefined
    let child: () => TemplateResult | null | undefined

    getViewContext(view).onAppear(event => {
        const routerConsumer = new EnvironmentConsumer(RemixRouterKey, event.element)
        const routeConsumer = new EnvironmentConsumer(RemixRouteKey, event.element)

        let routerContext = () => routerConsumer.data
        let matches = () => routerContext()?.state.matches

        let state = () => routerContext()?.state
        let routeContext = () => (root ? null : routeConsumer.data)
        let idx = () => {
            let i = matches()?.findIndex(m => m.route.id === routeContext()?.id)
            if (i && i < 0 && !root) {
                throw new Error(
                    `Unable to find <Outlet> match for route id: ${routeContext()?.id || "_root_"}`
                )
            }
            return i
        }
        matchToRender = () => (!!idx() ? matches()?.[idx()! + 1] : undefined)
        error = () => {
            // Grab the error if we've reached the correct boundary.  Type must remain
            // unknown since user's can throw anything from a loader/action.

            return matchToRender() && state()?.errors?.[matchToRender()!.route.id] != null
                ? Object.values(state()?.errors!)[0]
                : null
        }

        child = () => matchToRender()?.route.template
        errorTemplate = () => matchToRender()?.route.errorTemplate
    })

    return () => {
        let match = matchToRender()

        if (match) {
            return html`
                <route-wrapper .id=${match.route.id} .index=${match.route.index === true}>
                    ${Show(
                        {
                            when: root || error() || match.route.errorTemplate,
                            fallback: () => html`${child()}`,
                        },
                        () => html`
                            <router-error-boundary
                                .error="${error()}"
                                .template="${errorTemplate()}"
                            >
                                ${child()}
                            </router-error-boundary>
                        `
                    )}
                </route-wrapper>
            `
        }

        return EmptyView() as any as TemplateResult
    }
}

@CustomElement("router-outlet")
export class Outlet implements View {
    #outlet = outletImpl(this)

    get body() {
        return this.#outlet()
    }
}

// TODO: LinkModifier
// TODO: FormModifier
// TODO: AwaitModifier?
