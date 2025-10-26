import type { Context, Element } from "@b9g/crank";
import { Router } from "@webstd-ui/router";
import { Details } from "./components/Details.tsx";
import { SearchBar } from "./components/SearchBar.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { CONTACTS_KEY, getContacts } from "./lib/contacts.ts";
import { create, destroy, favorite, update } from "./routes/actions.ts";
import { edit } from "./routes/edit-contaxt.tsx";
import { index } from "./routes/index.tsx";
import { routes } from "./routes/mod.ts";
import { show } from "./routes/show-contact.tsx";

export const ROUTER = Symbol.for("router-ctx");

declare global {
    namespace Crank {
        interface ProvisionMap {
            [ROUTER]: Router<Element>;
        }
    }
}

export function* App(this: Context) {
    const router = new Router<Element>();

    // Pages
    router.map(routes.index, index);
    router.map(routes.contact.show, show);
    router.map(routes.contact.edit, edit);

    // Actions
    router.map(routes.contact.update, update);
    router.map(routes.contact.create, create);
    router.map(routes.contact.destroy, destroy);
    router.map(routes.contact.favorite, favorite);

    this.provide(ROUTER, router);

    let isLoading = true;

    this.after(async () => {
        // Load initial data into storage
        const contacts = await getContacts();
        router.storage.set(CONTACTS_KEY, contacts);

        isLoading = false;
        this.refresh();
    });

    for (const _ of this) {
        yield isLoading ? (
            <p>Loading...</p>
        ) : (
            <>
                <div id="sidebar">
                    <h1>Crank Contacts</h1>
                    <div>
                        <SearchBar />
                        <form action={routes.contact.create.href()} method="POST">
                            <button type="submit">New</button>
                        </form>
                    </div>
                    <Sidebar />
                </div>
                <Details />
            </>
        );
    }
}
