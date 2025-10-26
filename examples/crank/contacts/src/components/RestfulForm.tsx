import type { Context, TagProps } from "@b9g/crank";
import { dom, type EventHandler, events } from "@remix-run/events";
import { ROUTER } from "~/app.tsx";

export namespace RestfulForm {
    export interface Props extends TagProps<"form"> {
        handler?: EventHandler<CustomEvent<FormData | null>>;
    }
}

export function* RestfulForm(this: Context<RestfulForm.Props>, _props: RestfulForm.Props) {
    const router = this.consume(ROUTER);

    const controller = new AbortController();
    const clean = events(controller.signal, [
        dom.abort(() => {
            cleanup?.();
            clean();
        }),
    ]);

    let form: HTMLFormElement | undefined;
    let cleanup: (() => void) | undefined;

    let optimisticHandler = this.props.handler;

    for (const { handler, method, ...props } of this) {
        let canonicalMethod = "GET";
        let formMethod = canonicalMethod;

        if (method) {
            canonicalMethod = method.toUpperCase();
            formMethod = canonicalMethod !== "GET" ? "POST" : "GET";
        }

        yield (
            <form
                {...props}
                method={formMethod}
                ref={(el: HTMLFormElement) => {
                    if (
                        el &&
                        (optimisticHandler || handler) &&
                        (el !== form || optimisticHandler !== handler)
                    ) {
                        form = el;
                        if (optimisticHandler !== handler) optimisticHandler = handler;

                        if (optimisticHandler) {
                            cleanup?.();
                            cleanup = events(form, [
                                router.optimistic(optimisticHandler, { signal: controller.signal }),
                            ]);
                        }
                    }
                }}
            >
                {!["GET", "POST"].includes(canonicalMethod) && (
                    <input name="webstd-ui:method" type="hidden" value={canonicalMethod} />
                )}
                {props.children}
            </form>
        );
    }

    controller.abort();
}
