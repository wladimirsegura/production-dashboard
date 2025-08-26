# 生産管理ダッシュボード

毎日届くCSVデータを元に、得意先別の「合計工数」を納期ごとに集計し、Web上でクロス集計表として閲覧できるシステムです。

## 機能

- **CSVアップロード機能**: 生産状況のCSVファイルをアップロードし、データベースに保存
- **クロス集計表示機能**: 得意先を縦軸、製造納期を横軸とし、日々の「合計工数」を集計して表示
- **期間フィルター**: 開始日・終了日を指定してデータを絞り込み表示

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **データベース**: Supabase (PostgreSQL)
- **スタイリング**: Tailwind CSS
- **言語**: TypeScript
- **CSVパーサー**: PapaParse

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
npm install papaparse @types/papaparse
```

### 2. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com) にアクセスし、新しいプロジェクトを作成
2. プロジェクトの設定から以下の情報を取得:
   - Project URL
   - API Keys (anon/public key)
   - Service Role Key

### 3. 環境変数の設定

`.env.local` ファイルを作成し、Supabaseの認証情報を設定:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. データベースマイグレーションの実行

```bash
# Supabase CLIでログイン
supabase login

# ローカルプロジェクトとSupabaseプロジェクトを連携
supabase link --project-ref your-project-ref

# マイグレーションを実行
supabase db push
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスしてアプリケーションを確認できます。

## CSVファイル形式

以下の26項目を含むCSVファイルに対応しています:

- 手配方式
- 検査区分
- 代表得意先
- 部品番号
- 製造指示番号
- ラインコード
- 作業区
- 曲げ/ろう付け作業者
- めっき作業者
- めっき種類
- めっき冶具
- 発行日
- めっき払出日
- 製造納期
- 製造指示数
- 大仁出荷
- めっき工程
- 玉川受入
- 5X作業者
- 棚番
- めっき収容数
- 曲げ数
- ろう付け箇所数
- NC_UNC機械番号
- ろう付け治具
- 二次協力企業

## 工数計算方法

合計工数 = (製造指示数 × 曲げ数) + (製造指示数 × ろう付け箇所数)

## デプロイメント

### Vercelへのデプロイ

1. [Vercel](https://vercel.com) にプロジェクトをインポート
2. 環境変数を設定:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. デプロイを実行

### 本番環境での注意事項

- Supabaseプロジェクトの Row Level Security (RLS) が有効になっています
- 認証機能を追加する場合は、RLSポリシーを適切に設定してください
- 大量のCSVデータを処理する場合は、Vercelの関数実行時間制限（30秒）にご注意ください

## プロジェクト構造

```
src/
├── app/
│   ├── api/
│   │   ├── crosstab/route.ts      # クロス集計データAPI
│   │   ├── productions/route.ts   # 生産データAPI
│   │   └── upload-csv/route.ts    # CSVアップロードAPI
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                   # メインページ
├── lib/
│   └── supabase.ts               # Supabaseクライアント設定
supabase/
├── migrations/
│   └── 20250806_create_productions_table.sql
└── config.toml
```

## ライセンス
new test6
