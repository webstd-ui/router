import type { Remix } from "@remix-run/dom";
import { RestfulForm } from "./RestfulForm.tsx";
import { api } from "~/api.ts";
import { dom } from "@remix-run/events";
import { App } from "~/app.tsx";
import { CONTACTS, getContacts } from "~/lib/contacts.ts";

export function Favorite(this: Remix.Handle, initialProps: { favorite: boolean; id: string }) {
    const { router, storage } = this.context.get(App);

    let optimistic: boolean | null = null;
    let currentId = initialProps.id;

    return (props: { favorite: boolean; id: string }) => {
        // Reset optimistic state if contact changed
        if (currentId !== props.id) {
            optimistic = null;
            currentId = props.id;
        }

        const favorite = optimistic !== null ? optimistic : props.favorite;

        return (
            <RestfulForm
                action={api.contact.favorite.href({ contactId: props.id })}
                method="put"
                on={dom.submit(async event => {
                    const formData = new FormData(event.currentTarget);
                    optimistic = formData.get("favorite") === "true";
                    this.update();

                    if (this.signal.aborted) return;
                    const res = await fetch(event.currentTarget.action, {
                        method: "post",
                        headers: { "content-type": "multipart/form-data" },
                        body: formData,
                    });

                    if (this.signal.aborted || !res.ok) return;

                    optimistic = null;
                    const newContacts = await getContacts(router.url.searchParams.get("q"));
                    storage.set(CONTACTS, newContacts);

                    this.update();
                })}
            >
                <button
                    aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
                    name="favorite"
                    type="submit"
                    value={favorite ? "false" : "true"}
                >
                    {favorite ? "★" : "☆"}
                </button>
            </RestfulForm>
        );
    };
}
