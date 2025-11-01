import { events } from "@remix-run/events";
import { worker } from "@webstd-ui/router";
import { router } from "~/api.ts";
import { METHOD_OVERRIDE } from "~/components/RestfulForm.tsx";

async function handleRequest(req: Request) {
    const data = await req.clone().formData();
    const method = (data.get(METHOD_OVERRIDE) || "").toString().toUpperCase();
    const overridden = method && !["GET", "POST"].includes(method) ? method : req.method;
    const request = overridden === req.method ? req : new Request(req, { method: overridden });
    return router.fetch(request);
}

events(self, [
    worker.fetch(async event => {
        const url = new URL(event.request.url);
        const sameOrigin = url.origin === self.location.origin;
        const maybeApi = url.pathname.startsWith("/api/");

        // Only handle same-origin API/action requests
        if (!sameOrigin || !maybeApi) return;

        const response = await handleRequest(event.request);
        event.respondWith(response);
    }),
]);
