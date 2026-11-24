import { App, PluginSettingTab, Setting, TextComponent } from "obsidian";
import type NotionTablePlugin from "./main";

/** Number of table rows loaded per batch when the user has not changed the setting. */
export const DEFAULT_TABLE_PAGE_SIZE = 500;

export interface OneDatabaseSettings {
  /**
   * How many rows the table view loads per batch.
   * `null` means infinite scrolling is disabled and every row is rendered at once.
   */
  tablePageSize: number | null;
}

export const DEFAULT_SETTINGS: OneDatabaseSettings = {
  tablePageSize: DEFAULT_TABLE_PAGE_SIZE,
};

/**
 * Reads a value persisted in `data.json`. A missing property is handled by the
 * caller; an explicit `null` (or an empty string) means "load everything", while
 * an unusable value falls back to the default batch size.
 */
export function parseStoredTablePageSize(value: unknown): number | null {
  if (value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.max(1, Math.floor(value));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed);
    if (Number.isInteger(numeric) && numeric > 0) return numeric;
  }
  return DEFAULT_TABLE_PAGE_SIZE;
}

export class OneDatabaseSettingTab extends PluginSettingTab {
  plugin: NotionTablePlugin;
  private textComponent: TextComponent | null = null;
  private feedbackEl: HTMLElement | null = null;
  private commitTimer: number | null = null;
  private pendingRaw: string | null = null;

  constructor(app: App, plugin: NotionTablePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "One Database" });

    const setting = new Setting(containerEl)
      .setName("表格视图每次加载的数据量")
      .setDesc(
        "默认 500 条。表格视图会先渲染这么多数据，滚动到底部时自动加载下一批；把输入框清空（留空）则关闭无限滚动，一次性加载并渲染全部数据。",
      );

    setting.addText((text) => {
      this.textComponent = text;
      text.inputEl.type = "text";
      text.inputEl.inputMode = "numeric";
      text.inputEl.autocomplete = "off";
      text.inputEl.addClass("nt-settings-page-size");
      text.setPlaceholder(String(DEFAULT_TABLE_PAGE_SIZE));
      const current = this.plugin.settings.tablePageSize;
      text.setValue(current === null ? "" : String(current));
      text.onChange((value) => this.scheduleChange(value));
    });

    setting.addButton((button) => {
      button.setButtonText("恢复默认");
      button.onClick(() => {
        if (this.commitTimer !== null) {
          window.clearTimeout(this.commitTimer);
          this.commitTimer = null;
        }
        this.pendingRaw = null;
        this.textComponent?.setValue(String(DEFAULT_TABLE_PAGE_SIZE));
        void this.applyPageSize(String(DEFAULT_TABLE_PAGE_SIZE));
      });
    });

    this.feedbackEl = containerEl.createDiv({ cls: "nt-settings-feedback" });
    this.renderFeedback();
  }

  hide(): void {
    if (this.commitTimer !== null) {
      window.clearTimeout(this.commitTimer);
      this.commitTimer = null;
    }
    const pending = this.pendingRaw;
    this.pendingRaw = null;
    if (pending !== null) void this.applyPageSize(pending);
    super.hide();
  }

  private scheduleChange(raw: string): void {
    this.pendingRaw = raw;
    if (this.commitTimer !== null) {
      window.clearTimeout(this.commitTimer);
      this.commitTimer = null;
    }
    if (raw.trim() === "") {
      this.pendingRaw = null;
      void this.applyPageSize("");
      return;
    }
    this.commitTimer = window.setTimeout(() => {
      this.commitTimer = null;
      const pending = this.pendingRaw;
      this.pendingRaw = null;
      if (pending !== null) void this.applyPageSize(pending);
    }, 350);
  }

  private async applyPageSize(raw: string): Promise<void> {
    const trimmed = raw.trim();
    if (trimmed === "") {
      await this.plugin.updateTablePageSize(null);
      this.showFeedback("已关闭无限滚动：表格会一次性加载全部数据。", false);
      return;
    }
    if (!/^\d+$/.test(trimmed)) {
      this.showFeedback("请输入正整数；如需加载全部数据，请清空输入框。", true);
      return;
    }
    const size = Number(trimmed);
    if (!Number.isSafeInteger(size) || size <= 0) {
      this.showFeedback("每次加载的数据量必须是大于 0 的整数。", true);
      return;
    }
    if (size === this.plugin.settings.tablePageSize) {
      this.renderFeedback();
      return;
    }
    await this.plugin.updateTablePageSize(size);
    this.showFeedback(`已保存：表格每次加载 ${size} 条数据。`, false);
  }

  private renderFeedback(): void {
    const size = this.plugin.settings.tablePageSize;
    this.showFeedback(
      size === null ? "当前：留空，表格一次性加载全部数据。" : `当前：每次加载 ${size} 条数据。`,
      false,
    );
  }

  private showFeedback(text: string, isError: boolean): void {
    const el = this.feedbackEl;
    if (el) {
      el.setText(text);
      el.toggleClass("is-error", isError);
    }
    this.textComponent?.inputEl.toggleClass("is-invalid", isError);
  }
}
