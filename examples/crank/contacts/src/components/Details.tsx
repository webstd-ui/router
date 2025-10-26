import type { Context } from "@b9g/crank";
import { events } from "@remix-run/events";
import { Router } from "@webstd-ui/router";
import { ROUTER } from "../app.tsx";

export function* Details(this: Context) {
    const router = this.consume(ROUTER);
    const cleanup = events(router, [Router.update(() => this.refresh())]);

    for (const _ of this) {
        yield (
            <div
                class={router.navigating.to.state === "loading" ? "loading" : undefined}
                id="detail"
            >
                {router.outlet}
            </div>
        );
    }

    cleanup();
}
