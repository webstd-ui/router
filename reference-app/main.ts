import { RouteObject } from "@webstd-ui/router"
import { CustomElement, View, html } from "@webstd-ui/view"
import { loader as tasksLoader, action as tasksAction } from "./tasks/tasks"
import { loader as taskLoader } from "./tasks/task"
import { action as newTaskAction } from "./tasks/new-task"

@CustomElement("todo-app")
export class App implements View {
    routes: RouteObject[] = [
        {
            path: "/",
            loader: tasksLoader,
            action: tasksAction,
            template: html`<app-tasks></app-tasks>`,
            children: [
                {
                    path: ":id",
                    loader: taskLoader,
                    template: html`<app-task></app-task>`,
                },
                {
                    path: "new",
                    action: newTaskAction,
                    template: html`<app-new-task></app-new-task>`,
                },
            ],
        },
    ]

    get body() {
        return html`<env-router
            .routes=${this.routes}
            .fallback=${html`<p>Loading...</p>`}
        ></env-router>`
    }
}
