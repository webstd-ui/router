import type { Remix } from "@remix-run/dom";
import { press } from "@remix-run/events/press";

export function Counter(this: Remix.Handle) {
    let count = 1;

    return () => (
        <div>
            <span>
                Double {count} is {count * 2}
            </span>
            <br />
            <button
                on={press(() => {
                    count += 1;
                    this.update();
                })}
                type="button"
            >
                Increment
            </button>
        </div>
    );
}
