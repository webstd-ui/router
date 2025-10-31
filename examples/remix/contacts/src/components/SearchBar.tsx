import type { Remix } from "@remix-run/dom";
import { dom, events } from "@remix-run/events";
import { Router } from "@webstd-ui/router";
import { App } from "~/app.tsx";
import { RestfulForm } from "./RestfulForm.tsx";

export function SearchBar(this: Remix.Handle) {
    const router = this.context.get(App);
    events(router, [Router.update(() => this.update(), { signal: this.signal })]);

    let query: string | undefined;

    return () => {
        const searching = router.navigating.to.url?.searchParams.has("q");
        const currentQuery = router.url.searchParams.get("q") ?? undefined;

        if (query !== currentQuery) {
            query = currentQuery;
        }

        return (
            <RestfulForm id="search-form">
                <input
                    aria-label="Search contacts"
                    class={searching ? "loading" : undefined}
                    defaultValue={query ?? ""}
                    id="q"
                    name="q"
                    on={dom.input(async event => {
                        // Remove empty query params when value is empty
                        if (!event.currentTarget.value) {
                            router.navigate(router.location.pathname + router.location.hash);
                            return;
                        }

                        const isFirstSearch = query === undefined;

                        // Simulate <form method="GET"> programatically
                        // Adds <input name value>s as search params to URL
                        // Also performs a client-side navigation
                        router.submit(event.currentTarget.form, {
                            replace: !isFirstSearch,
                        });

                        // Update previousQuery immediately so next input sees the current value
                        if (event.currentTarget.value !== query) {
                            query = event.currentTarget.value;
                        }
                    })}
                    placeholder="Search"
                    type="search"
                />
                <div aria-hidden hidden={!searching} id="search-spinner" />
                <div aria-live="polite" class="sr-only" />
            </RestfulForm>
        );
    };
}
