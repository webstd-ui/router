import { Directive, directive } from 'lit/directive.js';
import { noChange } from 'lit';
import type { ElementPart } from 'lit';

export type HttpMethod =
    | 'get'
    | 'head'
    | 'post'
    | 'put'
    | 'delete'
    | 'connect'
    | 'options'
    | 'trace'
    | 'patch';

type RestfulOptions = {
    method?: HttpMethod;
};

/**
 * Element directive for <form> that normalizes RESTful methods.
 *
 * Usage:
 *   <form action=${actionURL} ${restful({ method: 'put' })}>…</form>
 *
 * Behavior:
 * - If method is "get" or "post", uses that as the form's method.
 * - For any other HTTP method, sets form.method="post" and injects a hidden
 *   input (name="webstd-ui:method") with the canonical method value.
 */
class RestfulDirective extends Directive {
    private static WEBSTD_UI_METHOD = 'webstd-ui:method';

    render(_: RestfulOptions) {
        return noChange;
    }

    update(part: ElementPart, [opts]: [RestfulOptions?]) {
        const el = part.element as Element;
        if (!(el instanceof HTMLFormElement)) {
            throw new Error('restful() must be used on a <form> element.');
        }

        const canonical = (opts?.method ?? 'get').toLowerCase() as HttpMethod;
        const isGetOrPost = canonical === 'get' || canonical === 'post';
        const effective: HttpMethod = isGetOrPost ? canonical : 'post';

        // Sync the effective method onto the element.
        if (el.method.toLowerCase() !== effective) {
            el.setAttribute('method', effective);
        }

        // Maintain (or remove) the hidden override input.
        const needsHidden = !isGetOrPost;
        let hidden = el.querySelector<HTMLInputElement>(
            `input[name="${RestfulDirective.WEBSTD_UI_METHOD}"]`,
        );

        if (needsHidden) {
            if (!hidden) {
                hidden = document.createElement('input');
                hidden.type = 'hidden';
                hidden.name = RestfulDirective.WEBSTD_UI_METHOD;
                el.prepend(hidden);
            }
            if (hidden.value !== canonical) hidden.value = canonical;
        } else if (hidden) {
            hidden.remove();
        }

        return noChange;
    }
}

/** Apply to a <form> element: <form action=${url} ${restful({ method: 'put' })}>…</form> */
export const restful = directive(RestfulDirective);
