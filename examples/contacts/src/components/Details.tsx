import type { Remix } from "@remix-run/dom";
import { events } from "@remix-run/events";
import { Router } from "@webstd-ui/router";
import { App } from "../app.tsx";

export function Details(this: Remix.Handle) {
    const router = this.context.get(App);
    events(router, [Router.update(() => this.update(), { signal: this.signal })]);

    return () => (
        <div class={router.navigating.to.state === "loading" ? "loading" : ""} id="detail">
            {router.outlet}
        </div>
    );
}
