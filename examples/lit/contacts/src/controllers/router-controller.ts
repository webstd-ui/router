import { ContextConsumer } from '@lit/context';
import { events } from '@remix-run/events';
import { assert } from '@std/assert';
import { Router } from '@webstd-ui/router';
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { type LitRouter, ROUTER_KEY } from '~/app.ts';

export namespace RouterController {
    export type Host = ReactiveControllerHost & HTMLElement;
}

export class RouterController extends EventTarget implements ReactiveController {
    private host: RouterController.Host;
    private controller = new AbortController();
    private consumer: ContextConsumer<typeof ROUTER_KEY, RouterController.Host>;

    public get router(): LitRouter {
        assert(this.consumer.value, 'RouterController used outside of <router-provider> scope');
        return this.consumer.value;
    }

    constructor(host: RouterController.Host) {
        super();
        (this.host = host).addController(this);
        this.consumer = new ContextConsumer(host, {
            context: ROUTER_KEY,
            subscribe: true,
            callback: () => {
                events(this.router, [
                    Router.update(() => this.host.requestUpdate(), {
                        signal: this.controller.signal,
                    }),
                ]);
            },
        });
    }

    hostDisconnected() {
        this.controller.abort();
    }
}
