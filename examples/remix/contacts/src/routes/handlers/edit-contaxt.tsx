import type { Remix } from "@remix-run/dom";
import { CancelButton } from "~/components/CancelButton.tsx";
import { RestfulForm } from "~/components/RestfulForm.tsx";
import { getContact } from "~/lib/contacts.ts";
import { routes } from "~/routes";
import type { InferRouteHandler } from "./index.tsx";

export const edit = {
    async loader({ params }) {
        const contact = (await getContact(params.contactId))!;
        return contact;
    },
    component: ({ data: contact, params }) => (
        <RestfulForm
            action={routes.contact.update.href({ contactId: params.contactId })}
            id="contact-form"
            method="put"
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
        </RestfulForm>
    ),
} satisfies InferRouteHandler<typeof routes.contact.edit, Remix.RemixNode>;
