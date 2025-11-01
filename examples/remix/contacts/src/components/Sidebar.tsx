import type { Remix } from "@remix-run/dom";
import { events } from "@remix-run/events";
import { App } from "~/app.tsx";
import { CONTACTS, type ContactRecord } from "~/lib/contacts.ts";
import { AppStorage } from "@webstd-ui/router";
import { routes } from "~/routes.tsx";

export function Sidebar(this: Remix.Handle) {
    const { router, storage } = this.context.get(App);
    events(router, [router.change(() => this.update(), { signal: this.signal })]);

    return () => {
        const contacts = storage.get(CONTACTS) || [];

        return (
            <nav>
                {contacts.length ? (
                    <ul>
                        {contacts.map(contact => (
                            <SidebarItem contact={contact} key={contact.id} />
                        ))}
                    </ul>
                ) : (
                    <p>
                        <i>No contacts</i>
                    </p>
                )}
            </nav>
        );
    };
}

function SidebarItem(this: Remix.Handle) {
    const { router } = this.context.get(App);

    return ({ contact }: { contact: ContactRecord }) => {
        const link =
            routes.contact.show.href({
                contactId: String(contact.id),
            }) + router.url.search;

        return (
            <li>
                <a href={link} class={router.when(link, { active: "active", pending: "pending" })}>
                    {contact.first || contact.last ? (
                        <>
                            {contact.first} {contact.last}
                        </>
                    ) : (
                        <i>No Name</i>
                    )}
                    {contact.favorite && <span>★</span>}
                </a>
            </li>
        );
    };
}
