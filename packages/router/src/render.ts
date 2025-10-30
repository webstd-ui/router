export interface RenderResult<Renderable> {
    element: Renderable;
    init?: ResponseInit;
}

/**
 * Wrap a framework element so routers can recognise and render it without mutating {@link Response}.
 *
 * @param element - Framework element tree to render in the outlet.
 * @param init - Optional response initialization metadata (unused by the client router, surfaced for user-land).
 * @returns Object containing the renderable element and optional response metadata.
 */
export function render<Renderable>(element: Renderable, init?: ResponseInit): RenderResult<Renderable> {
    return {
        element,
        init,
    };
}
