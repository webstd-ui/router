import type { Remix } from "@remix-run/dom";
import { AppStorage, createHelpers } from "@webstd-ui/router";
import { CONTACT, CONTACTS, getContact, getContacts } from "./lib/contacts.ts";

import { Index } from "./routes/index.tsx";
import { ShowContact } from "./routes/show-contact.tsx";
import { EditContact } from "./routes/edit-contaxt.tsx";

const { route, createRouter } = createHelpers<Remix.RemixNode>();

export const storage = new AppStorage();

export const routes = route({
    index: {
        pattern: "/",
        // enter: async (params, url) => {
        //     const query = url.searchParams.get("q") ?? undefined;
        //     const contacts = await getContacts(query);
        //     storage.set(CONTACTS, contacts);
        //     return true;
        // },
        render: () => <Index />,
    },
    contact: {
        show: {
            pattern: "/contact/:contactId",
            // enter: async (params) => {
            //     console.log("DEBUG: enter() called with params:", params);
            //     const contact = await getContact(params.contactId);
            //     console.log("DEBUG: enter() got contact:", contact);
            //     storage.set(CONTACT, contact);
            //     console.log("DEBUG: enter() set contact in storage");
            //     return true;
            // },
            render: () => <ShowContact />,
        },
        edit: {
            pattern: "/contact/:contactId/edit",
            // enter: async (params) => {
            //     const contact = await getContact(params.contactId);
            //     storage.set(CONTACT, contact);
            //     return true;
            // },
            render: () => <EditContact />,
        },
    },
});

export { createRouter };
