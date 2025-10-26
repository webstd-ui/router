import type { Context } from "@b9g/crank";
import { events } from "@remix-run/events";
import { Router } from "@webstd-ui/router";
import { ROUTER } from "~/app.tsx";
import { CONTACTS_KEY, type ContactRecord } from "~/lib/contacts.ts";
import { routes } from "~/routes/mod";

function* SidebarItem(
    this: Context<{ contact: ContactRecord }>,
    _props: { contact: ContactRecord },
) {
    const router = this.consume(ROUTER);

    for (const { contact } of this) {
        const link = routes.contact.show.href({
            contactId: String(contact.id),
        });
        const className = router.isActive(link)
            ? "active"
            : router.isPending(link)
              ? "pending"
              : "";

        yield (
            <li>
                <a class={className} href={link + router.location.search}>
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
    }
}

export function* Sidebar(this: Context) {
    const router = this.consume(ROUTER);
    const cleanup = events(router, [Router.update(() => this.refresh())]);

    for (const _ of this) {
        const contacts = router.storage.get(CONTACTS_KEY) || [];

        yield (
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

    cleanup();
}
