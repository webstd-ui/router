import type { RouteHandlers } from "@remix-run/fetch-router";
import { render } from "@webstd-ui/router";
import { CONTACTS_KEY, getContacts } from "~/lib/contacts.ts";
import type { routes } from "~/routes/index.ts";

import { create, destroy, favorite, update } from "./actions.ts";
import { edit } from "./edit-contaxt.tsx";
import { show } from "./show-contact.tsx";

export const handlers = {
    async index({ storage, url }) {
        const query = url.searchParams.get("q");
        const contacts = await getContacts(query);
        storage.set(CONTACTS_KEY, contacts);

        return render(
            <p id="index-page">
                This is a demo for Remix.
                <br />
                Check out{" "}
                <a href="https://github.com/remix-run/remix">
                    the preview at github.com/remix-run/remix
                </a>
                .
            </p>
        );
    },
    contact: {
        // Pages
        show,
        edit,
        // Actions
        create,
        destroy,
        update,
        favorite,
    },
} satisfies RouteHandlers<typeof routes>;
