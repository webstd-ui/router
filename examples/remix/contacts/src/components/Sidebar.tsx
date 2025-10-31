import type { Remix } from "@remix-run/dom";
import { events } from "@remix-run/events";
import { Router } from "@webstd-ui/router";
import { App } from "~/app.tsx";
import { CONTACTS_KEY, type ContactRecord } from "~/lib/contacts.ts";
import { routes } from "~/routes";

export function Sidebar(this: Remix.Handle) {
    const router = this.context.get(App);
    events(router, [Router.update(() => this.update(), { signal: this.signal })]);

    return () => {
        const contacts = router.storage.get(CONTACTS_KEY) || [];

        return (
            <nav>
                {contacts.length ? (
                    <ul>
                        {contacts
                            // .toSorted((a, b) => a.first?.localeCompare(b.first ?? "") ?? -1)
                            .map(contact => (
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
    const router = this.context.get(App);

    return ({ contact }: { contact: ContactRecord }) => {
        const link =
            routes.contact.show.href({
                contactId: String(contact.id),
            }) + router.location.search;

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
