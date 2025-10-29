import { events, type EventDescriptor } from '@remix-run/events';
import { html, LitElement } from 'lit';
import { RouterController } from '~/controllers/router-controller.ts';

abstract class RouterNavigator extends LitElement {
    private routerController = new RouterController(this);
    private get router() {
        return this.routerController.router;
    }

    constructor(
        private element: 'a' | 'form',
        private handler: 'enhanceLink' | 'enhanceForm',
    ) {
        super();
    }

    public override connectedCallback() {
        super.connectedCallback();

        const element = this.querySelector(this.element)!;
        const handler = this.router[this.handler]({
            signal: this.abortController.signal,
        }) as EventDescriptor<HTMLElement>;

        events(element, [handler]);
    }

    private abortController = new AbortController();
    public override disconnectedCallback() {
        super.disconnectedCallback();
        this.abortController.abort();
    }

    public render() {
        return html`<slot></slot>`;
    }
}

export class Link extends RouterNavigator {
    static tag = 'enhance-link';

    constructor() {
        super('a', 'enhanceLink');
    }
}

export class Form extends RouterNavigator {
    static tag = 'enhance-form';

    constructor() {
        super('form', 'enhanceForm');
    }
}
