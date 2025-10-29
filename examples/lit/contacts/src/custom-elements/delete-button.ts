import { dom } from '@remix-run/events';
import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { on } from '~/directives/on.ts';
import { restful } from '~/directives/restful-form.ts';
import { routes } from '~/routes/index.ts';
import { formControlStyles } from '~/styles.ts';
import { RouterController } from '~/controllers/router-controller.ts';

export class DeleteButton extends LitElement {
    static tag = 'app-delete-button';

    static styles = [
        formControlStyles,
        css`
            button {
                color: #f44250;
            }
        `,
    ];

    private routerController = new RouterController(this);
    private get router() {
        return this.routerController.router;
    }

    @property({ attribute: false })
    public accessor contactId!: string;

    private confirm = dom.submit(event => {
        if (!confirm('Please confirm you want to delete this record.')) {
            event.preventDefault();
        }
    });

    public render() {
        return html`
            <form
                action=${routes.contact.destroy.href({ contactId: this.contactId })}
                ${restful({ method: 'delete' })}
                ${on([this.confirm, this.router.submitHandler])}
            >
                <button type="submit">Delete</button>
            </form>
        `;
    }
}
