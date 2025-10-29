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

function SidebarItem(this: Remix.Handle, props: { contact: ContactRecord }) {
    const router = this.context.get(App);

    return () => {
        const href =
            routes.contact.show.href({
                contactId: String(props.contact.id),
            }) + router.location.search;

        return (
            <li>
                <a
                    href={href}
                    on={router.navLink({ activeClass: "active", pendingClass: "pending" })}
                >
                    {props.contact.first || props.contact.last ? (
                        <>
                            {props.contact.first} {props.contact.last}
                        </>
                    ) : (
                        <i>No Name</i>
                    )}
                    {props.contact.favorite && <span>★</span>}
                </a>
            </li>
        );
    };
}
