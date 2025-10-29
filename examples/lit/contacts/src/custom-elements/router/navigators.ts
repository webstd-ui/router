import { events, type EventDescriptor } from '@remix-run/events';
import { html, LitElement } from 'lit';
import { RouterController } from '~/controllers/router-controller.ts';

abstract class RouterNavigator extends LitElement {
    private routerController = new RouterController(this);
    private get router() {
        return this.routerController.router;
    }

    private dispose!: () => void;

    constructor(
        private element: 'a' | 'form',
        private handler: 'navigationHandler' | 'submitHandler',
    ) {
        super();
    }

    public override connectedCallback() {
        super.connectedCallback();
        const element = this.querySelector(this.element)!;
        const handler = this.router[this.handler] as EventDescriptor<HTMLElement>;
        this.dispose = events(element, [handler]);
    }

    public override disconnectedCallback() {
        super.disconnectedCallback();
        this.dispose();
    }

    public render() {
        return html`<slot></slot>`;
    }
}

export class Form extends RouterNavigator {
    static tag = 'router-form';

    constructor() {
        super('form', 'submitHandler');
    }
}

export class Link extends RouterNavigator {
    static tag = 'router-link';

    constructor() {
        super('a', 'navigationHandler');
    }
}
