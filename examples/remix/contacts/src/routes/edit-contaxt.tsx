import type { Remix } from "@remix-run/dom";
import { dom } from "@remix-run/events";
import { App } from "~/app.tsx";
import { RestfulForm } from "~/components/RestfulForm.tsx";
import { CONTACT } from "~/lib/contacts.ts";
import { api } from "~/api";

export function EditContact(this: Remix.Handle) {
    const { storage } = this.context.get(App);

    return () => {
        const contact = storage.get(CONTACT)!;

        return (
            <RestfulForm
                action={api.contact.update.href({ contactId: contact.id })}
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
                    <button on={dom.click(() => history.back())} type="button">
                        Cancel
                    </button>
                </p>
            </RestfulForm>
        );
    };
}
