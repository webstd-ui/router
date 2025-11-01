import type { Remix } from "@remix-run/dom";
import { dom, events } from "@remix-run/events";
import { App } from "~/app.tsx";
import { createSearchState } from "@webstd-ui/router";
import { CONTACTS, getContacts } from "~/lib/contacts.ts";

export function SearchBar(this: Remix.Handle) {
    const { router, storage } = this.context.get(App);

    let q: string | undefined;
    let searching = false;
    let controller = new AbortController();

    const query = createSearchState(router, "q");
    // events(query, [
    //     query.change(
    //         ({ value }) => {
    //             console.log("[VALUE]:", value);
    //             controller.abort();
    //             const c = new AbortController();
    //             controller = c;

    //             q = value;
    //             searching = true;
    //             this.update();

    //             setTimeout(() => {
    //                 if (c.signal.aborted) return;
    //                 searching = false;
    //                 this.update();
    //             }, 2000);

    //             // getContacts(q).then(contacts => {
    //             //     if (c.signal.aborted) return;
    //             //     storage.set(CONTACTS, contacts);

    //             //     searching = false;
    //             //     this.update();
    //             // });
    //         },
    //         { signal: this.signal }
    //     ),
    // ]);

    return () => (
        <form id="search-form">
            <input
                aria-label="Search contacts"
                class={searching ? "loading" : undefined}
                defaultValue={q ?? ""}
                id="q"
                name="q"
                on={dom.input(async event => {
                    console.log("[SearchBar input] Setting query.value to:", event.currentTarget.value);
                    query.value = event.currentTarget.value;
                    console.log("[SearchBar input] query.value set");
                })}
                placeholder="Search"
                type="search"
            />
            <div aria-hidden hidden={!searching} id="search-spinner" />
            <div aria-live="polite" class="sr-only" />
        </form>
    );
}
