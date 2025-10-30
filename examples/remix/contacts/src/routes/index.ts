import { resources, route } from "@remix-run/fetch-router";

export const routes = route({
    index: { method: "GET", pattern: "/" },
    contact: {
        ...resources("/contact", {
            only: ["show", "edit", "destroy", "update", "create"],
            param: "contactId",
        }),
        favorite: { method: "PUT", pattern: "/contact/:contactId/favorite" },
    },
});
