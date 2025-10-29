import { dom } from '@remix-run/events';
import { on } from '~/directives/on.ts';
import { html, LitElement } from 'lit';
import { formControlStyles } from '~/styles.ts';

export class CancelButton extends LitElement {
    static tag = 'app-cancel-button';

    static styles = [formControlStyles];

    private goBack = dom.click(() => history.back());

    public render() {
        return html`<button ${on(this.goBack)} type="button">Cancel</button>`;
    }
}
