import type { Remix } from "@remix-run/dom";
import { Router } from "@webstd-ui/router";
import { Details } from "./components/Details.tsx";
import { SearchBar } from "./components/SearchBar.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { CONTACTS_KEY, getContacts } from "./lib/contacts.ts";
import { routes } from "./routes";
import { handlers } from "./routes/handlers";

type RemixRouter = Router<Remix.RemixNode>;

export function App(this: Remix.Handle<RemixRouter>) {
    const router: RemixRouter = new Router();
    router.map(routes, handlers);
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
            return <p class="loading">Loading...</p>;
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
