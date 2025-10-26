import { type InferRouteHandler, redirect } from "@remix-run/fetch-router";
import {
	createEmptyContact,
	deleteContact,
	updateContact,
} from "~/lib/contacts.ts";
import { routes } from "~/routes/mod";

export const update: InferRouteHandler<typeof routes.contact.update> = async ({
	params,
	formData,
}) => {
	const contact = await updateContact(params.contactId, {
		first: formData.get("first") as string,
		last: formData.get("last") as string,
		twitter: formData.get("twitter") as string,
		avatar: formData.get("avatar") as string,
		notes: formData.get("notes") as string,
	});

	return redirect(routes.contact.show.href({ contactId: contact.id }));
};

export const favorite: InferRouteHandler<
	typeof routes.contact.favorite
> = async ({ params, formData, url }) => {
	await updateContact(params.contactId, {
		favorite: formData.get("favorite") === "true",
	});

	// Redirect back to the show page, preserving search params
	return redirect(
		routes.contact.show.href({ contactId: params.contactId }) + url.search,
	);
};

export const destroy: InferRouteHandler<
	typeof routes.contact.destroy
> = async ({ params }) => {
	await deleteContact(params.contactId);
	return redirect("/");
};

export const create: InferRouteHandler<
	typeof routes.contact.create
> = async () => {
	await createEmptyContact();
	return redirect("/");
};
