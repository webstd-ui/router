import { resources, route } from "@remix-run/fetch-router";

export const routes = route({
    index: "/",
    tasks: {
        ...resources("/task", {
            only: ["show", "new", "create"],
        }),
        destroy: { method: "POST", pattern: "/task/destroy/:id" },
    },
});
