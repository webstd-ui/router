import type { Remix } from "@remix-run/dom";
import { Router } from "@webstd-ui/router";
import { routes } from "./routes";
import { events } from "@remix-run/events";
import { handlers } from "./routes/handlers";

type RemixRouter = Router<Remix.RemixNode>;

export function App(this: Remix.Handle<RemixRouter>) {
    const router: RemixRouter = new Router();
    router.map(routes, handlers);

    events(router, [Router.change(() => this.update(), { signal: this.signal })]);
    this.context.set(router);

    return () => {
        if (!router.outlet) {
            return <p class="loading">Loading...</p>;
        }

        return router.outlet;
    };
}
