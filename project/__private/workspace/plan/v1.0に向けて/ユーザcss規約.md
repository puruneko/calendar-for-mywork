
Itemのスタイルcssをユーザに編集させる機能の注意点を下記に規約としてまとめました。
この規約を満たすような機能にしてください。
この規約の適用はissue0010に取り込んでください。issue0010のドキュメントを修正してから実装に移ってください。

# 背景

ユーザーは「Item部分」にのみCSSを適用できます。
エディタUIやアプリ本体には一切影響させてはいけません。

ユーザーはCSSの「宣言(declaration)のみ」記述可能です。
セレクタは書けません。

# 必須セキュリティ要件

## 1. ルールベース・ホワイトリスト

プロパティは正規表現ルールによって許可してください。
許可対象は paint-only 系のみ。

### 許可ルール（regexベース）

/^color$/
/^background-color$/
/^border(-color|-style|-width|-radius)?$/
/^font(-family|-size|-weight|-style)?$/
/^line-height$/
/^letter-spacing$/
/^text-(align|decoration|transform|shadow)$/
/^box-shadow$/
/^opacity$/
/^outline(-color|-style|-width)?$/

これ以外は削除してください。

## 2. 明示的禁止キーワード検査

値に以下を含む場合は削除：

- url(
- expression(
- javascript:
- var(
- calc(
- attr(
- !important

大小文字区別なし。

## 3. 数値レンジ制限（必須）

値を解析して制限してください。

- font-size: 10px〜28px のみ許可
- line-height: 1〜2 の数値のみ許可（単位不可）
- opacity: 0.3〜1 の数値のみ許可
- border-width: 0px〜3px のみ許可
- box-shadow:
    - spread 半径は最大 10px
    - 複数指定は最大3つまで
- text-shadow:
    - blur 半径は最大 10px
    - 最大3つまで

範囲外は削除。

## 4. セレクタ禁止

入力に以下が含まれる場合：

- Rule ノード
- AtRule
- セレクタ
- ネスト

すべて無視する。

最終出力は必ず以下形式：

#preview-root {
  安全な宣言のみ
}

## 5. 制限

- 最大CSS長 3000文字
- 最大宣言数 50個
- ASTベース処理（文字列置換禁止）
- PostCSS使用

# 実装要件

- Node.js用
- sanitizeCSS(inputCSS) を実装
- 危険な宣言は削除
- コメントでセキュリティ意図を明示
- 将来のCSS仕様拡張に耐える構造にする

# 出力フォーマット

1. 設計方針（簡潔）
2. 許可プロパティ正規表現一覧
3. 禁止キーワード一覧
4. 完全なsanitizeCSS実装コード
5. 攻撃例入力 → 出力例
6. 残る潜在リスク

安全性を最優先し、表現力が制限されてもよい。
