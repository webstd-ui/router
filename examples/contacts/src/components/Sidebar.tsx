import type { Remix } from "@remix-run/dom";
import { events } from "@remix-run/events";
import { Router } from "@webstd-ui/router";
import { App } from "~/app.tsx";
import { CONTACTS_KEY, type ContactRecord } from "~/lib/contacts.ts";
import { routes } from "~/routes/mod";

export function Sidebar(this: Remix.Handle) {
	const router = this.context.get(App);
	events(router, [Router.update(() => this.update(), { signal: this.signal })]);

	const contacts = () => router.storage.get(CONTACTS_KEY) || [];

	return () => {
		const c = contacts();
		return (
			<nav>
				{c.length ? (
					<ul>
						{c.map((contact) => (
							<SidebarItem key={contact.id} contact={contact} />
						))}
					</ul>
				) : (
					<p>
						<i>No contacts</i>
					</p>
				)}
			</nav>
		);
	};
}

function SidebarItem(this: Remix.Handle) {
	const router = this.context.get(App);

	return (props: { contact: ContactRecord }) => {
		const link = routes.contact.show.href({
			contactId: String(props.contact.id),
		});
		const className = router.isActive(link)
			? "active"
			: router.isPending(link)
				? "pending"
				: undefined;

		return (
			<li>
				<a class={className} href={link + router.location.search}>
					{props.contact.first || props.contact.last ? (
						<>
							{props.contact.first} {props.contact.last}
						</>
					) : (
						<i>No Name</i>
					)}
					{props.contact.favorite && <span>★</span>}
				</a>
			</li>
		);
	};
}
