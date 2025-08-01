# Cloudflare R2 Setup Guide

このガイドでは、ブログシステムでCloudflare R2ファイルストレージを設定する方法を説明します。

## 前提条件

- Cloudflareアカウント
- R2ストレージへのアクセス権

## セットアップ手順

### 1. Cloudflare R2バケットの作成

1. Cloudflareダッシュボードにログイン
2. 左側のメニューから「R2 Object Storage」を選択
3. 「Create bucket」をクリック
4. バケット名を入力（例：`blog-files`）
5. リージョンを選択
6. 「Create bucket」をクリック

### 2. R2 API トークンの作成

1. Cloudflareダッシュボードで「My Profile」→「API Tokens」に移動
2. 「Create Token」をクリック
3. 「Custom token」を選択
4. 以下の設定を行う：
   - Token name: `R2 Blog Files`
   - Permissions: 
     - Account - Cloudflare R2:Edit
   - Account Resources: 
     - Include - All accounts (または特定のアカウント)
   - Zone Resources: なし
5. 「Continue to summary」→「Create Token」をクリック
6. 生成されたトークンをコピーして保存

### 3. 環境変数の設定

`.env.example`をコピーして`.env`ファイルを作成：

```bash
cp .env.example .env
```

`.env`ファイルを編集して以下の値を設定：

```env
# Cloudflare Account ID（ダッシュボードの右側に表示）
CLOUDFLARE_ACCOUNT_ID=your-account-id-here

# R2 API トークンから生成される認証情報
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key

# 作成したバケット名
R2_BUCKET_NAME=blog-files

# カスタムドメイン（オプション）
R2_PUBLIC_URL=https://files.yourdomain.com
```

### 4. カスタムドメインの設定（オプション）

R2バケットにカスタムドメインを設定する場合：

1. R2バケットの設定画面で「Custom Domains」タブを開く
2. 「Connect Domain」をクリック
3. ドメイン名を入力（例：`files.yourdomain.com`）
4. DNS設定を行う（CNAMEレコードを追加）
5. SSL証明書を設定

### 5. バケットのパブリックアクセス設定

1. バケット設定で「Settings」タブを開く
2. 「Public access」を有効にする
3. 必要に応じてCORS設定を行う

### 6. テスト

プレビューサーバーを起動：

```bash
npm run preview:local
```

ブラウザで `http://localhost:3001` にアクセスし、ファイルアップロード機能をテスト。

## ファイル構造

アップロードされたファイルはR2バケット内で以下の構造で保存されます：

```
blog-files/
├── images/
│   ├── photo-20240101-abc123.jpg
│   └── diagram-20240102-def456.png
├── downloads/
│   ├── document-20240101-ghi789.pdf
│   └── spreadsheet-20240102-jkl012.xlsx
└── audio/
    ├── bgm-20240101-mno345.mp3
    └── voice-20240102-pqr678.wav
```

## マークダウン記法

### ダウンロードボタン

```markdown
:::download
file=document.pdf
name=重要な文書
:::
```

### オーディオプレーヤー

```markdown
:::audio
file=bgm.mp3
name=背景音楽
:::
```

## トラブルシューティング

### よくある問題

1. **アップロードが失敗する**
   - API認証情報が正しく設定されているか確認
   - バケット名が正しいか確認
   - ファイルサイズが制限内か確認（50MB以下）

2. **ファイルにアクセスできない**
   - バケットのパブリックアクセスが有効になっているか確認
   - CORS設定が適切か確認

3. **カスタムドメインが機能しない**
   - DNS設定が正しいか確認
   - SSL証明書が有効か確認

### ログの確認

プレビューサーバーのログでR2の動作状況を確認できます：

```bash
npm run preview:local
```

エラーログはコンソールに出力されます。