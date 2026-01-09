# TaskScheduller

[日本語版 README はこちら](README_ja.md)

A VSCode extension for task management with Todo list, Kanban board, and Gantt chart views. All views share the same data and stay synchronized.

## Features

### Three Integrated Views

- **Todo List**: Simple task list with checkboxes and filtering
- **Kanban Board**: Drag-and-drop task management across columns (Todo / In Progress / On Hold / Done)
- **Gantt Chart**: Timeline view with dependency arrows and progress visualization

### Task Management

- Create, edit, and delete tasks
- Set priority levels (Low / Medium / High / Urgent)
- Track progress (0-100%)
- Assign start dates and due dates with automatic validation
- Assign tasks to team members
- Estimate hours for tasks

### Dependencies

- Create task dependencies (predecessor/successor relationships)
- Visualize dependencies as arrows in Gantt chart
- Connect mode for easy dependency creation by clicking tasks

### Project Organization

- Organize tasks by projects
- View all tasks across projects
- Quick project switching from sidebar

### Internationalization

- English and Japanese language support
- Automatically detects VSCode language settings

## Screenshots

(Coming soon)

## Installation

### From VSIX

1. Download the `.vsix` file from the releases page
2. In VSCode, open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run "Extensions: Install from VSIX..."
4. Select the downloaded `.vsix` file

### From Source

```bash
# Clone the repository
git clone https://github.com/Mui-MuiMui/TaskScheduller.git
cd TaskScheduller

# Install dependencies
npm install
cd webview && npm install && cd ..

# Build the extension
npm run build

# Package the extension
npm run package
```

## Usage

1. Click the TaskScheduller icon in the Activity Bar (left sidebar)
2. Create a new project or use the default project
3. Click "+" to add a new task
4. Switch between Todo, Kanban, and Gantt views using the tabs

### Keyboard Shortcuts

- Double-click a task to edit
- Drag tasks in Kanban to change status
- Use Connect Mode in Gantt to create dependencies

## Tech Stack

- **Extension Host**: TypeScript, VSCode Extension API
- **Webview**: React 19, Vite, Tailwind CSS v4
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Database**: sql.js (SQLite in WebAssembly)
- **Build Tools**: esbuild, Vite

## Development

```bash
# Start development mode with hot reload
npm run watch

# Run tests
npm test

# Lint code
npm run lint
```

## Requirements

- VSCode 1.100.0 or higher
- Node.js 22.x (for development)

## License

MIT License - see [LICENSE](LICENSE) for details.
