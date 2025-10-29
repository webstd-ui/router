import { css, LitElement } from 'lit';
import { RouterConsumer } from '~/base-classes/router-consumer.ts';
import { codeStyles, formControlStyles, italicStyles } from '~/styles.ts';

export class Details extends RouterConsumer(LitElement) {
    static tag = 'app-details';

    static styles = [
        formControlStyles,
        italicStyles,
        codeStyles,
        css`
            :host {
                flex: 1;
                padding: 2rem 4rem;
                width: 100%;
            }

            :host.loading {
                opacity: 0.25;
                transition: opacity 200ms;
                transition-delay: 200ms;
            }

            /* Contact view styles */
            #contact {
                max-width: 40rem;
                display: flex;
            }

            #contact h1 {
                display: flex;
                align-items: flex-start;
                gap: 1rem;
                font-size: 2rem;
                font-weight: 700;
                margin: 0;
                line-height: 1.2;
            }

            #contact h1:focus {
                outline: none;
                color: hsl(224, 98%, 58%);
            }

            #contact h1 + p {
                margin: 0;
            }

            #contact h1 + p + p {
                white-space: break-spaces;
            }

            #contact a[href*='xcancel'] {
                display: flex;
                font-size: 1.5rem;
                color: #3992ff;
                text-decoration: none;
            }

            #contact a[href*='xcancel']:hover {
                text-decoration: underline;
            }

            #contact img {
                width: 12rem;
                height: 12rem;
                background: #c8c8c8;
                margin-right: 2rem;
                border-radius: 1.5rem;
                object-fit: cover;
            }

            #contact h1 ~ div {
                display: flex;
                gap: 0.5rem;
                margin: 1rem 0;
            }

            /* Contact form styles */
            #contact-form {
                display: flex;
                max-width: 40rem;
                flex-direction: column;
                gap: 1rem;
            }

            #contact-form > p:first-child {
                margin: 0;
                padding: 0;
            }

            #contact-form > p:first-child > :nth-child(2) {
                margin-right: 1rem;
            }

            #contact-form > p:first-child,
            #contact-form label {
                display: flex;
            }

            #contact-form p:first-child span,
            #contact-form label span {
                width: 8rem;
            }

            #contact-form p:first-child input,
            #contact-form label input,
            #contact-form label textarea {
                flex-grow: 2;
            }

            #contact-form p:last-child {
                display: flex;
                gap: 0.5rem;
                margin: 0 0 0 8rem;
            }

            #contact-form p:last-child button[type='button'] {
                color: inherit;
            }

            /* Index page styles */
            #index-page {
                margin: 2rem auto;
                text-align: center;
                color: #818181;
            }

            #index-page a {
                color: inherit;
            }

            #index-page a:hover {
                color: #121212;
            }

            #index-page:before {
                display: block;
                margin-bottom: 2rem;
                max-width: 400px;
                margin-left: auto;
                margin-right: auto;
                content: url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20425%20200%22%20id%3D%22full%22%3E%3Cview%20id%3D%22flame%22%20viewBox%3D%22-132.5%200%20160%20200%22%2F%3E%3Cview%20id%3D%22name%22%20viewBox%3D%22332.5%20127.5%20185%20122%22%2F%3E%3Csymbol%20id%3D%22name-symbol%22%20viewBox%3D%22240%2078%20185%20122%22%3E%3Cpath%20fill%3D%22var(--lit-logo-text-color%2C%20black)%22%20d%3D%22M394.5%2078v28.8H425v15.6h-30.5V158c0%203.6.1%207.2.5%2010.3.8%205.3%204%2010.5%208.4%2012.5%205.7%202.6%209.7%202.1%2021.6%201.7l-2.9%2017.2c-.8.4-4%20.3-7%20.3-7%200-33.4%202.5-38.8-24.7-.9-4.7-.7-9.5-.7-16.9v-35.8H362l.2-15.9h13.4V78zm-51.7%2028.7v91.5H324v-91.5zm0-28.7v16.3h-19V78zm-83.6%20102.2h48.2l-18%2018H240V78h19.2z%22%2F%3E%3C%2Fsymbol%3E%3Csymbol%20id%3D%22flame-symbol%22%20viewBox%3D%220%200%20160%20200%22%3E%3Cpath%20fill%3D%22var(--lit-logo-dark-cyan%2C%20%2300e8ff)%22%20d%3D%22M40%20120l20-60l90%2090l-30%2050l-40-40h-20%22%2F%3E%3Cpath%20fill%3D%22var(--lit-logo-dark-blue%2C%20%23283198)%22%20d%3D%22M80%20160%20L80%2080%20L120%2040%20L%20120%20120%20M0%20160%20L40%20200%20L40%20120%20L20%20120%22%2F%3E%3Cpath%20fill%3D%22var(--lit-logo-blue%2C%20%23324fff)%22%20d%3D%22M40%20120v-80l40-40v80M120%20200v-80l40-40v80M0%20160v-80l40%2040%22%2F%3E%3Cpath%20fill%3D%22var(--lit-logo-cyan%2C%20%230ff)%22%20d%3D%22M40%20200v-80l40%2040%22%2F%3E%3C%2Fsymbol%3E%3Cuse%20href%3D%22%23name-symbol%22%20x%3D%22332.5%22%20y%3D%22127.5%22%20transform%3D%22scale(0.61)%22%2F%3E%3Cuse%20href%3D%22%23flame-symbol%22%20x%3D%22-132.5%22%2F%3E%3C%2Fsvg%3E');
            }
        `,
    ];

    protected override onRouterUpdate() {
        if (this.router.navigating.to.state === 'loading') {
            this.classList.add('loading');
        } else {
            this.classList.remove('loading');
        }

        super.onRouterUpdate();
    }

    public render() {
        return this.router.outlet;
    }
}
