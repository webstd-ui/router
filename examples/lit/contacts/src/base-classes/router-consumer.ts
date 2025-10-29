import { consume } from '@lit/context';
import { events } from '@remix-run/events';
import { assert } from '@std/assert';
import { Router } from '@webstd-ui/router';
import { LitElement } from 'lit';
import { ROUTER_KEY, type LitRouter } from '~/app.ts';

export function RouterConsumer(Base: new () => LitElement) {
    return class extends Base {
        @consume({ context: ROUTER_KEY })
        private accessor _router: LitRouter | undefined;

        protected get router(): LitRouter {
            assert(this._router, 'Component used outside of <app-main>');
            return this._router;
        }

        private onDisconnect!: () => void;

        protected onRouterUpdate() {
            this.requestUpdate();
        }

        public override connectedCallback() {
            super.connectedCallback();
            this.onDisconnect = events(this.router, [Router.update(() => this.onRouterUpdate())]);
        }

        public override disconnectedCallback() {
            super.disconnectedCallback();
            this.onDisconnect();
        }
    };
}
