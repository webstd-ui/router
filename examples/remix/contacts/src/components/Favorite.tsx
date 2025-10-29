import type { Remix } from "@remix-run/dom";
import { App } from "~/app.tsx";
import { routes } from "~/routes/index.ts";
import { RestfulForm } from "./RestfulForm.tsx";

export function Favorite(this: Remix.Handle, props: { favorite: boolean; id: string }) {
    const router = this.context.get(App);
    let optimistic: boolean | null = null;
    let currentId = props.id;

    return (props: { favorite: boolean; id: string }) => {
        // Reset optimistic state if contact changed
        if (currentId !== props.id) {
            optimistic = null;
            currentId = props.id;
        }

        const favorite = optimistic !== null ? optimistic : props.favorite;

        return (
            <RestfulForm
                action={routes.contact.favorite.href({ contactId: props.id })}
                method="put"
                on={router.enhanceForm(
                    formData => {
                        optimistic = formData ? formData?.get("favorite") === "true" : null;
                        this.update();
                    },
                    { signal: this.signal }
                )}
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
