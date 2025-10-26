import type { Context } from "@b9g/crank";
import { events } from "@remix-run/events";
import { Router } from "@webstd-ui/router";
import { ROUTER } from "~/app.tsx";

export function* SearchBar(this: Context) {
    const router = this.consume(ROUTER);
    const cleanup = events(router, [Router.update(() => this.refresh())]);

    let input: HTMLInputElement | undefined;
    const query = () =>
        router.url.searchParams.get("q") ? router.url.searchParams.get("q") : undefined;
    let previousQuery = query();

    const handleInput = (event: Event & { currentTarget: HTMLInputElement }) => {
        // Remove empty query params when value is empty
        if (!event.currentTarget.value) {
            router.navigate(router.url.pathname + router.url.hash);
            return;
        }

        const isFirstSearch = previousQuery === undefined;

        // Simulate <form method="GET"> programatically
        // Adds <input name value>s as search params to URL
        // Also performs a client-side navigation
        router.submit(event.currentTarget.form, {
            replace: !isFirstSearch,
        });

        // Update previousQuery immediately so next input sees the current value
        if (event.currentTarget.value !== previousQuery) {
            previousQuery = event.currentTarget.value;
        }
    };

    for (const _ of this) {
        const searching = Boolean(router.navigating.to.url?.searchParams.has("q"));

        yield (
            <form id="search-form">
                <input
                    aria-label="Search contacts"
                    class={searching ? "loading" : ""}
                    defaultValue={query() ?? ""}
                    id="q"
                    name="q"
                    oninput={handleInput}
                    placeholder="Search"
                    ref={(e: HTMLInputElement) => (input = e)}
                    type="search"
                />
                <div aria-hidden hidden={!searching} id="search-spinner" />
                <div aria-live="polite" class="sr-only" />
            </form>
        );
    }

    cleanup();
}
