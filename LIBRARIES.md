# Third-Party Libraries / サードパーティライブラリ

This document lists all third-party libraries used in TaskScheduller and their licenses.

このドキュメントは、TaskSchedullerで使用しているサードパーティライブラリとそのライセンスを記載しています。

---

## Extension (Backend)

| Library | Version | License | Description |
|---------|---------|---------|-------------|
| [sql.js](https://github.com/sql-js/sql.js) | ^1.13.0 | MIT | SQLite compiled to WebAssembly |
| [uuid](https://github.com/uuidjs/uuid) | ^11.0.3 | MIT | UUID generation |

### Development Dependencies

| Library | Version | License | Description |
|---------|---------|---------|-------------|
| [TypeScript](https://github.com/microsoft/TypeScript) | ^5.7.2 | Apache-2.0 | TypeScript language |
| [esbuild](https://github.com/evanw/esbuild) | ^0.24.0 | MIT | JavaScript bundler |
| [ESLint](https://github.com/eslint/eslint) | ^9.16.0 | MIT | JavaScript linter |
| [@typescript-eslint/eslint-plugin](https://github.com/typescript-eslint/typescript-eslint) | ^8.18.0 | MIT | TypeScript ESLint plugin |
| [@typescript-eslint/parser](https://github.com/typescript-eslint/typescript-eslint) | ^8.18.0 | BSD-2-Clause | TypeScript ESLint parser |
| [Jest](https://github.com/jestjs/jest) | ^29.7.0 | MIT | Testing framework |
| [ts-jest](https://github.com/kulshekhar/ts-jest) | ^29.2.5 | MIT | TypeScript Jest transformer |
| [concurrently](https://github.com/open-cli-tools/concurrently) | ^9.1.0 | MIT | Run multiple commands concurrently |
| [@vscode/test-electron](https://github.com/microsoft/vscode-test) | ^2.4.1 | MIT | VSCode extension testing |
| [@vscode/vsce](https://github.com/microsoft/vscode-vsce) | ^3.2.0 | MIT | VSCode extension packaging |

---

## Webview (Frontend)

### UI Framework

| Library | Version | License | Description |
|---------|---------|---------|-------------|
| [React](https://github.com/facebook/react) | ^19.0.0 | MIT | UI library |
| [React DOM](https://github.com/facebook/react) | ^19.0.0 | MIT | React DOM renderer |

### State Management

| Library | Version | License | Description |
|---------|---------|---------|-------------|
| [Zustand](https://github.com/pmndrs/zustand) | ^5.0.2 | MIT | State management |

### UI Components (Radix UI)

| Library | Version | License | Description |
|---------|---------|---------|-------------|
| [@radix-ui/react-checkbox](https://github.com/radix-ui/primitives) | ^1.1.3 | MIT | Checkbox component |
| [@radix-ui/react-dialog](https://github.com/radix-ui/primitives) | ^1.1.4 | MIT | Dialog/Modal component |
| [@radix-ui/react-dropdown-menu](https://github.com/radix-ui/primitives) | ^2.1.4 | MIT | Dropdown menu component |
| [@radix-ui/react-label](https://github.com/radix-ui/primitives) | ^2.1.1 | MIT | Label component |
| [@radix-ui/react-progress](https://github.com/radix-ui/primitives) | ^1.1.1 | MIT | Progress bar component |
| [@radix-ui/react-select](https://github.com/radix-ui/primitives) | ^2.1.4 | MIT | Select component |
| [@radix-ui/react-slot](https://github.com/radix-ui/primitives) | ^1.1.1 | MIT | Slot component |
| [@radix-ui/react-tabs](https://github.com/radix-ui/primitives) | ^1.1.2 | MIT | Tabs component |
| [@radix-ui/react-tooltip](https://github.com/radix-ui/primitives) | ^1.1.6 | MIT | Tooltip component |

### Drag and Drop

| Library | Version | License | Description |
|---------|---------|---------|-------------|
| [@hello-pangea/dnd](https://github.com/hello-pangea/dnd) | ^18.0.1 | Apache-2.0 | Drag and drop for React |

### Icons

| Library | Version | License | Description |
|---------|---------|---------|-------------|
| [Lucide React](https://github.com/lucide-icons/lucide) | ^0.468.0 | ISC | Icon library |

### Styling

| Library | Version | License | Description |
|---------|---------|---------|-------------|
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | ^3.4.17 | MIT | Utility-first CSS framework |
| [clsx](https://github.com/lukeed/clsx) | ^2.1.1 | MIT | Class name utility |
| [tailwind-merge](https://github.com/dcastil/tailwind-merge) | ^2.6.0 | MIT | Tailwind class merging |
| [class-variance-authority](https://github.com/joe-bell/cva) | ^0.7.1 | Apache-2.0 | Class variance utility |

### Development Dependencies

| Library | Version | License | Description |
|---------|---------|---------|-------------|
| [Vite](https://github.com/vitejs/vite) | ^6.0.5 | MIT | Build tool |
| [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) | ^4.3.4 | MIT | React plugin for Vite |
| [PostCSS](https://github.com/postcss/postcss) | ^8.4.49 | MIT | CSS processor |
| [Autoprefixer](https://github.com/postcss/autoprefixer) | ^10.4.20 | MIT | CSS vendor prefixer |
| [eslint-plugin-react-hooks](https://github.com/facebook/react) | ^5.1.0 | MIT | React Hooks linting |
| [eslint-plugin-react-refresh](https://github.com/ArnaudBarre/eslint-plugin-react-refresh) | ^0.4.16 | MIT | React Refresh linting |

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
