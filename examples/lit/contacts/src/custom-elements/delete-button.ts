import { dom } from '@remix-run/events';
import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { on } from '~/directives/on.ts';
import { restful } from '~/directives/restful-form.ts';
import { RouterConsumer } from '~/base-classes/router-consumer.ts';
import { routes } from '~/routes/index.ts';
import { formControlStyles } from '~/styles.ts';

export class DeleteButton extends RouterConsumer(LitElement) {
    static tag = 'app-delete-button';

    static styles = [
        formControlStyles,
        css`
            button {
                color: #f44250;
            }
        `,
    ];

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
