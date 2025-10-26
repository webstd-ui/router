import { type RouteHandlers, redirect } from "@remix-run/fetch-router";
import { delay as sleep } from "@std/async";
import { render } from "@webstd-ui/router";
import { NewTask } from "./components/NewTask.tsx";
import { addTask, deleteTask, getTasks } from "./lib/task-data.ts";
import { routes } from "./routes.ts";

export const handlers = {
    async index() {
        return redirect(routes.tasks.show.href({ id: 1 }));
    },
    tasks: {
        async show({ params }) {
            await sleep(800);
            const task = getTasks().find(t => t.id === params.id);

            return render(
                <>
                    <h3>Task</h3>
                    <p>{task?.name}</p>
                </>,
            );
        },
        async destroy({ params, formData }) {
            await sleep(800);
            deleteTask(params.id);

            const redirectId = formData.get("redirect-id") as string;
            return redirect(
                redirectId ? routes.tasks.show.href({ id: redirectId }) : routes.tasks.new.href(),
            );
        },
        async new() {
            return render(
                <>
                    <h3>New Task</h3>
                    <NewTask />
                </>,
            );
        },
        async create({ formData }) {
            await sleep(800);
            addTask(formData.get("new-task") as string);
            return redirect(routes.index.href(), { status: 302 });
        },
    },
} satisfies RouteHandlers<typeof routes>;
