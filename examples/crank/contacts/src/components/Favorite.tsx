import type { Context } from "@b9g/crank";
import { routes } from "~/routes/mod";
import { RestfulForm } from "./RestfulForm.tsx";

export function* Favorite(
    this: Context<{ favorite: boolean; id: string }>,
    _props: { favorite: boolean; id: string },
) {
    let optimisticFavorite: boolean | null = null;
    let currentContactId = this.props.id;

    for (const props of this) {
        // Reset optimistic state if contact changed
        if (currentContactId !== props.id) {
            optimisticFavorite = null;
            currentContactId = props.id;
        }

        const favorite = optimisticFavorite !== null ? optimisticFavorite : props.favorite;

        yield (
            <RestfulForm
                action={routes.contact.favorite.href({ contactId: props.id })}
                handler={event => {
                    optimisticFavorite = event.detail
                        ? event.detail?.get("favorite") === "true"
                        : null;
                    this.refresh();
                }}
                method="PUT"
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
    }
}
