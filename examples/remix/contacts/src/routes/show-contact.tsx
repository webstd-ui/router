import type { Remix } from "@remix-run/dom";
import { dom, events } from "@remix-run/events";
import { App } from "~/app.tsx";
import { Favorite } from "~/components/Favorite.tsx";
import { RestfulForm } from "~/components/RestfulForm.tsx";
import { CONTACT } from "~/lib/contacts.ts";
import { routes } from "~/routes.tsx";
import { api } from "~/api";
import { AppStorage } from "@webstd-ui/router";

export function ShowContact(this: Remix.Handle) {
    const { storage } = this.context.get(App);

    return () => {
        const contact = storage.get(CONTACT);
        if (!contact) {
            return <div>Loading contact...</div>;
        }
        const hasAvatar = !!contact.avatar;

        return (
            <div id="contact">
                <div>
                    <img
                        alt=""
                        key={contact.id}
                        src={
                            hasAvatar
                                ? contact.avatar
                                : "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"
                        }
                    />
                </div>

                <div>
                    <h1>
                        {contact.first || contact.last ? (
                            <>
                                {contact.first} {contact.last}
                            </>
                        ) : (
                            <i>No Name</i>
                        )}{" "}
                        <Favorite favorite={contact.favorite!} id={contact.id} />
                    </h1>

                    {contact.twitter && (
                        <p>
                            <a
                                href={`https://xcancel.com/${contact.twitter.slice(
                                    1,
                                    contact.twitter.length
                                )}`}
                                rel="noreferrer"
                                target="_blank"
                            >
                                {contact.twitter}
                            </a>
                        </p>
                    )}

                    {contact.notes && <p>{contact.notes}</p>}

                    <div>
                        <form
                            action={routes.contact.edit.href({
                                contactId: contact.id,
                            })}
                        >
                            <button type="submit">Edit</button>
                        </form>
                        <RestfulForm
                            action={api.contact.destroy.href({ contactId: contact.id })}
                            method="delete"
                            on={dom.submit(event => {
                                if (!confirm("Please confirm you want to delete this record.")) {
                                    event.preventDefault();
                                }
                            })}
                        >
                            <button type="submit">Delete</button>
                        </RestfulForm>
                    </div>
                </div>
            </div>
        );
    };
}
