import type { Remix } from "@remix-run/dom";
import { App } from "~/app.tsx";
import { type ContactRecord } from "~/lib/contacts.ts";
import { routes } from "~/routes";

export function Sidebar({ contacts }: { contacts: ContactRecord[] }) {
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
                <a href={href} class={router.when(href, { active: "active", pending: "pending" })}>
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
