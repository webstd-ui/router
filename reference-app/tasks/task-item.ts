import { CustomElement, Environment, Property, View, html } from "@webstd-ui/view"
import { RouterKey, Router } from "@webstd-ui/router"
import { Task } from "./task-data"

@CustomElement("app-task-item")
export class TaskItem implements View {
    @Environment(RouterKey) private router?: Router
    @Property() public taskItem!: Task

    // get fetcher() {
    //     return this.router?.fetcher()
    // }

    get isDeleting() {
        return false
        // return this.fetcher?.formData != null;
    }

    get body() {
        return html`
            <span>${this.taskItem.name}</span>
            &nbsp;
            <!-- {this.router?.enhanceLink()} -->
            <a href=${`/tasks/${this.taskItem.id}`}>Open</a>
            &nbsp;

            <!-- {this.fetcher?.enhanceForm()} -->
            <!-- <form style="display: inline" action="/tasks" method="post"> -->
            <button
                type="submit"
                name="taskId"
                value="${this.taskItem.id}"
                ?disabled=${this.isDeleting}
            >
                ${this.isDeleting ? "Deleting..." : "❌"}
            </button>
            <!-- </form> -->
        `
    }
}
