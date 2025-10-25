import type { Remix } from "@remix-run/dom";
import { events } from "@remix-run/events";
import { Router } from "@webstd-ui/router";
import { App } from "~/App.tsx";
import { routes } from "~/routes.ts";

// Layout component that doesn't re-render on route changes
export function Layout(this: Remix.Handle, props: { children: Remix.RemixNode }) {
    return () => {
        console.log("Layout render");
        return (
            <div css={{ display: "flex", gap: "20px", padding: "20px" }}>
                <Sidebar />
                <main css={{ flex: 1 }}>{props.children}</main>
            </div>
        );
    };
}

// Sidebar that subscribes to router and only re-renders itself
function Sidebar(this: Remix.Handle) {
    // Get router from context
    const router = this.context.get(App);

    // Subscribe to router updates - only this component re-renders
    events(router, [Router.update(() => this.update())]);

    return () => {
        console.log("Sidebar render");

        return (
            <nav
                css={{
                    width: "200px",
                    borderRight: "1px solid #ccc",
                    paddingRight: "20px",
                }}
            >
                <h3>Navigation</h3>
                <ul css={{ listStyle: "none", padding: 0 }}>
                    <li>
                        <a
                            href={routes.index.href()}
                            style={{
                                fontWeight: router.isActive("/", true) ? "bold" : "normal",
                            }}
                        >
                            Home
                        </a>
                    </li>
                    <li>
                        <a
                            href={routes.about.href()}
                            style={{
                                fontWeight: router.isActive("/about", true) ? "bold" : "normal",
                            }}
                        >
                            About
                        </a>
                    </li>
                    <li>
                        <a
                            href={routes.blog.index.href()}
                            style={{
                                fontWeight: router.isActive("/blog") ? "bold" : "normal",
                            }}
                        >
                            Blog
                        </a>
                    </li>
                </ul>
            </nav>
        );
    };
}
