# TaskScheduller

[日本語版 README はこちら](README_ja.md)

A VSCode extension for task management with Todo list, Kanban board, and Gantt chart views.


## Features

### Three Integrated Views

**Todo List**
Task list management
![ToDo_Preview1](./doc/img/ToDo_Preview1.gif)
![ToDo_Preview2](./doc/img/ToDo_Preview2.gif)


**Kanban Board**
Task management with Kanban board
![Kanban_Preview1](./doc/img/Kanban_Preview1.gif)


**Gantt Chart**
Timeline view, dependency arrows, progress visualization
![Gantt_Preview1](./doc/img/Gantt_Preview1.gif)


### Task Management
- Create, edit, and delete tasks
- Set priority levels (Low / Medium / High / Urgent)
- Track progress (0-100%)
- Assign start dates and due dates (with automatic validation)
- Assign tasks to team members (setting only)
- Estimate hours for tasks (setting only)


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


### Export / Import

- Export to JSON and CSV formats
- Import from exported JSON format


## Usage

1. Click the TaskScheduller icon in the Activity Bar (left sidebar)
2. Create a new project or use the default project
3. Click "+" to add a new task
4. Switch between Todo, Kanban, and Gantt views using the tabs


### Operations

- Double-click a task to edit
- Drag tasks in Kanban to change status
- Use Connect Mode in Gantt to create dependencies


## Requirements

- VSCode 1.100.0 or higher
- Node.js 22.x (for development)

## License

- MIT License - see [LICENSE](./LICENSE) for details.
- For library license information, see [LIBRARIES.md](./LIBRARIES.md).
(Please refer to each library's page for the latest license information. The information may not be up to date.)

## Donations

- If you find this extension useful, please consider buying me a coffee.
<a href='https://ko-fi.com/G2G71JGGSM' target='_blank'>
    <img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' />
  </a>