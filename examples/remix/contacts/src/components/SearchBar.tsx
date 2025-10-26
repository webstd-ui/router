import { connect, type Remix } from "@remix-run/dom";
import { dom, events } from "@remix-run/events";
import { Router } from "@webstd-ui/router";
import { App } from "~/app.tsx";
import { RestfulForm } from "./RestfulForm.tsx";

export function SearchBar(this: Remix.Handle) {
    const router = this.context.get(App);
    events(router, [Router.update(() => this.update(), { signal: this.signal })]);

    let input: HTMLInputElement;
    const query = () =>
        router.url.searchParams.get("q") ? router.url.searchParams.get("q") : undefined;
    let previousQuery = query();

    const handleInput = dom.input<HTMLInputElement>(async event => {
        // Remove empty query params when value is empty
        if (!event.currentTarget.value) {
            router.navigate(router.location.pathname + router.location.hash);
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
    });

    return () => {
        const searching = Boolean(router.navigating.to.url?.searchParams.has("q"));

        return (
            <RestfulForm id="search-form">
                <input
                    aria-label="Search contacts"
                    class={searching ? "loading" : ""}
                    defaultValue={query() ?? ""}
                    id="q"
                    name="q"
                    on={[handleInput, connect(event => (input = event.currentTarget))]}
                    placeholder="Search"
                    type="search"
                />
                <div aria-hidden hidden={!searching} id="search-spinner" />
                <div aria-live="polite" class="sr-only" />
            </RestfulForm>
        );
    };
}
