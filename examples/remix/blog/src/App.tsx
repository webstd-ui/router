import type { Remix } from "@remix-run/dom";
import { events } from "@remix-run/events";
import { Router } from "@webstd-ui/router";
import { Layout } from "./components/Layout.tsx";
import { handlers } from "./handlers.tsx";
import { routes } from "./routes.ts";

type RemixRouter = Router<Remix.RemixNode>;

// Main content that subscribes to router
function MainContent(this: Remix.Handle) {
    const router = this.context.get(App);
    events(router, [Router.update(() => this.update())]);

    return () => {
        console.log("MainContent render");
        return <>{router.outlet}</>;
    };
}

export function App(this: Remix.Handle<RemixRouter>) {
    const router: RemixRouter = new Router();
    router.map(routes, handlers);
    this.context.set(router);

    // Don't subscribe to updates here - let child components do it
    return () => (
        <Layout>
            <MainContent />
        </Layout>
    );
}
