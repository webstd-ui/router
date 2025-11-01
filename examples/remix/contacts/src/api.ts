import { route, resources, createRouter } from "@remix-run/fetch-router";
import { redirect } from "@remix-run/fetch-router/response-helpers";
import { createEmptyContact, deleteContact, updateContact } from "./lib/contacts.ts";
import { routes } from "./routes.tsx";

export const api = route("/api", {
    contact: {
        ...resources("/contact", {
            only: ["destroy", "update", "create"],
            param: "contactId",
        }),
        favorite: { method: "PUT", pattern: "/contact/:contactId/favorite" },
    },
});

export const router = createRouter();

router.map(api, {
    contact: {
        update: async ({ params, formData }) => {
            const contact = await updateContact(params.contactId, {
                first: formData.get("first") as string,
                last: formData.get("last") as string,
                twitter: formData.get("twitter") as string,
                avatar: formData.get("avatar") as string,
                notes: formData.get("notes") as string,
            });

            return redirect(routes.contact.show.href({ contactId: contact.id }));
        },
        favorite: async ({ params, formData, url }) => {
            await updateContact(params.contactId, {
                favorite: formData.get("favorite") === "true",
            });

            // Redirect back to the show page, preserving search params
            return redirect(routes.contact.show.href({ contactId: params.contactId }) + url.search);
        },
        destroy: async ({ params }) => {
            await deleteContact(params.contactId);
            return redirect(routes.index.href());
        },
        create: async () => {
            await createEmptyContact();
            return redirect(routes.index.href());
        },
    },
});
