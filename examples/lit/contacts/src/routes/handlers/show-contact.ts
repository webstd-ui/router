import type { InferRouteHandler } from '@remix-run/fetch-router';
import { render } from '@webstd-ui/router';
import { CONTACTS_KEY, getContact, getContacts } from '~/lib/contacts.ts';
import { routes } from '~/routes';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { when } from 'lit/directives/when.js';
import { keyed } from 'lit/directives/keyed.js';

export const show: InferRouteHandler<typeof routes.contact.show> = async ({
    params,
    storage,
    url,
}) => {
    const query = url.searchParams.get('q');
    const contacts = await getContacts(query);
    storage.set(CONTACTS_KEY, contacts);

    const contact = (await getContact(params.contactId))!;
    const hasAvatar = !!contact.avatar;

    return render(html`
        <div id="contact">
            <div>
                ${keyed(
                    contact.id,
                    html`
                        <img
                            alt=""
                            src=${ifDefined(
                                hasAvatar
                                    ? contact.avatar
                                    : 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png',
                            )}
                        />
                    `,
                )}
            </div>

            <div>
                <h1>
                    ${when(
                        contact.first || contact.last,
                        () => `${contact.first} ${contact.last}`,
                        () => html`<i>No Name</i>`,
                    )}${' '}

                    <app-favorite
                        .initialFavorite=${contact.favorite!}
                        .contactId=${contact.id}
                    ></app-favorite>
                </h1>

                ${when(
                    contact.twitter,
                    handle => html`
                        <p>
                            <a
                                href=${`https://xcancel.com/${handle.slice(1, handle.length)}`}
                                rel="noreferrer"
                                target="_blank"
                            >
                                ${contact.twitter}
                            </a>
                        </p>
                    `,
                )}
                ${when(contact.notes, () => html`<p>{contact.notes}</p>`)}

                <div>
                    <enhance-form>
                        <form
                            action=${routes.contact.edit.href({
                                contactId: contact.id,
                            })}
                        >
                            <button type="submit">Edit</button>
                        </form>
                    </enhance-form>
                    <app-delete-button .contactId=${contact.id}></app-delete-button>
                </div>
            </div>
        </div>
    `);
};
