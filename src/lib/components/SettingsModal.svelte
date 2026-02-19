<script lang="ts">
/**
 * SettingsModal - カレンダー設定モーダル
 */

interface Props {
  minorTick: number;
  startHour: number;
  endHour: number;
  showWeekend?: boolean;
  showAllDay?: boolean;
  defaultColorOpacity?: number;
  weekStartsOn?: number;
  onClose: () => void;
  onChange: (settings: {
    minorTick: number;
    startHour: number;
    endHour: number;
    showWeekend: boolean;
    showAllDay: boolean;
    defaultColorOpacity: number;
    weekStartsOn: number;
  }) => void;
}

let {
  minorTick = $bindable(),
  startHour = $bindable(),
  endHour = $bindable(),
  showWeekend = $bindable(),
  showAllDay = $bindable(),
  defaultColorOpacity = 0.5,
  weekStartsOn = 1,
  onClose,
  onChange,
}: Props = $props();

// ローカル状態
let localMinorTick = $state(minorTick);
let localStartHour = $state(startHour);
let localEndHour = $state(endHour);
let localShowWeekend = $state(showWeekend);
let localShowAllDay = $state(showAllDay);
let localDefaultColorOpacity = $state(defaultColorOpacity);
let localWeekStartsOn = $state(weekStartsOn);

// 前回の有効な値を保持
let lastValidMinorTick = $state(minorTick);
let lastValidStartHour = $state(startHour);
let lastValidEndHour = $state(endHour);

// バリデーション
function validateMinorTick(value: number): boolean {
  return value > 0 && value <= 60 && 60 % value === 0;
}

function validateHour(value: number): boolean {
  return value >= 0 && value <= 24 && Number.isInteger(value);
}

function validateHourRange(start: number, end: number): boolean {
  return start < end;
}

// フォーカスが外れたときの処理
function handleMinorTickBlur() {
  if (!validateMinorTick(localMinorTick)) {
    localMinorTick = lastValidMinorTick;
    return;
  }
  lastValidMinorTick = localMinorTick;
  applySettings();
}

function handleStartHourBlur() {
  if (!validateHour(localStartHour) || !validateHourRange(localStartHour, localEndHour)) {
    localStartHour = lastValidStartHour;
    return;
  }
  lastValidStartHour = localStartHour;
  applySettings();
}

function handleEndHourBlur() {
  if (!validateHour(localEndHour) || !validateHourRange(localStartHour, localEndHour)) {
    localEndHour = lastValidEndHour;
    return;
  }
  lastValidEndHour = localEndHour;
  applySettings();
}

function handleToggleChange() {
  applySettings();
}

// 設定を適用
function applySettings() {
  onChange({
    minorTick: localMinorTick,
    startHour: localStartHour,
    endHour: localEndHour,
    showWeekend: localShowWeekend,
    showAllDay: localShowAllDay,
    defaultColorOpacity: localDefaultColorOpacity,
    weekStartsOn: localWeekStartsOn,
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
      <h2>カレンダー設定</h2>
      <button class="close-button" onclick={onClose}>×</button>
    </div>
    
    <div class="modal-body">
      <div class="setting-item">
        <label for="minorTick">移動単位（分）</label>
        <input
          id="minorTick"
          type="number"
          bind:value={localMinorTick}
          onblur={handleMinorTickBlur}
          min="1"
          max="60"
          step="1"
        />
        <span class="hint">60の約数である必要があります（例: 1, 5, 10, 15, 30, 60）</span>
      </div>
      
      <div class="setting-item">
        <label for="startHour">開始時刻（時）</label>
        <input
          id="startHour"
          type="number"
          bind:value={localStartHour}
          onblur={handleStartHourBlur}
          min="0"
          max="23"
          step="1"
        />
      </div>
      
      <div class="setting-item">
        <label for="endHour">終了時刻（時）</label>
        <input
          id="endHour"
          type="number"
          bind:value={localEndHour}
          onblur={handleEndHourBlur}
          min="1"
          max="24"
          step="1"
        />
        <span class="hint">開始時刻より大きい必要があります</span>
      </div>
      
      <div class="setting-item">
        <label>
          <input
            type="checkbox"
            bind:checked={localShowWeekend}
            onchange={handleToggleChange}
          />
          土日を表示
        </label>
      </div>
      
      <div class="setting-item">
        <label>
          <input
            type="checkbox"
            bind:checked={localShowAllDay}
            onchange={handleToggleChange}
          />
          終日予定を表示
        </label>
      </div>
      
      <div class="setting-item">
        <label for="defaultColorOpacity">
          アイテムのデフォルト透明度
        </label>
        <div style="display: flex; align-items: center; gap: 12px;">
          <input
            id="defaultColorOpacity"
            type="range"
            min="0"
            max="1"
            step="0.05"
            bind:value={localDefaultColorOpacity}
            onchange={handleToggleChange}
            style="flex: 1;"
          />
          <span style="min-width: 50px;">{Math.round(localDefaultColorOpacity * 100)}%</span>
        </div>
      </div>
      
      <div class="setting-item">
        <label for="weekStartsOn">
          週の開始曜日
        </label>
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
    max-width: 500px;
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
  }

  .setting-item input[type="number"]:focus {
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
