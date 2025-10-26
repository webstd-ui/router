import type { Context } from "@b9g/crank";
import { routes } from "~/routes/mod";
import { RestfulForm } from "./RestfulForm.tsx";

export function* DeleteButton(this: Context<{ id: string }>, _props: { id: string }) {
    for (const { id } of this) {
        yield (
            <RestfulForm
                action={routes.contact.destroy.href({ contactId: id })}
                data-destroy
                method="DELETE"
                onsubmit={(event: Event) => {
                    if (!confirm("Please confirm you want to delete this record.")) {
                        event.preventDefault();
                    }
                }}
            >
                <button type="submit">Delete</button>
            </RestfulForm>
        );
    }
}
