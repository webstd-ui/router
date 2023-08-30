import { CustomElement, Environment, View, html } from "@webstd-ui/view"
import { ActionFunctionArgs, Router, RouterKey, redirect } from "@webstd-ui/router"
import { sleep, addTask } from "./task-data"

export async function action({ request }: ActionFunctionArgs) {
    await sleep()
    let formData = await request.formData()
    addTask(formData.get("new-task") as string)
    return redirect("/tasks", { status: 302 })
}

@CustomElement("app-new-task")
export class NewTask implements View {
    @Environment(RouterKey) router?: Router

    get isAdding() {
        return this.router?.navigation.state !== "idle"
    }

    get body() {
        return html`
            <h3>New Task</h3>
            <!-- {this.router.enhanceForm()} -->
            <form method="post">
                <input name="new-task" placeholder="Add a task..." ?disabled=${this.isAdding} />
                <button type="submit" ?disabled=${this.isAdding}>
                    ${this.isAdding ? "Adding..." : "Add"}
                </button>
            </form>
        `
    }
}
