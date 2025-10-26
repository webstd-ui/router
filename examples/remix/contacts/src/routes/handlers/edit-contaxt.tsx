import type { InferRouteHandler } from "@remix-run/fetch-router";
import { render } from "@webstd-ui/router";
import { CancelButton } from "~/components/CancelButton.tsx";
import { RestfulForm } from "~/components/RestfulForm.tsx";
import { CONTACTS_KEY, getContact, getContacts } from "~/lib/contacts.ts";
import { routes } from "~/routes";

export const edit: InferRouteHandler<typeof routes.contact.edit> = async ({
    params,
    storage,
    url,
}) => {
    const query = url.searchParams.get("q");
    const contacts = await getContacts(query);
    storage.set(CONTACTS_KEY, contacts);

    const contact = (await getContact(params.contactId))!;

    return render(
        <RestfulForm
            action={routes.contact.update.href({ contactId: params.contactId })}
            id="contact-form"
            method="PUT"
        >
            <p>
                <span>Name</span>
                <input
                    aria-label="First name"
                    defaultValue={contact.first ?? undefined}
                    name="first"
                    placeholder="First"
                    type="text"
                />
                <input
                    aria-label="Last name"
                    defaultValue={contact.last ?? undefined}
                    name="last"
                    placeholder="Last"
                    type="text"
                />
            </p>
            <label>
                <span>𝕏, The Everything App</span>
                <input
                    defaultValue={contact.twitter ?? undefined}
                    name="twitter"
                    placeholder="@elonmusk"
                    type="text"
                />
            </label>
            <label>
                <span>Avatar URL</span>
                <input
                    aria-label="Avatar URL"
                    defaultValue={contact.avatar ?? undefined}
                    name="avatar"
                    placeholder="https://example.com/avatar.jpg"
                    type="text"
                />
            </label>
            <label>
                <span>Notes</span>
                <textarea name="notes" rows={6} value={contact.notes ?? undefined} />
            </label>
            <p>
                <button type="submit">Save</button>
                <CancelButton />
            </p>
        </RestfulForm>,
    );
};
