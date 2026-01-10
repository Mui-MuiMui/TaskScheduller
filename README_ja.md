# TaskScheduller

[English README](README.md)

VSCode拡張機能で、Todoリスト、カンバンボード、ガントチャートの3つのビューでタスク管理を行うツールです。


## 機能

### 3つの統合ビュー

**Todoリスト**
タスクのリスク管理
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

## インストール

### VSIXファイルから

1. リリースページから `.vsix` ファイルをダウンロード
2. VSCodeでコマンドパレットを開く（`Ctrl+Shift+P` / `Cmd+Shift+P`）
3. 「Extensions: Install from VSIX...」を実行
4. ダウンロードした `.vsix` ファイルを選択

### ソースから

```bash
# リポジトリをクローン
git clone https://github.com/Mui-MuiMui/TaskScheduller.git
cd TaskScheduller

# 依存関係をインストール
npm install
cd webview && npm install && cd ..

# 拡張機能をビルド
npm run build

# 拡張機能をパッケージ化
npm run package
```

## 使い方

1. アクティビティバー（左サイドバー）のTaskSchedullerアイコンをクリック
2. 新しいプロジェクトを作成するか、デフォルトプロジェクトを使用
3. 「+」をクリックして新しいタスクを追加
4. タブでTodo、カンバン、ガントビューを切り替え

### 操作方法

- タスクをダブルクリックして編集
- カンバンでタスクをドラッグしてステータスを変更
- ガントの接続モードで依存関係を作成

## 技術スタック

- **Extension Host**: TypeScript, VSCode Extension API
- **Webview**: React 19, Vite, Tailwind CSS v4
- **UIコンポーネント**: shadcn/ui
- **状態管理**: Zustand
- **データベース**: sql.js (WebAssembly版SQLite)
- **ビルドツール**: esbuild, Vite

## 開発

```bash
# ホットリロード付き開発モードを開始
npm run watch

# テストを実行
npm test

# コードをリント
npm run lint
```

## 動作要件

- VSCode 1.100.0 以上
- Node.js 22.x（開発時）

## ライセンス

- MIT License - 詳細は [LICENSE](./LICENSE) を参照してください。
- ライブラリのライセンス情報は [LIBRARIES.md](./LIBRARIES.md) を参照してください。
(各ライブラリのライセンスの最新情報は各ライブラリのページを参照してください。最新版ではない可能性があります。)