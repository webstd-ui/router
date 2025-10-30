import { dom } from "@remix-run/events";
import type { Remix } from "@remix-run/dom";
import { Favorite } from "~/components/Favorite.tsx";
import { RestfulForm } from "~/components/RestfulForm.tsx";
import { getContact } from "~/lib/contacts.ts";
import { routes } from "~/routes";
import type { InferRouteHandler } from "./index.tsx";

export const show = {
    async loader({ params }) {
        const contact = (await getContact(params.contactId))!;
        const hasAvatar = !!contact.avatar;
        return { contact, hasAvatar };
    },
    component: ({ data: { contact, hasAvatar } }) => (
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
                        action={routes.contact.destroy.href({ contactId: contact.id })}
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
    ),
} satisfies InferRouteHandler<typeof routes.contact.show, Remix.RemixNode>;
