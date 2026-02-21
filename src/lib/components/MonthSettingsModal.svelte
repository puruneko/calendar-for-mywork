<script lang="ts">
/**
 * MonthSettingsModal - 月表示カレンダー設定モーダル
 */

interface Props {
  maxItemsPerDay: number;
  weekStartsOn: number;
  showWeekend: boolean;
  showAllDay: boolean;
  onClose: () => void;
  onChange: (settings: {
    maxItemsPerDay: number;
    weekStartsOn: number;
    showWeekend: boolean;
    showAllDay: boolean;
  }) => void;
}

let {
  maxItemsPerDay = $bindable(6),
  weekStartsOn = $bindable(1),
  showWeekend = $bindable(true),
  showAllDay = $bindable(true),
  onClose,
  onChange,
}: Props = $props();

// ローカル状態
let localMaxItemsPerDay = $state(maxItemsPerDay);
let localWeekStartsOn = $state(weekStartsOn);
let localShowWeekend = $state(showWeekend);
let localShowAllDay = $state(showAllDay);

// 前回の有効な値を保持
let lastValidMaxItemsPerDay = $state(maxItemsPerDay);

// バリデーション
function validateMaxItemsPerDay(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 20;
}

// フォーカスが外れたときの処理
function handleMaxItemsPerDayBlur() {
  if (!validateMaxItemsPerDay(localMaxItemsPerDay)) {
    localMaxItemsPerDay = lastValidMaxItemsPerDay;
    return;
  }
  lastValidMaxItemsPerDay = localMaxItemsPerDay;
  applySettings();
}

function handleToggleChange() {
  applySettings();
}

// 設定を適用
function applySettings() {
  onChange({
    maxItemsPerDay: localMaxItemsPerDay,
    weekStartsOn: localWeekStartsOn,
    showWeekend: localShowWeekend,
    showAllDay: localShowAllDay,
  });
}

// モーダル外クリックで閉じる
function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    onClose();
  }
}
</script>

<div class="modal-backdrop" onclick={handleBackdropClick}>
  <div class="modal-content">
    <div class="modal-header">
      <h2>月表示の設定</h2>
      <button class="close-button" onclick={onClose}>×</button>
    </div>

    <div class="modal-body">
      <!-- 1日の最大表示件数 -->
      <div class="setting-item">
        <label for="maxItemsPerDay">1日の最大表示件数</label>
        <input
          id="maxItemsPerDay"
          type="number"
          bind:value={localMaxItemsPerDay}
          onblur={handleMaxItemsPerDayBlur}
          min="1"
          max="20"
          step="1"
        />
        <span class="hint">1〜20の整数（超えた分は展開パネルに表示）</span>
      </div>

      <!-- 週の始まり曜日 -->
      <div class="setting-item">
        <label for="weekStartsOn">週の始まり曜日</label>
        <select
          id="weekStartsOn"
          bind:value={localWeekStartsOn}
          onchange={handleToggleChange}
        >
          <option value={1}>月曜日</option>
          <option value={2}>火曜日</option>
          <option value={3}>水曜日</option>
          <option value={4}>木曜日</option>
          <option value={5}>金曜日</option>
          <option value={6}>土曜日</option>
          <option value={7}>日曜日</option>
        </select>
      </div>

      <!-- 土日の表示/非表示 -->
      <div class="setting-item">
        <label>
          <input
            type="checkbox"
            bind:checked={localShowWeekend}
            onchange={handleToggleChange}
          />
          土日を表示する
        </label>
      </div>

      <!-- 終日タスクの表示/非表示 -->
      <div class="setting-item">
        <label>
          <input
            type="checkbox"
            bind:checked={localShowAllDay}
            onchange={handleToggleChange}
          />
          終日タスクを表示する
        </label>
      </div>
    </div>

    <div class="modal-footer">
      <button class="button" onclick={onClose}>閉じる</button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    width: 90%;
    max-width: 460px;
    max-height: 80vh;
    overflow: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    border-bottom: 1px solid #e0e0e0;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 32px;
    line-height: 1;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 32px;
    height: 32px;
  }

  .close-button:hover {
    color: #333;
  }

  .modal-body {
    padding: 24px;
  }

  .setting-item {
    margin-bottom: 20px;
  }

  .setting-item:last-child {
    margin-bottom: 0;
  }

  .setting-item label {
    display: block;
    font-weight: 500;
    margin-bottom: 8px;
    color: #333;
  }

  .setting-item input[type="number"] {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    box-sizing: border-box;
  }

  .setting-item input[type="number"]:focus {
    outline: none;
    border-color: #2196f3;
  }

  .setting-item select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    box-sizing: border-box;
    background: white;
  }

  .setting-item select:focus {
    outline: none;
    border-color: #2196f3;
  }

  .setting-item input[type="checkbox"] {
    margin-right: 8px;
  }

  .setting-item .hint {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: #666;
  }

  .modal-footer {
    padding: 16px 24px;
    border-top: 1px solid #e0e0e0;
    display: flex;
    justify-content: flex-end;
  }

  .button {
    padding: 8px 16px;
    background: #2196f3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }

  .button:hover {
    background: #1976d2;
  }
</style>
