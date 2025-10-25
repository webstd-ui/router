import type { Remix } from "@remix-run/dom";
import { dom } from "@remix-run/events";

export function CancelButton(this: Remix.Handle) {
    const goBack = dom.click(() => history.back());

    return () => (
        <button on={goBack} type="button">
            Cancel
        </button>
    );
}
