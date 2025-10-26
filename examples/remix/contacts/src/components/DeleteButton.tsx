import type { Remix } from "@remix-run/dom";
import { dom } from "@remix-run/events";
import { routes } from "~/routes/index.ts";
import { HttpMethod, RestfulForm } from "./RestfulForm.tsx";

export function DeleteButton(this: Remix.Handle) {
    const submit = dom.submit(event => {
        if (!confirm("Please confirm you want to delete this record.")) {
            event.preventDefault();
        }
    });

    return ({ id }: { id: string }) => (
        <RestfulForm
            action={routes.contact.destroy.href({ contactId: id })}
            data-destroy
            method={HttpMethod.Delete}
            on={submit}
        >
            <button type="submit">Delete</button>
        </RestfulForm>
    );
}
