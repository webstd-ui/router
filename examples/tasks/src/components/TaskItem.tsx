import type { Remix } from "@remix-run/dom";
import { App } from "~/app.tsx";
import type { Task } from "~/lib/task-data.ts";
import { routes } from "~/routes.ts";

export function TaskItem(this: Remix.Handle) {
    const router = this.context.get(App);

    let deleting: string | null = null;

    return ({ task }: { task: Task }) => {
        const isDeleting = deleting === task.id;
        const redirectId = routes.tasks.show.match(router.location.href)?.params.id ?? "";

        return (
            <>
                <span>{task.name}</span>
                &nbsp;
                <a href={routes.tasks.show.href({ id: task.id })}>Open</a>
                &nbsp;
                <form
                    action={routes.tasks.destroy.href({ id: task.id })}
                    method="post"
                    on={router.optimistic(
                        event => {
                            deleting = event.detail !== null ? task.id : null;
                            this.update();
                        },
                        { signal: this.signal },
                    )}
                    style={{ display: "inline" }}
                >
                    <button
                        disabled={isDeleting}
                        name="redirect-id"
                        type="submit"
                        value={redirectId}
                    >
                        {isDeleting ? "Deleting..." : "❌"}
                    </button>
                </form>
            </>
        );
    };
}
