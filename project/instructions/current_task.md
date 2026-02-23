

deadlineの実装にあたり型の再定義が必要となったため、新issue0007として、以下のプロンプトに従い実装してください。


---

あなたは TypeScript / カレンダーエンジン設計に精通したシニアエンジニアです。  
以下の要件に従い、**拡張可能で破綻しない時間モデル（Temporal Model）** を実装してください。
すでに同等の機能を実装済みの場合は、以下の要件に合うよう修正してください。

---

# 🎯 目的

カレンダー／タスク管理アプリの基盤となる  
**「予定が時間を占有する」という概念の型モデルを設計・実装する。**

UI仕様ではなく、**データモデル層のみ** を対象とする。

---

# ❗ 最重要設計方針（必ず守る）

## ① Item と 時間情報を絶対に分離すること

❌ やってはいけない：

```ts
type CalendarItem = Base & TimeSpan;
```

✅ 必ずこうする：

```ts
type CalendarItem = {
  ...
  temporal: TimeSpan;
};
```

理由：

- RRULE対応で破綻するのを防ぐため
    
- 将来「複数発生」「浮動時間」等を扱えるようにするため
    
- Item と Temporal は責務が異なるため
    

---

## ② Range と Point を同列の概念として扱う

時間占有は以下の4種類を持つ：

- 日付のみの期間
    
- 日時付き期間
    
- 日付のみの一点（期限など）
    
- 日時付き一点
    

これらを **TimeSpan の union として統一表現** する。

---

## ③ Date と DateTime を絶対に混同させない

以下は別物：

|型|意味|
|---|---|
|ISODate|タイムゾーン非依存の暦日|
|ISODateTime|タイムゾーン依存の瞬間|

string を直接使わせず、**ブランド型で強制**すること。

---

# 📦 実装対象

## 1️⃣ ブランド型

```ts
export type ISODate = string & { readonly __brand: 'ISODate' };
export type ISODateTime = string & { readonly __brand: 'ISODateTime' };
```

さらに、安全な生成関数を提供すること：

```ts
ISODate.parse(...)
ISODateTime.parse(...)
```

※ 生string代入は禁止。

---

## 2️⃣ TimeSpan（時間占有の抽象）

```ts
export type TimeSpan =
  | CalendarDateRange
  | CalendarDateTimeRange
  | CalendarDatePoint
  | CalendarDateTimePoint;
```

---

## 3️⃣ 各Temporal型（Discriminated Union必須）

### 日付Range（終端は exclusive を型名で保証する）

```ts
export interface CalendarDateRange {
  kind: "CalendarDateRange";
  start: ISODate;          // inclusive
  endExclusive: ISODate;   // exclusive
}
```

### 日時Range

```ts
export interface CalendarDateTimeRange {
  kind: "CalendarDateTimeRange";
  start: ISODateTime;
  end: ISODateTime;
}
```

### 日付Point

```ts
export interface CalendarDatePoint {
  kind: "CalendarDatePoint";
  at: ISODate;
}
```

### 日時Point

```ts
export interface CalendarDateTimePoint {
  kind: "CalendarDateTimePoint";
  at: ISODateTime;
}
```

---

## 4️⃣ CalendarItem（時間情報を内包）

```ts
export type CalendarItem = {
  id: string;
  type: 'task' | 'appointment' | 'deadline';
  title: string;

  tags?: string[];
  description?: string;
  style?: Partial<CSSStyleDeclaration>;
  parents?: string[];

  temporal: TimeSpan;
};
```

---

# 📐 追加で実装するユーティリティ（必須）

以下の純粋関数を提供すること：

### 型ガード

```ts
isRange(span: TimeSpan): span is CalendarDateRange | CalendarDateTimeRange;
isPoint(span: TimeSpan): span is CalendarDatePoint | CalendarDateTimePoint;
hasTime(span: TimeSpan): span is CalendarDateTimeRange | CalendarDateTimePoint;
```

### 正規化処理（レイアウトエンジン用）

```ts
normalizeToDateTimeRange(span: TimeSpan, zone: string): CalendarDateTimeRange;
```

※ Date-only を安全に DateTime に昇格させる。

---

# 🚫 やってはいけないこと

- `Date` オブジェクトを直接保持しない
    
- string日時をそのまま使わない
    
- Item と Span を merge しない
    
- any を使わない
    
- union 判定を `in` 任せにしない（kind 必須）
    

---

# 🎯 将来拡張を壊さない設計にすること

このモデルは将来以下に拡張される前提：

- RRULE（繰り返し）
    
- Occurrence 展開
    
- Floating Time
    
- Timezone変更再解釈
    
- 仮想Span（ドラッグ中）
    

それらを追加しても **既存型が壊れない設計** にすること。

---



---

# 💬 出力形式

- すべて TypeScript
    
- 余計な説明は禁止
    
- 実運用可能なコードのみ出力
    

---

この仕様に厳密準拠して実装してください。