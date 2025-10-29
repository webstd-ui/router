import type { InferRouteHandler } from '@remix-run/fetch-router';
import { render } from '@webstd-ui/router';
import { html } from 'lit';
import { restful } from '~/directives/restful-form.ts';
import { CONTACTS_KEY, getContact, getContacts } from '~/lib/contacts.ts';
import { routes } from '~/routes';

export const edit: InferRouteHandler<typeof routes.contact.edit> = async ({
    params,
    storage,
    url,
}) => {
    const query = url.searchParams.get('q');
    const contacts = await getContacts(query);
    storage.set(CONTACTS_KEY, contacts);

    const contact = (await getContact(params.contactId))!;

    return render(html`
        <enhance-form>
            <form
                action=${routes.contact.update.href({ contactId: params.contactId })}
                ${restful({ method: 'put' })}
                id="contact-form"
            >
                <p>
                    <span>Name</span>
                    <input
                        aria-label="First name"
                        value=${contact.first ?? ''}
                        name="first"
                        placeholder="First"
                        type="text"
                    />
                    <input
                        aria-label="Last name"
                        value=${contact.last ?? ''}
                        name="last"
                        placeholder="Last"
                        type="text"
                    />
                </p>
                <label>
                    <span>𝕏, The Everything App</span>
                    <input
                        value=${contact.twitter ?? ''}
                        name="twitter"
                        placeholder="@elonmusk"
                        type="text"
                    />
                </label>
                <label>
                    <span>Avatar URL</span>
                    <input
                        aria-label="Avatar URL"
                        value=${contact.avatar ?? ''}
                        name="avatar"
                        placeholder="https://example.com/avatar.jpg"
                        type="text"
                    />
                </label>
                <label>
                    <span>Notes</span>
                    <textarea name="notes" rows="6" value=${contact.notes ?? ''}></textarea>
                </label>
                <p>
                    <button type="submit">Save</button>
                    <app-cancel-button></app-cancel-button>
                </p>
            </form>
        </enhance-form>
    `);
};
