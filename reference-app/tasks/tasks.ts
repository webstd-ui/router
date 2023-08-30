import { CustomElement, Environment, ForEach, View, html } from "@webstd-ui/view"
import { ActionFunctionArgs, Router, RouterKey } from "@webstd-ui/router"
import { sleep, getTasks, deleteTask, Task } from "./task-data"

export async function loader() {
    await sleep()
    return {
        tasks: getTasks(),
    }
}

export async function action({ request }: ActionFunctionArgs) {
    await sleep()
    let formData = await request.formData()
    deleteTask(formData.get("taskId") as string)
    return {}
}

@CustomElement("app-tasks")
export class Tasks implements View {
    @Environment(RouterKey) router?: Router

    get tasks() {
        return this.router?.loaderData<{ tasks: Task[] }>()?.tasks ?? []
    }

    get body() {
        return html`
            <h2>Tasks</h2>
            <ul>
                ${ForEach(
                    this.tasks,
                    task => html`
                        <li>
                            <app-task-item .taskItem=${task}></app-task-item>
                        </li>
                    `
                )}
            </ul>
            <!-- {this.router.enhanceLink()} -->
            <a href="/tasks/new">Add New Task</a>
            <router-outlet></router-outlet>
        `
    }
}
