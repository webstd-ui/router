import type { Remix } from "@remix-run/dom";
import { App } from "~/app.tsx";

const FormMethod = {
    Get: "get" as HttpMethod,
    Post: "post" as HttpMethod,
};

export type HttpMethod =
    | "get"
    | "head"
    | "post"
    | "put"
    | "delete"
    | "connect"
    | "options"
    | "trace"
    | "patch";

export namespace RestfulForm {
    export interface Props extends Omit<Remix.Props<"form">, "method"> {
        method?: HttpMethod;
    }
}

export function RestfulForm({ method, ...props }: RestfulForm.Props) {
    const canonical = method ?? FormMethod.Get;
    const effective = canonical !== FormMethod.Get ? FormMethod.Post : FormMethod.Get;
    const needsHiddenInput = effective !== canonical;

    return (
        <form {...props} method={effective}>
            {needsHiddenInput && <input name="webstd-ui:method" type="hidden" value={canonical} />}
            {props.children}
        </form>
    );
}

// Use when you've disabled global enhancement in the Router constructor options
export function EnhancedRestfulForm(this: Remix.Handle, props: RestfulForm.Props) {
    const router = this.context.get(App);

    return (
        <RestfulForm {...props} on={router.enhanceForm({ signal: this.signal })}>
            {props.children}
        </RestfulForm>
    );
}
