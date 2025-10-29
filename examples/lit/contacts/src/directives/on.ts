import type { ElementPart, PartInfo } from 'lit/directive.js';
import { Directive, PartType, directive } from 'lit/directive.js';
import { nothing } from 'lit';

import type { EventDescriptor } from '@remix-run/events';
import { events } from '@remix-run/events';

// Utility: normalize any input into a flat array of specs
function normalize(
    value: EventDescriptor | EventDescriptor[] | null | undefined,
): EventDescriptor[] {
    if (value == null) return [];
    return (Array.isArray(value) ? value : [value]).flat() as EventDescriptor[];
}

class EventsDirective extends Directive {
    private element?: EventTarget;
    private descriptors: EventDescriptor[] = [];
    private cleanup?: (() => void) | Array<() => void>;

    public constructor(part: PartInfo) {
        super(part);
        if (part.type !== PartType.ELEMENT) {
            throw new Error('The `on` directive can only be used on elements.');
        }
    }

    public render(_: EventDescriptor | EventDescriptor[] | null | undefined) {
        // No attribute content; we just attach listeners side-effectfully.
        return nothing;
    }

    public update(
        part: ElementPart,
        [value]: [EventDescriptor | EventDescriptor[] | null | undefined],
    ) {
        const nextDescriptors = normalize(value);

        // If the target element identity changed or the specs changed, rebind.
        const elementChanged = this.element !== part.element;
        const descriptorsChanged =
            nextDescriptors.length !== this.descriptors.length ||
            nextDescriptors.some((s, i) => s !== this.descriptors[i]);

        if (elementChanged || descriptorsChanged) {
            this.teardown();
            if (nextDescriptors.length > 0) {
                // `events()` returns a single cleanup or an array of cleanups.
                this.cleanup = events(part.element, nextDescriptors);
            }
            this.element = part.element;
            this.descriptors = nextDescriptors;
        }

        return nothing;
    }

    public disconnected() {
        // Detach while the part is disconnected.
        this.teardown();
    }

    public reconnected() {
        // Re-attach if we still have a target & specs.
        if (this.element && this.descriptors.length) {
            this.cleanup = events(this.element, this.descriptors);
        }
    }

    private teardown() {
        if (!this.cleanup) return;
        if (Array.isArray(this.cleanup)) {
            for (const fn of this.cleanup)
                try {
                    fn();
                } catch {}
        } else {
            try {
                this.cleanup();
            } catch {}
        }
        this.cleanup = undefined;
    }
}

export const on = directive(EventsDirective);
