import type { Remix } from "@remix-run/dom";
import { events } from "@remix-run/events";
import { Router } from "@webstd-ui/router";
import { Details } from "./components/Details.tsx";
import { HttpMethod, RestfulForm } from "./components/RestfulForm.tsx";
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

    events(router, [
        Router.update(() =>
            console.log(
                `[ROUTER-UPDATE]: ${JSON.stringify({ currentPathname: router.url.pathname })}`,
            ),
        ),
    ]);

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
                        <RestfulForm action={routes.contact.create.href()} method={HttpMethod.Post}>
                            <button type="submit">New</button>
                        </RestfulForm>
                    </div>
                    <Sidebar />
                </div>
                <Details />
            </>
        );
    };
}
