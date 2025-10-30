import type { Remix } from "@remix-run/dom";
import { App } from "~/app.tsx";

export function Details(this: Remix.Handle, { children }: { children: Remix.RemixNode }) {
    const router = this.context.get(App);

    return () => (
        <div class={router.navigating.to.state === "loading" ? "loading" : undefined} id="detail">
            {children}
        </div>
    );
}
