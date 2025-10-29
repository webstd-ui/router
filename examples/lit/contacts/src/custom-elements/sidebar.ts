import { css, html, LitElement } from 'lit';
import { CONTACTS_KEY, type ContactRecord } from '~/lib/contacts.ts';
import { routes } from '~/routes';
import { when } from 'lit/directives/when.js';
import { repeat } from 'lit/directives/repeat.js';
import { property } from 'lit/decorators.js';
import { italicStyles } from '~/styles.ts';
import { on } from '~/directives/on.ts';
import { RouterController } from '~/controllers/router-controller.ts';

export class Sidebar extends LitElement {
    static tag = 'app-sidebar';

    static styles = [
        italicStyles,
        css`
            :host {
                display: flex;
                flex-direction: column;
                flex: 1;
                overflow: hidden;
                min-height: 0;
            }

            ul {
                padding: 0;
                margin: 0;
                list-style: none;
            }

            li {
                margin: 0.25rem 0;
            }
        `,
    ];

    private routerController = new RouterController(this);
    private get router() {
        return this.routerController.router;
    }

    get contacts() {
        return this.router.storage.get(CONTACTS_KEY) || [];
    }

    public render() {
        return when(
            this.contacts.length,
            () => html`
                <ul>
                    ${repeat(
                        this.contacts,
                        contact => contact.id,
                        contact => html`
                            <li>
                                <sidebar-item .contact=${contact}></sidebar-item>
                            </li>
                        `,
                    )}
                </ul>
            `,
            () => html`
                <p>
                    <i>No contacts</i>
                </p>
            `,
        );
    }
}

export class SidebarItem extends LitElement {
    static tag = 'sidebar-item';

    static styles = [
        italicStyles,
        css`
            :host {
                display: block;
                line-height: normal;
            }

            a {
                display: flex;
                align-items: center;
                justify-content: space-between;
                overflow: hidden;
                white-space: pre;
                padding: 0.5rem;
                border-radius: 8px;
                color: inherit;
                text-decoration: none;
                gap: 1rem;
                transition: background-color 100ms;
                line-height: 1.5;
            }

            a:hover {
                background: #e3e3e3;
            }

            a.active {
                background: hsl(224, 98%, 58%);
                color: white;
            }

            a.active i {
                color: inherit;
            }

            a.pending {
                animation: progress 2s infinite ease-in-out;
                animation-delay: 200ms;
            }

            @keyframes progress {
                0% {
                    background: #e3e3e3;
                }
                50% {
                    background: hsla(224, 98%, 58%, 0.5);
                }
                100% {
                    background: #e3e3e3;
                }
            }

            a span {
                float: right;
                color: #eeb004;
                line-height: 1;
            }

            a.active span {
                color: inherit;
            }

            i {
                line-height: 1;
            }
        `,
    ];

    @property({ attribute: false })
    accessor contact!: ContactRecord;

    private routerController = new RouterController(this);
    private get router() {
        return this.routerController.router;
    }

    private get link() {
        return routes.contact.show.href({
            contactId: String(this.contact.id),
        });
    }

    private get routerClass() {
        return this.router.isActive(this.link)
            ? 'active'
            : this.router.isPending(this.link)
              ? 'pending'
              : '';
    }

    public render() {
        return html`
            <a
                class=${this.routerClass}
                href=${this.link + this.router.location.search}
                ${on(this.router.enhanceLink())}
            >
                ${when(
                    this.contact.first || this.contact.last,
                    () => `${this.contact.first} ${this.contact.last}`,
                    () => html`<i>No Name</i>`,
                )}${when(this.contact.favorite, () => html`<span>★</span>`)}</a
            >
        `;
    }
}
