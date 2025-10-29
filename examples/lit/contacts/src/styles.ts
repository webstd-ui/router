import { css } from 'lit';

/**
 * Shared form control styles for inputs, textareas, and buttons.
 * Can be imported and included in components that use these elements.
 */
export const formControlStyles = css`
    textarea,
    input,
    button {
        font-size: 1rem;
        font-family: inherit;
        border: none;
        border-radius: 8px;
        padding: 0.5rem 0.75rem;
        box-shadow:
            0 0px 1px hsla(0, 0%, 0%, 0.2),
            0 1px 2px hsla(0, 0%, 0%, 0.2);
        background-color: white;
        line-height: 1.5;
        margin: 0;
    }

    button {
        color: #3992ff;
        font-weight: 500;
    }

    textarea:hover,
    input:hover,
    button:hover {
        box-shadow:
            0 0px 1px hsla(0, 0%, 0%, 0.6),
            0 1px 2px hsla(0, 0%, 0%, 0.2);
    }

    button:active {
        box-shadow: 0 0px 1px hsla(0, 0%, 0%, 0.4);
        transform: translateY(1px);
    }
`;

/**
 * Screen reader only utility class.
 * Hides content visually but keeps it accessible to screen readers.
 */
export const srOnlyStyles = css`
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
    }
`;

/**
 * Italic text style used for empty states.
 */
export const italicStyles = css`
    i {
        color: #818181;
    }
`;

/**
 * Code block styling.
 */
export const codeStyles = css`
    code {
        font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
    }
`;
