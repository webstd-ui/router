import type { Remix } from "@remix-run/dom";
import { AppStorage, createHelpers } from "@webstd-ui/router";
import type { Router } from "@webstd-ui/router";
import { Details } from "./components/Details.tsx";
import { SearchBar } from "./components/SearchBar.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { CONTACTS, getContacts } from "./lib/contacts.ts";
import { api } from "./api.ts";
import { createRouter, routes, storage } from "./routes.tsx";

interface AppContext {
    router: Router<Remix.RemixNode, typeof routes>;
    storage: AppStorage;
}

export function App(this: Remix.Handle<AppContext>) {
    const router = createRouter(routes, { signal: this.signal });
    this.context.set({ router, storage });

    let isLoading = true;

    this.queueTask(async () => {
        // Load initial data into storage
        const contacts = await getContacts();
        storage.set(CONTACTS, contacts);

        isLoading = false;
        this.update();
    });

    return () => {
        if (isLoading) {
            return <p class="loading">Loading...</p>;
        }

        return (
            <>
                <div id="sidebar">
                    <h1>Remix Contacts</h1>
                    <div>
                        <SearchBar />
                        <form action={api.contact.create.href()} method="post">
                            <button type="submit">New</button>
                        </form>
                    </div>
                    <Sidebar />
                </div>
                <Details />
            </>
        );
    };
}
