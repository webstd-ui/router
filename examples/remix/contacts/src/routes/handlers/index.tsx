import type { Remix } from "@remix-run/dom";
import { routes } from "~/routes/index.ts";

import { create, destroy, favorite, update } from "./actions.ts";
import { edit } from "./edit-contaxt.tsx";
import { show } from "./show-contact.tsx";
import { Details } from "~/components/Details.tsx";
import { SearchBar } from "~/components/SearchBar.tsx";
import { Sidebar } from "~/components/Sidebar.tsx";
import { getContacts } from "~/lib/contacts.ts";
import type {
    AppStorage,
    Middleware,
    RequestMethod,
    RouteHandler as FetchRouteHandler,
    Route,
    RouteMap,
    RequestContext,
} from "@remix-run/fetch-router";
import type { Params } from "@remix-run/route-pattern";

type RouteComponent<T extends string, Renderable, LoaderReturn> = (props: {
    children: Renderable | null;
    data: LoaderReturn;
    params: Params<T>;
    request: Request;
    url: URL;
    storage: AppStorage;
}) => Renderable;

type ComponentRouteHandler<
    Method extends RequestMethod | "ANY",
    Path extends string,
    Renderable,
    Return = any
> = (
    | { loader?: undefined; component: RouteComponent<Path, Renderable, Return> }
    | {
          loader: (context: RequestContext<Method, Params<Path>>) => Return | Promise<Return>;
          component?: undefined;
      }
    | {
          loader: (context: RequestContext<Method, Params<Path>>) => Return | Promise<Return>;
          component: RouteComponent<Path, Renderable, Return>;
      }
) & {
    use?: Middleware<Method, Params<Path>>[];
    children?: RouteHandler<Method, Path, Renderable>[];
};

type RouteHandler<
    Method extends RequestMethod | "ANY",
    T extends string,
    Renderable
> = Method extends "GET"
    ? ComponentRouteHandler<Method, Params<T>, Renderable>
    : FetchRouteHandler<Method, Params<T>>;

export type InferRouteHandler<T extends Route | string, Renderable> = T extends Route<
    infer M,
    infer P
>
    ? RouteHandler<M, P, Renderable>
    : T extends string
    ? RouteHandler<"ANY", T, Renderable>
    : never;

export type RouteHandlersWithMiddleware<T extends RouteMap, Renderable> = {
    use: Middleware[];
    handlers: RouteHandlers<T, Renderable>;
};

export type RouteHandlers<T extends RouteMap, Renderable> =
    | RouteHandlersWithMiddleware<T, Renderable>
    | {
          [K in keyof T]: T[K] extends Route<infer M, infer P>
              ? RouteHandler<M, P, Renderable>
              : T[K] extends RouteMap
              ? RouteHandlers<T[K], Renderable>
              : never;
      };

export type RootRouteHandler<Map extends RouteMap, Renderable> =
    | {
          root: Omit<ComponentRouteHandler<"ANY", "/", Renderable>, "children"> & {
              children: {
                  [Key in keyof Map]: Map[Key] extends Route<infer M, infer P>
                      ? RouteHandler<M, P, Renderable>
                      : Map[Key] extends RouteMap
                      ? RouteHandlers<Map[Key], Renderable>
                      : never;
              };
          };
      }
    | RouteHandler<any, any, Renderable>[];

export const handlers: RootRouteHandler<typeof routes, Remix.RemixNode> = {
    root: {
        async loader({ url }) {
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
            index: {
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
            },
            contact: {
                // Pages
                show,
                edit,
                // Actions
                create,
                destroy,
                update,
                favorite,
            },
        },
    },
};
