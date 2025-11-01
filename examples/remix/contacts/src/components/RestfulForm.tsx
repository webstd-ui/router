import type { Remix } from "@remix-run/dom";
import type { EventDescriptor } from "@remix-run/events";

export const METHOD_OVERRIDE = "webstd-ui:method";

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
    export interface Props extends Omit<Remix.Props<"form">, "method" | "on"> {
        method?: HttpMethod;
        on?: EventDescriptor<HTMLFormElement> | EventDescriptor<HTMLFormElement>[] | undefined;
    }
}

export function RestfulForm({ method, ...props }: RestfulForm.Props) {
    const canonical = method ?? FormMethod.Get;
    const effective = canonical !== FormMethod.Get ? FormMethod.Post : FormMethod.Get;
    const needsHiddenInput = effective !== canonical;

    return (
        <form {...props} method={effective}>
            {needsHiddenInput && <input name={METHOD_OVERRIDE} type="hidden" value={canonical} />}
            {props.children}
        </form>
    );
}
