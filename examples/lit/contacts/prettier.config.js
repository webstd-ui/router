// @ts-check

/** @type {import("prettier").Config} */
export default {
    printWidth: 100,
    tabWidth: 4,
    arrowParens: "avoid",
    singleQuote: true,

    // MARK: Defaults
    // useTabs: false,
    // semi: true,
    // trailingComma: "all",
    // proseWrap: "preserve",

    // plugins: [
    //     "@prettier/plugin-oxc",
    //     "prettier-plugin-pkg",
    //     "prettier-plugin-sh",
    //     "prettier-plugin-toml",
    // ],

    overrides: [
        {
            files: ["*.jsonc"],
            options: {
                trailingComma: "none",
            },
        },
    ],
};
