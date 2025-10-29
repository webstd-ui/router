import { events, type EventDescriptor } from '@remix-run/events';
import { assert } from '@std/assert';
import { Router } from '@webstd-ui/router';
import { html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { RouterController } from '~/controllers/router-controller.ts';

abstract class EnhancedElement extends LitElement {
    protected handle!: HTMLAnchorElement | HTMLFormElement;

    private routerController = new RouterController(this);
    protected get router() {
        return this.routerController.router;
    }

    constructor(private element: 'a' | 'form') {
        super();
    }

    public override connectedCallback() {
        super.connectedCallback();

        this.handle = this.querySelector(this.element)!;
        const enhancement = this.element === 'a' ? 'enhanceLink' : 'enhanceForm';
        const handler = this.router[enhancement]({
            signal: this.abortController.signal,
        }) as EventDescriptor<HTMLElement>;

        events(this.handle, [handler]);
    }

    protected abortController = new AbortController();
    public override disconnectedCallback() {
        super.disconnectedCallback();
        this.abortController.abort();
    }

    public render() {
        return html`<slot></slot>`;
    }
}

export class EnhancedLink extends EnhancedElement {
    static tag = 'enhanced-link';

    @property({ attribute: 'active-class' })
    public accessor activeClass = '';

    @property({ attribute: 'pending-class' })
    public accessor pendingClass = '';

    public get href(): string {
        const link = this.handle.getAttribute('href');
        assert(link, 'Must set an href to enhance an <a>');
        return link;
    }

    public get isActive(): boolean {
        return this.router.isActive(this.href);
    }

    public get isPending(): boolean {
        return this.router.isPending(this.href);
    }

    private updateClass() {
        if (this.isActive) {
            // If present, remove it
            this.handle.classList.remove(this.pendingClass);
            this.handle.classList.add(this.activeClass);
        } else if (this.isPending) {
            // If present, remove it
            this.handle.classList.remove(this.activeClass);
            this.handle.classList.add(this.pendingClass);
        } else {
            [this.activeClass, this.pendingClass].forEach(className =>
                this.handle.classList.remove(className),
            );

            if (!this.handle.classList.length) {
                this.handle.removeAttribute('class');
            }
        }
    }

    constructor() {
        super('a');
    }

    public override connectedCallback() {
        super.connectedCallback();

        events(this.router, [
            Router.update(() => this.updateClass(), { signal: this.abortController.signal }),
        ]);
    }
}

export class EnhancedForm extends EnhancedElement {
    static tag = 'enhanced-form';

    constructor() {
        super('form');
    }
}
