import type { RequestMethod } from "@remix-run/fetch-router";
import type { Location as RemixLocation } from "@remix-run/router";

type RouterLocation = RemixLocation | Location;

/** Uppercase HTTP methods accepted by the client router's navigation APIs. */
export type FormMethod = RequestMethod;
/** Lowercase variants allowed on HTML attributes that mirror {@link FormMethod}. */
export type LowerCaseFormMethod = Lowercase<FormMethod>;
/**
 * Users can specify either lowercase or uppercase form methods
 */
export type HTMLFormMethod = LowerCaseFormMethod | FormMethod;
/** Encoding types the router can submit when handling form submissions. */
export type FormEncType =
    | "application/x-www-form-urlencoded"
    | "multipart/form-data"
    | "application/json"
    | "text/plain";
/** JSON object shape compatible with browser structured cloning. */
export type JsonObject = {
    [Key in string]: JsonValue;
} & {
    [Key in string]?: JsonValue | undefined;
};
/** JSON array shape compatible with browser structured cloning. */
export type JsonArray = JsonValue[] | readonly JsonValue[];
/** Primitive values permitted inside JSON payloads. */
export type JsonPrimitive = string | number | boolean | null;
/** Any JSON-compatible value accepted by the router submit helpers. */
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/** Discriminated union describing the payload of a form or data submission. */
export type Submission =
    | {
          formMethod: FormMethod;
          formAction: string;
          formEncType: FormEncType;
          formData: FormData;
          json: undefined;
          text: undefined;
      }
    | {
          formMethod: FormMethod;
          formAction: string;
          formEncType: FormEncType;
          formData: undefined;
          json: JsonValue;
          text: undefined;
      }
    | {
          formMethod: FormMethod;
          formAction: string;
          formEncType: FormEncType;
          formData: undefined;
          json: undefined;
          text: string;
      };

/** Fine-grained navigation states the router can report. */
export type NavigationStates = {
    Idle: {
        state: "idle";
        location: undefined;
        url: undefined;
        formMethod: undefined;
        formAction: undefined;
        formEncType: undefined;
        formData: undefined;
        json: undefined;
        text: undefined;
    };
    Loading: {
        state: "loading";
        location: RouterLocation;
        url: URL;
        formMethod: Submission["formMethod"] | undefined;
        formAction: Submission["formAction"] | undefined;
        formEncType: Submission["formEncType"] | undefined;
        formData: Submission["formData"] | undefined;
        json: Submission["json"] | undefined;
        text: Submission["text"] | undefined;
    };
    Submitting: {
        state: "submitting";
        location: RouterLocation;
        url: URL;
        formMethod: Submission["formMethod"];
        formAction: Submission["formAction"];
        formEncType: Submission["formEncType"];
        formData: Submission["formData"];
        json: Submission["json"];
        text: Submission["text"];
    };
};
/** Union of all navigation states exposed via {@link Navigating}. */
export type Navigation = NavigationStates[keyof NavigationStates];

/** Strategy used when resolving relative navigation or submission targets. */
export type RelativeRoutingType = "route" | "path";
/** Options accepted by {@link import("./router.ts").Router.navigate | Router.navigate}. */
export interface NavigateOptions {
    /** Replace the current entry in the history stack instead of pushing a new one */
    replace?: boolean;
    /** Prevent the scroll position from being reset to the top of the window when navigating */
    preventScrollReset?: boolean;
    /** Defines the relative path behavior for the link. "route" will use the route hierarchy so ".." will remove all URL segments of the current route pattern while "path" will use the URL path so ".." will remove one URL segment. */
    relative?: RelativeRoutingType;
    /** Wraps the initial state update for this navigation in a {@link https://react.dev/reference/react-dom/flushSync ReactDOM.flushSync} call instead of the default {@link https://react.dev/reference/react/startTransition React.startTransition} */
    flushSync?: boolean;
    /** Enables a {@link https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API View Transition} for this navigation by wrapping the final state update in `document.startViewTransition()`. If you need to apply specific styles for this view transition, you will also need to leverage the {@link https://api.reactrouter.com/v7/functions/react_router.useViewTransitionState.html useViewTransitionState()} hook.  */
    viewTransition?: boolean;
    /** AbortSignal to cancel this navigation if needed */
    signal?: AbortSignal;
}

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
/** Accepted destination values for {@link import("./router.ts").Router.navigate | Router.navigate}. */
export type To = number | string | URL | Partial<Path>;

/** All values that {@link import("./router.ts").Router.submit | Router.submit} accepts as a submission source. */
export type SubmitTarget =
    | HTMLFormElement
    | HTMLButtonElement
    | HTMLInputElement
    | FormData
    | URLSearchParams
    | JsonValue
    | null;
/** Options for configuring {@link import("./router.ts").Router.submit | Router.submit}. */
export interface SubmitOptions {
    /**
     * The HTTP method used to submit the form. Overrides `<form method>`.
     * Defaults to "GET".
     */
    method?: HTMLFormMethod;
    /**
     * The action URL path used to submit the form. Overrides `<form action>`.
     * Defaults to the path of the current route.
     */
    action?: string;
    /**
     * The encoding used to submit the form. Overrides `<form encType>`.
     * Defaults to "application/x-www-form-urlencoded".
     */
    encType?: FormEncType;
    /**
     * Determines whether the form action is relative to the route hierarchy or
     * the pathname.  Use this if you want to opt out of navigating the route
     * hierarchy and want to instead route based on /-delimited URL segments
     */
    relative?: RelativeRoutingType;
    /**
     * In browser-based environments, prevent resetting scroll after this
     * navigation when using the <ScrollRestoration> component
     */
    preventScrollReset?: boolean;
    /**
     * Enable flushSync for this submission's state updates
     */
    flushSync?: boolean;
    /**
     * Set `true` to replace the current entry in the browser's history stack
     * instead of creating a new one (i.e. stay on "the same page"). Defaults
     * to `false`.
     */
    replace?: boolean;
    /**
     * navigate=false will use a fetcher instead of a navigation
     */
    navigate?: boolean;
    /**
     * Enable view transitions on this submission navigation
     */
    viewTransition?: boolean;
    /** AbortSignal to cancel this submission if needed */
    signal?: AbortSignal;
}

/** Pair of navigation states describing where the router is coming from and going to. */
export type Navigating = {
    to: Navigation;
    from: Navigation;
};
