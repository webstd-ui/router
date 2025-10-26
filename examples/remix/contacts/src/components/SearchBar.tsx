import { connect, type Remix } from "@remix-run/dom";
import { dom, events } from "@remix-run/events";
import { Router } from "@webstd-ui/router";
import { App } from "~/app.tsx";

export function SearchBar(this: Remix.Handle, props: { query?: string }) {
	const router = this.context.get(App);
	events(router, [Router.update(() => this.update(), { signal: this.signal })]);

	let previousQuery = props.query;
	let input: HTMLInputElement;

	const searching = () =>
		Boolean(router.navigating.to.url?.searchParams.has("q"));

	const handleInput = dom.input<HTMLInputElement>((event) => {
		// Remove empty query params when value is empty
		if (!event.currentTarget.value) {
			router.navigate(router.location.pathname + router.location.hash);
			return;
		}

		const isFirstSearch = props.query === undefined;
		// Simulate <form method="get"> programatically
		// Adds <input name value>s as search params to URL
		// Also performs a client-side navigation
		router.submit(event.currentTarget.form, {
			replace: !isFirstSearch,
		});
	});

	return ({ query }: { query?: string }) => {
		if (query !== previousQuery) {
			previousQuery = query;
			if (input) input.value = query ?? "";
		}

		return (
			<form id="search-form" method="get">
				<input
					aria-label="Search contacts"
					className={searching() ? "loading" : ""}
					defaultValue={query}
					id="q"
					name="q"
					on={[handleInput, connect((event) => (input = event.currentTarget))]}
					placeholder="Search"
					type="search"
				/>
				<div aria-hidden hidden={!searching()} id="search-spinner" />
				<div aria-live="polite" className="sr-only" />
			</form>
		);
	};
}
