/**
 * レーン配置アルゴリズム
 * 複数日にまたがるアイテムを週の中で重ならないように配置する
 */

import { diffDaysISO } from './dateUtils';

/**
 * 週のコンテキスト（入力）
 */
export interface WeekContext {
  /** 週の開始日（ISO文字列: YYYY-MM-DD） */
  weekStart: string;
  /** 週の終了日（ISO文字列: YYYY-MM-DD、exclusive） */
  weekEnd: string;
  /** AllDayアイテムのリスト */
  items: AllDayItem[];
}

/**
 * AllDayアイテム（複数日にまたがる可能性のあるアイテム）
 */
export interface AllDayItem {
  id: string;
  dateRange: {
    start: string;            // ISO日付: YYYY-MM-DD (inclusive)
    endExclusive?: string;    // ISO日付: YYYY-MM-DD (exclusive、undefinedの場合は単日)
    /** @deprecated end を使用してください（endExclusive に移行中） */
    end?: string;
  };
}

/**
 * 正規化されたアイテム（週内のインデックス空間に変換済み）
 */
interface NormalizedItem {
  id: string;
  startIndex: number;  // 0-6（週内の開始位置）
  endIndex: number;    // 1-7（週内の終了位置、exclusive）
  span: number;        // endIndex - startIndex
}

/**
 * レーン（垂直方向の配置ライン）
 */
interface Lane {
  lastEndIndex: number;  // このレーンで最後に配置されたアイテムの終了インデックス
  items: NormalizedItem[];
}

/**
 * レーン配置結果（出力）
 */
export interface LaneLayout {
  laneCount: number;
  placements: {
    id: string;
    lane: number;        // 垂直方向のレーン番号（0から始まる）
    startIndex: number;  // 水平方向の開始位置（0-6）
    span: number;        // 幅（日数）
  }[];
}

/**
 * 週内の複数日アイテムをレーンに配置するアルゴリズム
 * 
 * このアルゴリズムは決定論的であり、同じ入力に対して常に同じ出力を返します。
 * 
 * @param context - 週のコンテキスト
 * @returns レーン配置結果
 */
export function layoutWeekAllDay(context: WeekContext): LaneLayout {
  const { weekStart, items } = context;

  // Step 1: アイテムを正規化（週内のインデックス空間に変換）
  const normalizedItems: NormalizedItem[] = [];

  for (const item of items) {
    const itemStart = item.dateRange.start;
    // endExclusive を優先し、フォールバックとして end（旧フィールド）を使用
    const itemEndRaw = item.dateRange.endExclusive ?? item.dateRange.end;
    const itemEnd = itemEndRaw || itemStart; // undefinedの場合は同日

    // 週内でのインデックスを計算（クランプ）
    let startIndex = diffDaysISO(weekStart, itemStart);
    let endIndex = diffDaysISO(weekStart, itemEnd);

    // endExclusive/end がundefinedの場合（単日アイテム）、endIndex = startIndex + 1
    if (!itemEndRaw) {
      endIndex = startIndex + 1;
    }

    // 週の範囲内にクランプ
    startIndex = Math.max(0, startIndex);
    endIndex = Math.min(7, endIndex);

    // 範囲外のアイテムは除外
    if (startIndex >= endIndex || startIndex >= 7 || endIndex <= 0) {
      continue;
    }

    const span = endIndex - startIndex;

    normalizedItems.push({
      id: item.id,
      startIndex,
      endIndex,
      span,
    });
  }

  // Step 2: ソート（決定論性を保証）
  // 1. startIndex ASC
  // 2. span DESC（長いバーを優先）
  // 3. id ASC（安定ソート）
  normalizedItems.sort((a, b) => {
    if (a.startIndex !== b.startIndex) {
      return a.startIndex - b.startIndex;
    }
    if (a.span !== b.span) {
      return b.span - a.span; // DESC
    }
    return a.id.localeCompare(b.id);
  });

  // Step 3: レーン割り当て（貪欲アルゴリズム）
  const lanes: Lane[] = [];
  const placements: LaneLayout['placements'] = [];

  for (const item of normalizedItems) {
    let placed = false;

    // 既存のレーンで配置可能な場所を探す
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];

      // このレーンの最後のアイテムの終了位置が、新しいアイテムの開始位置以下なら配置可能
      if (lane.lastEndIndex <= item.startIndex) {
        lane.items.push(item);
        lane.lastEndIndex = item.endIndex;
        placements.push({
          id: item.id,
          lane: i,
          startIndex: item.startIndex,
          span: item.span,
        });
        placed = true;
        break;
      }
    }

    // 配置できなかった場合、新しいレーンを作成
    if (!placed) {
      const newLane: Lane = {
        lastEndIndex: item.endIndex,
        items: [item],
      };
      lanes.push(newLane);
      placements.push({
        id: item.id,
        lane: lanes.length - 1,
        startIndex: item.startIndex,
        span: item.span,
      });
    }
  }

  return {
    laneCount: lanes.length,
    placements,
  };
}
