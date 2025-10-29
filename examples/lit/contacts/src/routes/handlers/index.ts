import type { RouteHandlers } from '@remix-run/fetch-router';
import { render } from '@webstd-ui/router';
import { CONTACTS_KEY, getContacts } from '~/lib/contacts.ts';
import type { routes } from '~/routes/index.ts';

import { create, destroy, favorite, update } from './actions.ts';
import { edit } from './edit-contact.ts';
import { show } from './show-contact.ts';
import { html } from 'lit';

export const handlers = {
    async index({ storage, url }) {
        const query = url.searchParams.get('q');
        const contacts = await getContacts(query);
        storage.set(CONTACTS_KEY, contacts);

        return render(html`
            <p id="index-page">
                This is a demo for
                <a href="https://www.npmjs.com/package/@webstd-ui/router" target="_blank">
                    <code>@webstd-ui/router</code>
                </a>
                + Lit.
                <br />
                Check out
                <a
                    href="https://github.com/webstd-ui/router/tree/main/examples/lit/contacts"
                    target="_blank"
                >
                    the code at github.com/webstd-ui/router</a
                >.
            </p>
        `);
    },
    contact: {
        // Pages
        show,
        edit,
        // Actions
        create,
        destroy,
        update,
        favorite,
    },
} satisfies RouteHandlers<typeof routes>;
