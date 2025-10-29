import { events } from '@remix-run/events';
import { html, LitElement } from 'lit';
import { RouterController } from '~/controllers/router-controller.ts';

export class Form extends LitElement {
    static tag = 'router-form';

    private routerController = new RouterController(this);
    private get router() {
        return this.routerController.router;
    }

    private dispose!: () => void;

    public override connectedCallback() {
        super.connectedCallback();
        const form = this.querySelector('form')!;
        this.dispose = events(form, [this.router.submitHandler]);
    }

    public override disconnectedCallback() {
        super.disconnectedCallback();
        this.dispose();
    }

    public render() {
        return html`<slot></slot>`;
    }
}

export class Link extends LitElement {
    static tag = 'router-link';

    private dispose!: () => void;

    private routerController = new RouterController(this);
    private get router() {
        return this.routerController.router;
    }

    public override connectedCallback() {
        super.connectedCallback();
        const anchor = this.querySelector('a')!;
        this.dispose = events(anchor, [this.router.navigationHandler]);
    }

    public override disconnectedCallback() {
        super.disconnectedCallback();
        this.dispose();
    }

    public render() {
        return html`<slot></slot>`;
    }
}
