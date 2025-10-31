/**
 * Attach a framework element to a {@link Response} for client reuse.
 *
 * @param element - Framework (Remix, Preact, Solid, Lit) element tree to render in the outlet.
 * @param init - Optional response initialization options.
 * @returns Response containing the rendered stream and the captured element.
 */
export function render<Renderable>(element: Renderable, init?: ResponseInit) {
    const response = new Response(null, init);
    (response as any)._element = element;
    return response;
}
