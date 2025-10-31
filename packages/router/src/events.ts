import type { EventDescriptor, EventHandler } from "@remix-run/events";
import { bind } from "@remix-run/events";

export interface EventFactory<
    E extends Event = CustomEvent<null>,
    ECurrentTarget extends EventTarget = EventTarget
> {
    bind(
        handler: EventHandler<E, ECurrentTarget>,
        options?: AddEventListenerOptions
    ): EventDescriptor<ECurrentTarget>;

    dispatchEvent(
        ...args: CustomEvent<null> extends Event ? [init?: CustomEventInit<null>] : [event: E]
    ): void;
}

export function createEventFactory<
    E extends Event = CustomEvent<null>,
    ECurrentTarget extends EventTarget = EventTarget
>(target: ECurrentTarget, eventName: string): EventFactory<E, ECurrentTarget> {
    return {
        bind(handler, options) {
            return bind<E, ECurrentTarget>(eventName, handler, options);
        },
        dispatchEvent(...args) {
            if (args[0] instanceof Event) {
                const event = args[0];
                target.dispatchEvent(event);
            } else {
                const init = args[0];
                target.dispatchEvent(
                    new CustomEvent(eventName, {
                        bubbles: true,
                        cancelable: true,
                        ...init,
                    })
                );
            }
        },
    };
}
