import { ContextProvider, createContext } from '@lit/context';
import { css, html, LitElement } from 'lit';
import { type LitRouter } from '~/app.ts';

export const ROUTER_KEY = createContext<LitRouter | undefined>('@webstd-ui/router');

export class RouterProvider extends LitElement {
    static tag = 'router-provider';

    static styles = css`
        :host {
            display: contents;
        }
    `;

    public set router(newValue: LitRouter) {
        this.provider.setValue(newValue);
    }

    private provider = new ContextProvider(this, { context: ROUTER_KEY });

    public render() {
        return html`<slot></slot>`;
    }
}
