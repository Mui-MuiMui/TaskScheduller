# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Development (watch mode)
npm run watch              # Watch both extension and webview concurrently
npm run watch:extension    # Watch extension only
npm run watch:webview      # Vite dev server for webview

# Build
npm run build              # Build extension + webview + copy WASM
npm run package            # Create .vsix for distribution

# Testing
npm run test               # Run all Jest tests
npm run test:unit          # Run unit tests only
npm run test:e2e           # Run VSCode e2e tests
npm run test:coverage      # Generate coverage report

# Linting
npm run lint               # Lint src/ and webview/src/
npm run lint:fix           # Auto-fix linting issues
```

## Architecture Overview

This is a VSCode extension with two distinct parts that communicate via message passing:

### Extension (Backend) - `src/`
- **Entry:** `extension.ts` - initializes database, registers providers and commands
- **Database:** sql.js (SQLite in WASM), stored locally in VSCode's globalStorageUri
- **Repositories:** `database/repositories/` - TaskRepository, LabelRepository, DependencyRepository, ProjectRepository, KanbanColumnRepository
- **Providers:** `TaskSchedullerPanelProvider` (main panel), `SidebarViewProvider` (sidebar)
- **Service:** `TaskService.ts` - business logic orchestration

### Webview (Frontend) - `webview/`

**Tech Stack:**
- **React 19** - UI framework
- **Zustand 5** - State management (simpler than Redux)
- **Tailwind CSS 4** - Utility-first styling with CSS-first configuration
- **Radix UI** - Headless UI primitives (Dialog, Select, Dropdown, etc.)
- **Lucide React** - Icon library
- **@hello-pangea/dnd** - Drag-and-drop for Kanban

**Structure:**
- **State:** `stores/taskStore.ts` - Zustand store for global state
- **Views:** `components/todo/`, `components/kanban/`, `components/gantt/`
- **UI Components:** `components/ui/` - Radix UI primitives styled with Tailwind (shadcn/ui pattern)
- **Common:** `components/common/` - Shared components (TaskCard, TaskFormDialog)
- **API Bridge:** `api/vscode.ts` - wraps postMessage communication

**Creating New UI Components:**
- **Use shadcn/ui** - This project follows the shadcn/ui pattern for all UI components
- Use Radix UI primitives from `components/ui/` (Button, Dialog, Select, etc.)
- Style with Tailwind utility classes
- Integrate VSCode theme variables (defined in `webview/src/index.css` using CSS custom properties)
- Follow the shadcn/ui pattern: unstyled Radix components + Tailwind composition
- Tailwind CSS v4 uses CSS-first configuration in `index.css` (no `tailwind.config.ts`)

### Extension ↔ Webview Communication

Message-based IPC defined in `src/models/messages.ts`:

```
Webview → Extension: WEBVIEW_READY, LOAD_TASKS, CREATE_TASK, UPDATE_TASK, etc.
Extension → Webview: TASKS_LOADED, TASK_CREATED, TASK_UPDATED, ERROR, etc.
```

Flow:
1. Webview calls `vscode.postMessage()`
2. Extension's provider receives in `webview.onDidReceiveMessage`
3. Dispatches to TaskService methods
4. Response posted back with same request ID

### Database

- **Engine:** sql.js (SQLite compiled to WASM)
- **Migrations:** `database/migrations/` - run automatically on startup
- **Tables:** tasks, labels, task_labels, dependencies, kanban_columns, projects, settings
- **Persistence:** `DatabaseManager.save()` must be called after mutations
- **Multi-window:** FileSystemWatcher detects external changes

## Key Patterns

- **Singleton Panel:** `TaskSchedullerPanelProvider.getInstance()`
- **Repository Pattern:** Each entity has its own repository class
- **VSCode Theme Integration:** Tailwind uses VSCode CSS variables (see `webview/src/index.css`)
- **Localization:** i18n in `webview/src/i18n/`, VSCode l10n in `l10n/`

## Working with AI (Claude Code)

When collaborating with Claude Code on this project, follow these guidelines:

### Decision Making
- **Human instructions take priority** - Even if a request seems irrational or suboptimal, Claude should follow human instructions. The human has full context and final decision authority.

### Testing Protocol
- **Unit testing:** Claude performs unit tests and verifies basic functionality
- **Integration testing:** Human performs integration tests to validate the complete system
- **Commit approval:** Only create commits after human has performed integration tests and explicitly approves

### Commit Guidelines
- **Language:** All commit messages must be written in English
- **Timing:** Commits are only made when human explicitly requests them after testing
- **Format:** Follow conventional commit format with descriptive messages
