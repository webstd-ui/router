import type { Remix } from "@remix-run/dom";
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

export function App(this: Remix.Handle<Router<Remix.RemixNode>>) {
    const router = new Router<Remix.RemixNode>();

    // Pages
    router.map(routes.index, index);
    router.map(routes.contact.show, show);
    router.map(routes.contact.edit, edit);

    // Actions
    router.map(routes.contact.update, update);
    router.map(routes.contact.create, create);
    router.map(routes.contact.destroy, destroy);
    router.map(routes.contact.favorite, favorite);

    this.context.set(router);

    let isLoading = true;

    this.queueTask(async () => {
        // Load initial data into storage
        const contacts = await getContacts();
        router.storage.set(CONTACTS_KEY, contacts);

        isLoading = false;
        this.update();
    });

    return () => {
        if (isLoading) {
            return <p>Loading...</p>;
        }

        return (
            <>
                <div id="sidebar">
                    <h1>Remix Contacts</h1>
                    <div>
                        <SearchBar />
                        <form action={routes.contact.create.href()} method="post">
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
