# TaskScheduller

A VSCode extension for task management with Todo list, Kanban board, and Gantt chart views.

[日本語](#taskscheduller-日本語)


## Why Task Management in a VSCode Extension?
- For environments where Jira, Redmine, or other advanced tools cannot be used
  - No external network required (fully local)
  - Works on low-spec environments
- Break free from Excel-based task management


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


## Data Storage

- All data is stored locally in SQLite database
- Location: VSCode's globalStorageUri (`~/.vscode/...` or equivalent)
- No data is sent to external servers


## Known Limitations

- Single-user only (no multi-user collaboration)
- No cloud sync


## License

- MIT License - see [LICENSE](./LICENSE) for details.
- For library license information, see [LIBRARIES.md](./LIBRARIES.md).
(Please refer to each library's page for the latest license information. The information may not be up to date.)

## Donations

- If you find this extension useful, please consider buying me a coffee.
<a href='https://ko-fi.com/G2G71JGGSM' target='_blank'>
    <img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' />
  </a>

---

# TaskScheduller (日本語)

VSCode拡張機能で、Todoリスト、カンバンボード、ガントチャートの3つのビューでタスク管理を行うツールです。

[English](#taskscheduller)


## なぜVSCodeの拡張機能でタスク管理？
- JiraやRedmineなどの高機能ツールを使用できない環境向け
  - 外部ネットワーク不要（完全ローカル動作）
  - 低スペック環境でも動作
- Excelでのタスク管理から脱却


## 機能

### 3つの統合ビュー

**Todoリスト**
タスクのリスト管理
![ToDo_Preview1](./doc/img/ToDo_Preview1.gif)
![ToDo_Preview2](./doc/img/ToDo_Preview2.gif)


**カンバンボード**
カンバンボードによるタスク管理
![Kanban_Preview1](./doc/img/Kanban_Preview1.gif)


**ガントチャート**
タイムライン表示、依存関係の矢印表示、進捗の可視化
![Gantt_Preview1](./doc/img/Gantt_Preview1.gif)


### タスク管理
- タスクの作成、編集、削除
- 優先度の設定（低 / 中 / 高 / 緊急）
- 進捗管理（0-100%）
- 開始日・期限の設定（自動バリデーション付き）
- 担当者の設定(設定だけ)
- 見積時間の設定(設定だけ)

### 依存関係

- タスク間の依存関係を作成（先行・後続タスク）
- ガントチャートで依存関係を矢印で可視化
- 接続モードでクリックするだけで依存関係を作成

### プロジェクト管理

- プロジェクトごとにタスクを整理
- 全プロジェクトのタスクを横断表示
- サイドバーからプロジェクトをすばやく切り替え

### 多言語対応

- 英語と日本語に対応
- VSCodeの言語設定を自動検出

### リストのエクスポート・インポート

- JSONおよびCSVでのエクスポート機能
- 出力したJSON形式のインポート機能


## 使い方

1. アクティビティバー（左サイドバー）のTaskSchedullerアイコンをクリック
2. 新しいプロジェクトを作成するか、デフォルトプロジェクトを使用
3. 「+」をクリックして新しいタスクを追加
4. タブでTodo、カンバン、ガントビューを切り替え

### 操作方法

- タスクをダブルクリックして編集
- カンバンでタスクをドラッグしてステータスを変更
- ガントの接続モードで依存関係を作成


## 動作要件

- VSCode 1.100.0 以上
- Node.js 22.x（開発時）


## データ保存場所

- すべてのデータはローカルのSQLiteデータベースに保存
- 保存先: VSCodeのglobalStorageUri（`~/.vscode/...` など）
- 外部サーバーへのデータ送信なし


## 既知の制限事項

- シングルユーザー専用（複数人での同時編集は非対応）
- クラウド同期なし


## ライセンス

- MIT License - 詳細は [LICENSE](./LICENSE) を参照してください。
- ライブラリのライセンス情報は [LIBRARIES.md](./LIBRARIES.md) を参照してください。
(各ライブラリのライセンスの最新情報は各ライブラリのページを参照してください。最新版ではない可能性があります。)

## 寄付について

- 使い勝手が良ければコーヒーおごってください。
<a href='https://ko-fi.com/G2G71JGGSM' target='_blank'>
    <img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' />
  </a>
