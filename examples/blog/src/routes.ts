import { resources, route } from "@remix-run/fetch-router";

export const routes = route({
	index: "/",
	about: "/about",
	blog: resources("/blog", {
		only: ["create", "index", "show", "new"],
	}),
});
