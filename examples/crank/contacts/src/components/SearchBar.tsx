import type { Context } from "@b9g/crank";
import { events } from "@remix-run/events";
import { Router } from "@webstd-ui/router";
import { ROUTER } from "~/app.tsx";
import { RestfulForm } from "./RestfulForm.tsx";

export function* SearchBar(this: Context<{ query?: string }>, _props: { query?: string }) {
    const router = this.consume(ROUTER);
    const cleanup = events(router, [Router.update(() => this.refresh())]);

    let previousQuery = this.props.query;
    let input: HTMLInputElement | undefined;

    const handleInput = (event: Event & { currentTarget: HTMLInputElement }) => {
        // Remove empty query params when value is empty
        if (!event.currentTarget.value) {
            router.navigate(router.location.pathname + router.location.hash);
            return;
        }

        const isFirstSearch = this.props.query === undefined;
        // Simulate <form method="GET"> programatically
        // Adds <input name value>s as search params to URL
        // Also performs a client-side navigation
        router.submit(event.currentTarget.form, {
            replace: !isFirstSearch,
        });
    };

    for (const { query } of this) {
        if (query !== previousQuery) {
            previousQuery = query;
            if (input) input.value = query ?? "";
        }

        const searching = Boolean(router.navigating.to.url?.searchParams.has("q"));

        yield (
            <form id="search-form">
                <input
                    aria-label="Search contacts"
                    class={searching ? "loading" : ""}
                    defaultValue={query ?? ""}
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
