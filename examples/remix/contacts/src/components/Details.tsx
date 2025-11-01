import type { Remix } from "@remix-run/dom";
import { events } from "@remix-run/events";
import { App } from "~/app.tsx";

export function Details(this: Remix.Handle) {
    const { router } = this.context.get(App);
    events(router, [router.change(() => this.update(), { signal: this.signal })]);

    return () => (
        <div class={router.navigating.to.state === "loading" ? "loading" : undefined} id="detail">
            {router.outlet ? router.outlet : <p class="loading">Loading...</p>}
        </div>
    );
}
