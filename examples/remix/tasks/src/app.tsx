import type { Remix } from "@remix-run/dom";
import { events } from "@remix-run/events";
import { Router } from "@webstd-ui/router";
import { TaskItem } from "./components/TaskItem.tsx";
import { handlers } from "./handlers.tsx";
import { getTasks } from "./lib/task-data.ts";
import { routes } from "./routes.ts";

type RemixRouter = Router<Remix.RemixNode>;

export function App(this: Remix.Handle<RemixRouter>) {
    const router: RemixRouter = new Router();
    router.map(routes, handlers);

    this.context.set(router);
    events(router, [Router.update(() => this.update())]);

    return () => {
        const tasks = getTasks();

        return (
            <>
                <h2>Tasks</h2>
                <ul>
                    {tasks.map(task => (
                        <li key={task.id}>
                            <TaskItem task={task} />
                        </li>
                    ))}
                </ul>
                <a href={routes.tasks.new.href()}>Add New Task</a>
                {router.outlet}
            </>
        );
    };
}
