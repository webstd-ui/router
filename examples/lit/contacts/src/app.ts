import { Router } from '@webstd-ui/router';
import type { TemplateResult } from 'lit';
import { css, html, LitElement } from 'lit';
import { CONTACTS_KEY, getContacts } from './lib/contacts.ts';
import { handlers } from './routes/handlers';
import { routes } from './routes';
import { formControlStyles } from './styles.ts';

export type LitRouter = Router<TemplateResult>;

export class App extends LitElement {
    static tag = 'app-main';

    static styles = [
        formControlStyles,
        css`
            :host {
                font-family:
                    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',
                    'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                margin: 0;
                line-height: 1.5;
                color: #121212;

                display: flex;
                flex: 1;
                height: 100%;
                width: 100%;
                overflow: hidden;
            }

            #sidebar {
                width: 22rem;
                height: 100%;
                background-color: #f7f7f7;
                border-right: solid 1px #e3e3e3;
                display: flex;
                flex-direction: column;
            }

            #sidebar > * {
                padding-left: 2rem;
                padding-right: 2rem;
            }

            #sidebar h1 {
                font-size: 1rem;
                font-weight: 500;
                display: flex;
                align-items: center;
                margin: 0;
                padding: 1rem 2rem;
                border-top: 1px solid #e3e3e3;
                order: 1;
                line-height: 1;
            }

            #sidebar h1::before {
                content: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='25' viewBox='0 0 160 200'%3E%3Cpath fill='%2300e8ff' d='M40 120l20-60l90 90l-30 50l-40-40h-20'/%3E%3Cpath fill='%23283198' d='M80 160 L80 80 L120 40 L 120 120 M0 160 L40 200 L40 120 L20 120'/%3E%3Cpath fill='%23324fff' d='M40 120v-80l40-40v80M120 200v-80l40-40v80M0 160v-80l40 40'/%3E%3Cpath fill='%230ff' d='M40 200v-80l40 40'/%3E%3C/svg%3E");
                margin-right: 0.5rem;
                position: relative;
                top: 1px;
            }

            #sidebar > div {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding-top: 1rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid #e3e3e3;
            }

            #sidebar > div form {
                position: relative;
            }

            nav {
                flex: 1;
                overflow: auto;
                padding-top: 1rem;
            }

            p.loading {
                margin: auto;
            }
        `,
    ];

    public router: LitRouter = new Router({ globallyEnhance: false });

    public constructor() {
        super();
        this.router.map(routes, handlers);
    }

    private isLoading = true;

    private async load() {
        // Load initial data into storage
        const contacts = await getContacts();
        this.router.storage.set(CONTACTS_KEY, contacts);

        this.isLoading = false;
        this.requestUpdate();
    }

    public connectedCallback() {
        super.connectedCallback();
        this.load();
    }

    public render() {
        if (this.isLoading) {
            return html`<p class="loading">Loading...</p>`;
        }

        return html`
            <router-provider .router=${this.router}>
                <div id="sidebar">
                    <h1>Lit Contacts</h1>
                    <div>
                        <app-search-bar></app-search-bar>
                        <enhanced-form>
                            <form action=${routes.contact.create.href()} method="post">
                                <button type="submit">New</button>
                            </form>
                        </enhanced-form>
                    </div>
                    <nav>
                        <app-sidebar></app-sidebar>
                    </nav>
                </div>
                <app-details></app-details>
            </router-provider>
        `;
    }
}
