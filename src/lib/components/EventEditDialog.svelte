<script lang="ts">
/**
 * EventEditDialog - カレンダーアイテム編集ダイアログ
 *
 * ダブルクリックで開き、以下を編集できる:
 *   - タイトル
 *   - 種別（task / appointment / allday / deadline）
 *   - 開始・終了日時（種別に応じて表示切替）
 *   - タグ
 *   - 説明
 *   - カスタムスタイル（StyleEditor）
 *
 * 保存・削除は onSave / onDelete コールバックで親に委譲する。
 * CalendarItem の永続化はこのコンポーネントのスコープ外。
 */

import { DateTime } from 'luxon';
import type { CalendarItem } from '../models/CalendarItem';
import type { Task, TaskStatus } from '../models/Task';
import {
  parseISODate,
  toISODate,
  createCalendarDateRange,
  createCalendarDateTimeRange,
  createCalendarDateTimePoint,
  createCalendarDatePoint,
  isDateOnly,
  hasTime,
  isRange,
} from '../models/temporal';
// ダイアログ内で扱う種別（CalendarItem.type + allday の4択）
type DialogType = 'task' | 'appointment' | 'allday' | 'deadline';

// 種別ごとのアクセントカラー
const typeAccentColor: Record<DialogType, string> = {
  appointment: '#43a047',  // 緑
  task:        '#1e88e5',  // 青
  allday:      '#8e24aa',  // 紫
  deadline:    '#e53935',  // 赤
};

interface Props {
  /** 編集対象のアイテム */
  item: CalendarItem;
  /** 保存時コールバック */
  onSave: (updated: CalendarItem) => void;
  /** 削除時コールバック */
  onDelete: (id: string) => void;
  /** ダイアログを閉じるコールバック */
  onClose: () => void;
}

let { item, onSave, onDelete, onClose }: Props = $props();

// ===== 内部状態 =====

/** 種別を4択に変換 */
function toDialogType(item: CalendarItem): DialogType {
  if (item.type === 'deadline') return 'deadline';
  if (item.type === 'task') return 'task';
  // appointment: temporal が DateOnly なら allday 扱い
  if (isDateOnly(item.temporal)) return 'allday';
  return 'appointment';
}

let dialogType = $state<DialogType>(toDialogType(item));
let title = $state(item.title);
let description = $state(item.description ?? '');
let tags = $state<string[]>([...(item.tags ?? [])]);
let tagInput = $state('');
let taskStatus = $state<TaskStatus>(item.type === 'task' ? (item as Task).status : 'todo');
let showDeleteConfirm = $state(false);

// 日付・時刻フィールド（文字列で管理しUIと同期）
function getInitialDates() {
  const t = item.temporal;
  if (t.kind === 'CalendarDateTimeRange') {
    return {
      startDate: t.start.toISODate()!,
      startTime: t.start.toFormat('HH:mm'),
      endDate: t.end.toISODate()!,
      endTime: t.end.toFormat('HH:mm'),
    };
  }
  if (t.kind === 'CalendarDateRange') {
    // endExclusive - 1日 = 表示上の終了日
    const endDisplay = DateTime.fromISO(t.endExclusive).minus({ days: 1 }).toISODate()!;
    return {
      startDate: t.start,
      startTime: '09:00',
      endDate: endDisplay,
      endTime: '10:00',
    };
  }
  if (t.kind === 'CalendarDateTimePoint') {
    return {
      startDate: t.at.toISODate()!,
      startTime: t.at.minus({ hours: 1 }).toFormat('HH:mm'),
      endDate: t.at.toISODate()!,
      endTime: t.at.toFormat('HH:mm'),
    };
  }
  // CalendarDatePoint
  return {
    startDate: t.at,
    startTime: '09:00',
    endDate: t.at,
    endTime: '10:00',
  };
}

const init = getInitialDates();
let startDate = $state(init.startDate);
let startTime = $state(init.startTime);
let endDate = $state(init.endDate);
let endTime = $state(init.endTime);

// ===== バリデーション =====

let titleError = $state('');
let dateError = $state('');
let descError = $state('');

function validate(): boolean {
  titleError = '';
  dateError = '';
  descError = '';

  if (!title.trim()) {
    titleError = 'タイトルを入力してください';
  }
  if (description.length > 1000) {
    descError = '説明は1000文字以下です';
  }

  if (dialogType !== 'allday') {
    const start = DateTime.fromISO(`${startDate}T${startTime}`);
    const end = DateTime.fromISO(`${endDate}T${endTime}`);
    if (!start.isValid || !end.isValid) {
      dateError = '日付・時刻の形式が正しくありません';
    } else if (dialogType !== 'deadline' && end <= start) {
      dateError = '終了時刻は開始時刻より後にしてください';
    }
  } else {
    // allday: 終了日 >= 開始日
    if (endDate < startDate) {
      dateError = '終了日は開始日以降にしてください';
    }
  }

  return !titleError && !dateError && !descError;
}

// ===== タグ操作 =====

function addTag() {
  const t = tagInput.trim();
  if (t && !tags.includes(t)) {
    tags = [...tags, t];
  }
  tagInput = '';
}

function removeTag(tag: string) {
  tags = tags.filter(t => t !== tag);
}

// ===== 種別変更時の挙動 =====

function handleTypeChange(newType: DialogType) {
  const prev = dialogType;
  dialogType = newType;

  // allday → 時刻付きに変更: デフォルト時刻を補完
  if (prev === 'allday' && newType !== 'allday') {
    startTime = '09:00';
    endTime = '10:00';
    if (startDate === endDate && newType !== 'deadline') {
      // 同日の場合は終了時刻を1時間後に
    }
  }
  // allday に変更: 終了日を開始日に揃える（単日選択がデフォルト）
  if (newType === 'allday' && prev !== 'allday') {
    endDate = startDate;
  }
}

// ===== temporal の組み立て =====

function buildTemporal() {
  if (dialogType === 'allday') {
    const start = parseISODate(startDate);
    // endExclusive = 表示終了日 + 1日
    const endExcl = DateTime.fromISO(endDate).plus({ days: 1 }).toISODate()!;
    return createCalendarDateRange(start, parseISODate(endExcl));
  }
  if (dialogType === 'deadline') {
    const dt = DateTime.fromISO(`${endDate}T${endTime}`);
    return createCalendarDateTimePoint(dt);
  }
  // task / appointment: CalendarDateTimeRange
  const start = DateTime.fromISO(`${startDate}T${startTime}`);
  const end = DateTime.fromISO(`${endDate}T${endTime}`);
  return createCalendarDateTimeRange(start, end);
}

// ===== 保存・削除 =====

function handleSave() {
  if (!validate()) return;

  const temporal = buildTemporal();
  const baseItem: CalendarItem = {
    ...item,
    title: title.trim(),
    description: description.trim() || undefined,
    tags: tags.length > 0 ? tags : undefined,
    temporal,
    type: dialogType === 'allday' ? 'appointment' : dialogType,
  };

  const updated: CalendarItem = dialogType === 'task'
    ? { ...baseItem, type: 'task', status: taskStatus } as Task
    : baseItem;

  onSave(updated);
  onClose();
}

function handleDeleteConfirm() {
  onDelete(item.id);
  onClose();
}

// ===== 表示用ラベル =====

function formatItemDatetime(item: CalendarItem): string {
  const t = item.temporal;
  if (t.kind === 'CalendarDateTimeRange') {
    return `${t.start.toFormat('yyyy年M月d日 HH:mm')} - ${t.end.toFormat('HH:mm')}`;
  }
  if (t.kind === 'CalendarDateRange') {
    return `${t.start} - ${t.endExclusive}（終日）`;
  }
  if (t.kind === 'CalendarDateTimePoint') {
    return t.at.toFormat('yyyy年M月d日 HH:mm');
  }
  return t.at;
}

/** Backdrop クリックで閉じる */
function handleBackdropClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('dialog-backdrop')) {
    onClose();
  }
}

/** グローバルキーダウンで Escape 閉じる */
function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (showDeleteConfirm) {
      showDeleteConfirm = false;
    } else {
      onClose();
    }
  }
}

</script>

<!-- グローバルキーダウンリスナー -->
<svelte:window onkeydown={handleGlobalKeydown} />

<!-- backdrop -->
<div
  class="dialog-backdrop"
  role="dialog"
  aria-modal="true"
  aria-label="イベント編集"
  onclick={handleBackdropClick}
  tabindex="-1"
>
  <div class="dialog" style="--accent: {typeAccentColor[dialogType]}">
    <!-- 種別アクセントバー -->
    <div class="accent-bar"></div>

    <!-- ヘッダー -->
    <div class="dialog-header">
      <input
        class="title-input {titleError ? 'error' : ''}"
        type="text"
        bind:value={title}
        placeholder="タイトルを入力..."
        aria-label="タイトル"
        autofocus
      />
    </div>
    {#if titleError}
      <div class="field-error" style="padding-left: 16px;">{titleError}</div>
    {/if}

    <!-- 本体 -->
    <div class="dialog-body">

      <!-- 種別コンボボックス -->
      <div class="field-row">
        <label class="field-label" for="ed-type">種別</label>
        <select
          id="ed-type"
          class="type-select"
          value={dialogType}
          onchange={(e) => handleTypeChange((e.currentTarget as HTMLSelectElement).value as DialogType)}
        >
          <option value="appointment">予定（Appointment）</option>
          <option value="task">タスク（Task）</option>
          <option value="allday">終日（AllDay）</option>
          <option value="deadline">締切（Deadline）</option>
        </select>
      </div>

      <!-- Task: ステータス -->
      {#if dialogType === 'task'}
        <div class="field-row">
          <label class="field-label" for="ed-status">ステータス</label>
          <select id="ed-status" class="type-select" bind:value={taskStatus}>
            <option value="todo">TODO</option>
            <option value="doing">進行中</option>
            <option value="done">完了</option>
          </select>
        </div>
      {/if}

      <!-- 日付・時刻フィールド -->
      {#if dialogType === 'allday'}
        <!-- 終日: 日付のみ -->
        <div class="field-row">
          <label class="field-label" for="ed-start-date">開始日</label>
          <input id="ed-start-date" type="date" class="date-input" bind:value={startDate} />
        </div>
        <div class="field-row">
          <label class="field-label" for="ed-end-date">終了日</label>
          <input id="ed-end-date" type="date" class="date-input" bind:value={endDate} />
        </div>
      {:else if dialogType === 'deadline'}
        <!-- 締切: 開始（任意）と締切日時 -->
        <div class="field-row">
          <label class="field-label" for="ed-start-date2">開始</label>
          <input id="ed-start-date2" type="date" class="date-input" bind:value={startDate} />
          <input type="time" class="time-input" bind:value={startTime} />
        </div>
        <div class="field-row">
          <label class="field-label" for="ed-end-date2">締切</label>
          <input id="ed-end-date2" type="date" class="date-input" bind:value={endDate} />
          <input type="time" class="time-input" bind:value={endTime} />
        </div>
      {:else}
        <!-- task / appointment: 開始〜終了 -->
        <div class="field-row">
          <label class="field-label" for="ed-start-date3">開始</label>
          <input id="ed-start-date3" type="date" class="date-input" bind:value={startDate} />
          <input type="time" class="time-input" bind:value={startTime} />
        </div>
        <div class="field-row">
          <label class="field-label" for="ed-end-date3">終了</label>
          <input id="ed-end-date3" type="date" class="date-input" bind:value={endDate} />
          <input type="time" class="time-input" bind:value={endTime} />
        </div>
      {/if}
      {#if dateError}
        <div class="field-error">{dateError}</div>
      {/if}

      <!-- タグ -->
      <div class="field-row tags-row">
        <label class="field-label">タグ</label>
        <div class="tags-input-area">
          {#each tags as tag}
            <span class="tag-chip">
              {tag}
              <button class="tag-remove" onclick={() => removeTag(tag)} type="button" aria-label="{tag}を削除">×</button>
            </span>
          {/each}
          <input
            class="tag-input"
            type="text"
            bind:value={tagInput}
            placeholder="入力してEnter..."
            onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          />
        </div>
      </div>

      <!-- 説明 -->
      <div class="field-col">
        <label class="field-label" for="ed-desc">説明</label>
        <textarea
          id="ed-desc"
          class="desc-textarea {descError ? 'error' : ''}"
          bind:value={description}
          rows={5}
          placeholder="説明を入力..."
          maxlength={1000}
        ></textarea>
        {#if descError}
          <div class="field-error">{descError}</div>
        {/if}
        <div class="char-count">{description.length} / 1000</div>
      </div>
    </div>

    <!-- フッター -->
    <div class="dialog-footer">
      <!-- 左端: 削除（アイコン + テキスト、誤操作防止のため距離を置く） -->
      <button class="btn-delete" onclick={() => showDeleteConfirm = true} type="button" title="削除">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
        削除
      </button>
      <!-- 右端: キャンセル + 保存 -->
      <div class="footer-right">
        <button class="btn-cancel" onclick={onClose} type="button">キャンセル</button>
        <button class="btn-save" onclick={handleSave} type="button">保存</button>
      </div>
    </div>
  </div>
</div>

<!-- 削除確認サブダイアログ -->
{#if showDeleteConfirm}
  <div class="dialog-backdrop confirm-backdrop" role="dialog" aria-modal="true" aria-label="削除確認">
    <div class="confirm-dialog">
      <p class="confirm-title">アイテムを削除します</p>
      <p class="confirm-item-title">「{item.title}」</p>
      <p class="confirm-item-date">{formatItemDatetime(item)}</p>
      <p class="confirm-warning">この操作は取り消せません。</p>
      <div class="confirm-footer">
        <button class="btn-cancel" onclick={() => showDeleteConfirm = false} type="button">キャンセル</button>
        <button class="btn-delete" onclick={handleDeleteConfirm} type="button">削除</button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* ========== backdrop ========== */
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  /* ========== dialog ========== */
  .dialog {
    background: white;
    border-radius: 10px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0, 0, 0, 0.1);
    width: min(560px, calc(100vw - 32px));
    max-height: calc(100vh - 64px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: dialog-enter 0.12s ease-out;
  }

  @keyframes dialog-enter {
    from { opacity: 0; transform: translateY(-6px) scale(0.99); }
    to   { opacity: 1; transform: translateY(0)    scale(1); }
  }

  /* 種別アクセントバー */
  .accent-bar {
    height: 4px;
    background: var(--accent, #2196f3);
    flex-shrink: 0;
    transition: background 0.2s;
  }

  /* ========== ヘッダー ========== */
  .dialog-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 16px 12px;
    border-bottom: 1px solid #ebebeb;
  }

  .title-input {
    flex: 1;
    font-size: 17px;
    font-weight: 600;
    border: none;
    border-bottom: 2px solid #e0e0e0;
    outline: none;
    padding: 4px 0;
    background: transparent;
    transition: border-color 0.2s;
    color: #1a1a1a;
  }

  .title-input:focus {
    border-bottom-color: var(--accent, #2196f3);
  }

  .title-input.error {
    border-bottom-color: #d32f2f;
  }

  /* ========== 本体 ========== */
  .dialog-body {
    padding: 14px 16px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 11px;
  }

  .field-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .field-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field-label {
    font-size: 12px;
    color: #777;
    font-weight: 500;
    min-width: 48px;
    flex-shrink: 0;
  }

  /* input / select 共通フォーカスリング */
  .type-select,
  .date-input,
  .time-input {
    font-size: 13px;
    padding: 5px 8px;
    border: 1px solid #ddd;
    border-radius: 5px;
    background: white;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
    font-family: inherit;
  }

  .type-select:focus,
  .date-input:focus,
  .time-input:focus {
    outline: none;
    border-color: var(--accent, #2196f3);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, #2196f3) 18%, transparent);
  }

  .time-input {
    width: 90px;
  }

  /* ========== タグ ========== */
  .tags-row {
    align-items: flex-start;
  }

  .tags-input-area {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    border: 1px solid #ddd;
    border-radius: 5px;
    padding: 4px 6px;
    min-height: 34px;
    background: white;
    cursor: text;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .tags-input-area:focus-within {
    border-color: var(--accent, #2196f3);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, #2196f3) 18%, transparent);
  }

  .tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: color-mix(in srgb, var(--accent, #2196f3) 14%, white);
    color: color-mix(in srgb, var(--accent, #2196f3) 80%, #000);
    border-radius: 4px;
    font-size: 12px;
    padding: 2px 6px;
  }

  .tag-remove {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    padding: 0;
    display: flex;
    align-items: center;
    opacity: 0.65;
  }

  .tag-remove:hover {
    opacity: 1;
  }

  .tag-input {
    border: none;
    outline: none;
    font-size: 13px;
    flex: 1;
    min-width: 80px;
    background: transparent;
    font-family: inherit;
  }

  /* ========== 説明 ========== */
  .desc-textarea {
    width: 100%;
    box-sizing: border-box;
    font-size: 13px;
    padding: 7px 8px;
    border: 1px solid #ddd;
    border-radius: 5px;
    resize: vertical;
    font-family: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
    line-height: 1.5;
  }

  .desc-textarea:focus {
    outline: none;
    border-color: var(--accent, #2196f3);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, #2196f3) 18%, transparent);
  }

  .desc-textarea.error {
    border-color: #d32f2f;
  }

  .char-count {
    font-size: 11px;
    color: #aaa;
    text-align: right;
  }

  /* ========== バリデーションエラー ========== */
  .field-error {
    font-size: 12px;
    color: #d32f2f;
    margin-top: -4px;
  }

  /* ========== フッター ========== */
  .dialog-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 16px;
    border-top: 1px solid #ebebeb;
    background: #fafafa;
  }

  .footer-right {
    display: flex;
    gap: 8px;
  }

  /* 削除ボタン（左端・ゴーストスタイル） */
  .btn-delete {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 7px 13px;
    border: 1px solid #e0e0e0;
    border-radius: 5px;
    background: white;
    color: #999;
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }

  .btn-delete:hover {
    border-color: #d32f2f;
    color: #d32f2f;
    background: #fff5f5;
  }

  /* キャンセルボタン */
  .btn-cancel {
    padding: 7px 16px;
    border: 1px solid #ddd;
    border-radius: 5px;
    background: white;
    color: #555;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-cancel:hover {
    background: #f5f5f5;
  }

  /* 保存ボタン */
  .btn-save {
    padding: 7px 20px;
    border: none;
    border-radius: 5px;
    background: var(--accent, #2196f3);
    color: white;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: filter 0.15s;
  }

  .btn-save:hover {
    filter: brightness(1.1);
  }

  /* ========== 削除確認ダイアログ ========== */
  .confirm-backdrop {
    z-index: 1100;
    background: rgba(0, 0, 0, 0.3);
  }

  .confirm-dialog {
    background: white;
    border-radius: 10px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.22);
    padding: 24px;
    width: min(360px, calc(100vw - 32px));
    display: flex;
    flex-direction: column;
    gap: 8px;
    animation: dialog-enter 0.1s ease-out;
  }

  .confirm-title {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    color: #1a1a1a;
  }

  .confirm-item-title {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    margin: 0;
  }

  .confirm-item-date {
    font-size: 12px;
    color: #777;
    margin: 0;
  }

  .confirm-warning {
    font-size: 12px;
    color: #d32f2f;
    margin: 8px 0 0;
  }

  .confirm-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
  }

  .confirm-footer .btn-delete {
    background: #d32f2f;
    color: white;
    border-color: #d32f2f;
  }

  .confirm-footer .btn-delete:hover {
    background: #b71c1c;
    border-color: #b71c1c;
    color: white;
  }
</style>
