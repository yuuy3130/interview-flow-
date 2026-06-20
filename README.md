# Interview Flow

面接官ごとに空き枠を登録し、候補者が共有リンクのカレンダーから面接日時を選択できる面接調整ツールです。確定時は `frt.shibuya@gmail.com` のGoogleカレンダーへ予定とGoogle Meetを作成し、候補者へ招待メールを自動送信します。

## 起動

Node.js 18以上だけで動きます。追加パッケージは不要です。

```bash
node server.mjs
```

その後、`http://localhost:3000` を開きます。

## Googleカレンダー連携

1. Google Cloud Consoleでプロジェクトを作成し、Google Calendar APIを有効化します。
2. OAuth同意画面を設定します。
3. 「ウェブ アプリケーション」のOAuthクライアントを作り、承認済みリダイレクトURIに `http://localhost:3000/auth/google/callback` を追加します。
4. 次の環境変数を設定して起動します。

```bash
GOOGLE_CLIENT_ID="..." \
GOOGLE_CLIENT_SECRET="..." \
BASE_URL="http://localhost:3000" \
node server.mjs
```

管理画面左下の「Googleカレンダー連携」から、必ず `frt.shibuya@gmail.com` で認証してください。本番公開時は `BASE_URL` を公開URLにし、Google Cloud側にも同じコールバックURLを登録します。

## 注意

データは `data/store.json` に保存されます。現状は小規模なMVP向けです。本番運用では管理画面のログイン認証、データベース、入力値検証、Google OAuthのstate検証を追加してください。
