import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { routes } from '~/routes/index.ts';
import { restful } from '~/directives/restful-form.ts';
import { on } from '~/directives/on.ts';
import type { InteractionDescriptor } from '@remix-run/events';
import { RouterController } from '~/controllers/router-controller.ts';

export class Favorite extends LitElement {
    static tag = 'app-favorite';

    static styles = css`
        form {
            display: flex;
            align-items: center;
            margin-top: 0.25rem;
        }

        button {
            box-shadow: none;
            font-size: 1.5rem;
            font-weight: 400;
            padding: 0;
            border: none;
            background: none;
        }

        button[value='true'] {
            color: #a4a4a4;
        }

        button[value='true']:hover,
        button[value='false'] {
            color: #eeb004;
        }
    `;

    @property({ attribute: false })
    public accessor contactId!: string;

    @property({ attribute: false })
    public accessor initialFavorite!: boolean;

    private optimisticFavorite: boolean | null = null;
    private currentContactId?: string;

    private get favorite() {
        return this.optimisticFavorite !== null ? this.optimisticFavorite : this.initialFavorite;
    }

    public override connectedCallback() {
        super.connectedCallback();
        this.currentContactId = this.contactId;
    }

    private routerController = new RouterController(this);
    private get router() {
        return this.routerController.router;
    }

    private controller = new AbortController();
    public override disconnectedCallback() {
        super.disconnectedCallback();
        this.controller.abort();
    }

    public render() {
        // Reset optimistic state if contact changed
        if (this.currentContactId !== this.contactId) {
            this.optimisticFavorite = null;
            this.currentContactId = this.contactId;
        }

        return html`
            <form
                action=${routes.contact.favorite.href({ contactId: this.contactId })}
                ${restful({ method: 'put' })}
                ${on([
                    this.router.enhanceForm(),
                    this.router.optimistic(
                        event => {
                            this.optimisticFavorite = event.detail
                                ? event.detail?.get('favorite') === 'true'
                                : null;

                            this.requestUpdate();
                        },
                        { signal: this.controller.signal },
                    ),
                ])}
            >
                <button
                    aria-label=${this.favorite ? 'Remove from favorites' : 'Add to favorites'}
                    name="favorite"
                    type="submit"
                    value=${this.favorite ? 'false' : 'true'}
                >
                    ${this.favorite ? '★' : '☆'}
                </button>
            </form>
        `;
    }
}
