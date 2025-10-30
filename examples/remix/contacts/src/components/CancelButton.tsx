import type { Remix } from "@remix-run/dom";
import { dom } from "@remix-run/events";
import { App } from "~/app.tsx";

export function CancelButton(this: Remix.Handle) {
    const router = this.context.get(App);
    const goBack = dom.click(() => router.navigate(-1));

    return () => (
        <button on={goBack} type="button">
            Cancel
        </button>
    );
}
