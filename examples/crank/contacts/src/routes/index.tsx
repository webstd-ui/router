import type { InferRouteHandler } from "@remix-run/fetch-router";
import { render } from "@webstd-ui/router";
import { CONTACTS_KEY, getContacts } from "~/lib/contacts.ts";
import type { routes } from "~/routes/mod";

export const index: InferRouteHandler<typeof routes.index> = async ({ storage, url }) => {
    const query = url.searchParams.get("q");
    const contacts = await getContacts(query);
    storage.set(CONTACTS_KEY, contacts);

    return render(
        <p id="index-page">
            This is a demo for Crank.
            <br />
            Check out{" "}
            <a href="https://crank.js.org/guides/getting-started" target="_blank">
                the docs at crank.js.org/guides
            </a>
            .
        </p>,
    );
};
