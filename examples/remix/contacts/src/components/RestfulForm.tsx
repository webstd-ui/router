import type { Remix } from "@remix-run/dom";

export const enum HttpMethod {
    Get = "GET",
    Head = "HEAD",
    Post = "POST",
    Put = "PUT",
    Delete = "DELETE",
    Connect = "CONNECT",
    Options = "OPTIONS",
    Trace = "TRACE",
    Patch = "PATCH",
}

export namespace RestfulForm {
    export interface Props extends Omit<Remix.Props<"form">, "method"> {
        method?: HttpMethod;
    }
}

export function RestfulForm(this: Remix.Handle, { method, ...props }: RestfulForm.Props) {
    let canonicalMethod = HttpMethod.Get;
    let formMethod: HttpMethod = canonicalMethod;

    if (method) {
        canonicalMethod = method;
        formMethod = canonicalMethod !== HttpMethod.Get ? HttpMethod.Post : HttpMethod.Get;
    }

    const needsHiddenInput = ![HttpMethod.Get, HttpMethod.Post].includes(canonicalMethod);

    return (
        <form {...props} method={formMethod}>
            {needsHiddenInput && (
                <input name="webstd-ui:method" type="hidden" value={canonicalMethod} />
            )}
            {props.children}
        </form>
    );
}
