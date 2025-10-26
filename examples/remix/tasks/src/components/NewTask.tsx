import type { Remix } from "@remix-run/dom";
import { App } from "~/app.tsx";
import { routes } from "~/routes.ts";

export function NewTask(this: Remix.Handle) {
    const router = this.context.get(App);

    return () => {
        const isAdding = router.navigating.to.state !== "idle";

        return (
            <form action={routes.tasks.create.href()} method="post">
                <input disabled={isAdding} name="new-task" placeholder="Add a task..." />
                <button disabled={isAdding} type="submit">
                    {isAdding ? "Adding..." : "Add"}
                </button>
            </form>
        );
    };
}
