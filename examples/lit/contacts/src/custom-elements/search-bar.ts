import { css, html, LitElement } from 'lit';
import { formControlStyles, srOnlyStyles } from '~/styles.ts';
import { ifDefined } from 'lit/directives/if-defined.js';
import { on } from '~/directives/on.ts';
import { dom } from '@remix-run/events';
import { RouterController } from '~/controllers/router-controller.ts';

export class SearchBar extends LitElement {
    static tag = 'app-search-bar';

    static styles = [
        formControlStyles,
        srOnlyStyles,
        css`
            #search-form {
                position: relative;
            }

            input[type='search'] {
                box-sizing: border-box;
                width: 100%;
                padding-left: 2rem;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' class='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='%23999' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' /%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: 0.625rem 0.75rem;
                background-size: 1rem;
                position: relative;
            }

            input[type='search'].loading {
                background-image: none;
            }

            #search-spinner {
                width: 1rem;
                height: 1rem;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%23000' strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M20 4v5h-.582m0 0a8.001 8.001 0 00-15.356 2m15.356-2H15M4 20v-5h.581m0 0a8.003 8.003 0 0015.357-2M4.581 15H9' /%3E%3C/svg%3E");
                animation: spin 1s infinite linear;
                position: absolute;
                left: 0.625rem;
                top: 0.75rem;
            }

            @keyframes spin {
                from {
                    transform: rotate(0deg);
                }
                to {
                    transform: rotate(360deg);
                }
            }
        `,
    ];

    private routerController = new RouterController(this);
    private get router() {
        return this.routerController.router;
    }

    private get query() {
        return this.router.url.searchParams.get('q')
            ? this.router.url.searchParams.get('q')!
            : undefined;
    }
    private previousQuery: string | undefined;

    public override connectedCallback(): void {
        super.connectedCallback();
        this.previousQuery = this.query;
        this.requestUpdate();
    }

    private handleInput = dom.input<HTMLInputElement>(async event => {
        // Remove empty query params when value is empty
        if (!event.currentTarget.value) {
            this.router.navigate(this.router.location.pathname + this.router.location.hash);
            return;
        }

        const isFirstSearch = this.previousQuery === undefined;

        // Simulate <form method="GET"> programatically
        // Adds <input name value>s as search params to URL
        // Also performs a client-side navigation
        this.router.submit(event.currentTarget.form, {
            replace: !isFirstSearch,
        });

        // Update previousQuery immediately so next input sees the current value
        if (event.currentTarget.value !== this.previousQuery) {
            this.previousQuery = event.currentTarget.value;
        }
    });

    private get searching() {
        return Boolean(this.router.navigating.to.url?.searchParams.has('q'));
    }

    public render() {
        return html`
            <form id="search-form">
                <input
                    aria-label="Search contacts"
                    class=${ifDefined(this.searching ? 'loading' : undefined)}
                    value=${ifDefined(this.query)}
                    id="q"
                    name="q"
                    ${on(this.handleInput)}
                    placeholder="Search"
                    type="search"
                />
                <div aria-hidden="true" ?hidden=${!this.searching} id="search-spinner"></div>
                <div aria-live="polite" class="sr-only"></div>
            </form>
        `;
    }
}
