import { CustomElement, Environment, View, html } from "@webstd-ui/view"
import { LoaderFunctionArgs, Router, RouterKey } from "@webstd-ui/router"
import { sleep, getTasks, Task as ITask } from "./task-data"

export async function loader({ params }: LoaderFunctionArgs) {
    await sleep()
    return {
        task: getTasks().find(t => t.id === params.id),
    }
}

@CustomElement("app-task")
export class Task implements View {
    @Environment(RouterKey) router?: Router

    get taskItem() {
        return this.router?.loaderData<{ task: ITask | undefined }>()?.task
    }

    get body() {
        return html`
            <h3>Task</h3>
            <p>${this.taskItem?.name}</p>
        `
    }
}
