# Third-Party Libraries / サードパーティライブラリ

This document lists all third-party libraries used in TaskScheduller and their licenses.

このドキュメントは、TaskSchedullerで使用しているサードパーティライブラリとそのライセンスを記載しています。

---

## Extension (Backend)

| Library | License | Description |
|---------|---------|-------------|
| [sql.js](https://github.com/sql-js/sql.js) | MIT | SQLite compiled to WebAssembly |
| [uuid](https://github.com/uuidjs/uuid) | MIT | UUID generation |

### Development Dependencies

| Library | License | Description |
|---------|---------|-------------|
| [TypeScript](https://github.com/microsoft/TypeScript) | Apache-2.0 | TypeScript language |
| [esbuild](https://github.com/evanw/esbuild) | MIT | JavaScript bundler |
| [ESLint](https://github.com/eslint/eslint) | MIT | JavaScript linter |
| [@typescript-eslint/eslint-plugin](https://github.com/typescript-eslint/typescript-eslint) | MIT | TypeScript ESLint plugin |
| [@typescript-eslint/parser](https://github.com/typescript-eslint/typescript-eslint) | BSD-2-Clause | TypeScript ESLint parser |
| [Jest](https://github.com/jestjs/jest) | MIT | Testing framework |
| [ts-jest](https://github.com/kulshekhar/ts-jest) | MIT | TypeScript Jest transformer |
| [concurrently](https://github.com/open-cli-tools/concurrently) | MIT | Run multiple commands concurrently |
| [@vscode/test-electron](https://github.com/microsoft/vscode-test) | MIT | VSCode extension testing |
| [@vscode/vsce](https://github.com/microsoft/vscode-vsce) | MIT | VSCode extension packaging |

---

## Webview (Frontend)

### UI Framework

| Library | License | Description |
|---------|---------|-------------|
| [React](https://github.com/facebook/react) | MIT | UI library |
| [React DOM](https://github.com/facebook/react) | MIT | React DOM renderer |

### State Management

| Library | License | Description |
|---------|---------|-------------|
| [Zustand](https://github.com/pmndrs/zustand) | MIT | State management |

### UI Components (Radix UI)

| Library | License | Description |
|---------|---------|-------------|
| [@radix-ui/react-checkbox](https://github.com/radix-ui/primitives) | MIT | Checkbox component |
| [@radix-ui/react-dialog](https://github.com/radix-ui/primitives) | MIT | Dialog/Modal component |
| [@radix-ui/react-dropdown-menu](https://github.com/radix-ui/primitives) | MIT | Dropdown menu component |
| [@radix-ui/react-label](https://github.com/radix-ui/primitives) | MIT | Label component |
| [@radix-ui/react-progress](https://github.com/radix-ui/primitives) | MIT | Progress bar component |
| [@radix-ui/react-select](https://github.com/radix-ui/primitives) | MIT | Select component |
| [@radix-ui/react-slot](https://github.com/radix-ui/primitives) | MIT | Slot component |
| [@radix-ui/react-tabs](https://github.com/radix-ui/primitives) | MIT | Tabs component |
| [@radix-ui/react-tooltip](https://github.com/radix-ui/primitives) | MIT | Tooltip component |

### Drag and Drop

| Library | License | Description |
|---------|---------|-------------|
| [@hello-pangea/dnd](https://github.com/hello-pangea/dnd) | Apache-2.0 | Drag and drop for React |

### Icons

| Library | License | Description |
|---------|---------|-------------|
| [Lucide React](https://github.com/lucide-icons/lucide) | ISC | Icon library |

### Styling

| Library | License | Description |
|---------|---------|-------------|
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | MIT | Utility-first CSS framework |
| [clsx](https://github.com/lukeed/clsx) | MIT | Class name utility |
| [tailwind-merge](https://github.com/dcastil/tailwind-merge) | MIT | Tailwind class merging |
| [class-variance-authority](https://github.com/joe-bell/cva) | Apache-2.0 | Class variance utility |

### Development Dependencies

| Library | License | Description |
|---------|---------|-------------|
| [Vite](https://github.com/vitejs/vite) | MIT | Build tool |
| [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) | MIT | React plugin for Vite |
| [PostCSS](https://github.com/postcss/postcss) | MIT | CSS processor |
| [Autoprefixer](https://github.com/postcss/autoprefixer) | MIT | CSS vendor prefixer |
| [eslint-plugin-react-hooks](https://github.com/facebook/react) | MIT | React Hooks linting |
| [eslint-plugin-react-refresh](https://github.com/ArnaudBarre/eslint-plugin-react-refresh) | MIT | React Refresh linting |

---

## License Summary

| License | Count | Libraries |
|---------|-------|-----------|
| **MIT** | 29 | Most libraries |
| **Apache-2.0** | 3 | TypeScript, @hello-pangea/dnd, class-variance-authority |
| **BSD-2-Clause** | 1 | @typescript-eslint/parser |
| **ISC** | 1 | Lucide React |

---

## Full License Texts

The full license texts for each library can be found in their respective repositories linked above, or in the `node_modules` directory after installation.

各ライブラリの完全なライセンステキストは、上記リンク先のリポジトリ、またはインストール後の `node_modules` ディレクトリ内で確認できます。

---

## Acknowledgments

TaskScheduller is built upon the work of many open-source contributors. We are grateful for their contributions to the open-source community.

TaskSchedullerは多くのオープンソースコントリビューターの成果に基づいて構築されています。オープンソースコミュニティへの貢献に感謝いたします。
