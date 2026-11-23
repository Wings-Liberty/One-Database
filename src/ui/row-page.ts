import { App, Modal } from "obsidian";
import {
  cellText,
  formatTimestamp,
  getCell,
  isReadOnlyProperty,
  optionById,
  setCell,
  titleProperty,
  toDateInput,
  touchDatabase,
} from "../model";
import {
  CellValue,
  DatabaseData,
  DatabaseProperty,
  DatabaseRow,
  DateValue,
} from "../types";
import { confirmAction, h, iconEl } from "./dom";

export interface RowPageOptions {
  onMutate: () => void;
  onDelete: (row: DatabaseRow) => Promise<void> | void;
  onCloseRefresh: () => void;
}

export class RowPageModal extends Modal {
  private readonly db: DatabaseData;
  private readonly row: DatabaseRow;
  private readonly options: RowPageOptions;
  private titleInput: HTMLTextAreaElement;
  private readonly titleProp: DatabaseProperty;

  constructor(app: App, db: DatabaseData, row: DatabaseRow, options: RowPageOptions) {
    super(app);
    this.db = db;
    this.row = row;
    this.options = options;
    this.titleProp = titleProperty(db);
  }

  onOpen(): void {
    this.modalEl.addClass("nt-row-page-modal");
    this.titleEl.empty();
    this.contentEl.empty();
    this.contentEl.addClass("nt-row-page-content");

    const cover = this.contentEl.createDiv({ cls: "nt-row-page-cover" });
    const topbar = cover.createDiv({ cls: "nt-row-page-topbar" });
    const crumb = topbar.createDiv({ cls: "nt-row-page-crumb" });
    crumb.createSpan({ cls: "nt-row-page-crumb-icon", text: this.db.icon || "🗂️" });
    crumb.createSpan({ text: this.db.title });
    const closeButton = topbar.createEl("button", {
      cls: "nt-icon-button",
      attr: { type: "button", "aria-label": "关闭" },
    });
    closeButton.append(iconEl("x", "nt-icon"));
    closeButton.addEventListener("click", () => this.close());

    const head = this.contentEl.createDiv({ cls: "nt-row-page-head" });
    const iconField = head.createDiv({ cls: "nt-row-page-icon-field" });
    const iconInput = iconField.createEl("input", {
      cls: "nt-row-page-icon-input",
      type: "text",
      value: this.row.icon || "",
      attr: { placeholder: "＋", maxlength: "4", "aria-label": "页面图标" },
    });
    iconInput.addEventListener("input", () => {
      this.row.icon = iconInput.value.trim();
      this.row.updatedAt = Date.now();
      touchDatabase(this.db);
      this.options.onMutate();
    });

    this.titleInput = head.createEl("textarea", {
      cls: "nt-row-page-title",
      attr: { rows: "1", placeholder: "未命名", "aria-label": "标题" },
    });
    this.titleInput.value = this.titleText();
    this.autoGrow(this.titleInput);
    this.titleInput.addEventListener("input", () => {
      this.autoGrow(this.titleInput);
      setCell(this.row, this.titleProp, this.titleInput.value);
      this.options.onMutate();
    });
    this.titleInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        this.titleInput.blur();
      }
    });
    this.titleInput.addEventListener("blur", () => {
      // Keep a stable, trimmed title without surprising the user while typing.
      const trimmed = this.titleInput.value.trim();
      if (trimmed !== this.titleInput.value) {
        this.titleInput.value = trimmed;
        this.autoGrow(this.titleInput);
        setCell(this.row, this.titleProp, trimmed);
        this.options.onMutate();
      }
    });

    const meta = this.contentEl.createDiv({ cls: "nt-row-page-meta" });
    meta.createSpan({ text: `创建于 ${formatTimestamp(this.row.createdAt)}` });
    meta.createSpan({ cls: "nt-row-page-meta-sep", text: "·" });
    meta.createSpan({ text: `最后编辑 ${formatTimestamp(this.row.updatedAt)}` });

    const properties = this.contentEl.createDiv({ cls: "nt-row-page-properties" });
    for (const property of this.db.properties) {
      if (property.type === "title") continue;
      this.renderProperty(properties, property);
    }

    const contentSection = this.contentEl.createDiv({ cls: "nt-row-page-body" });
    contentSection.createDiv({ cls: "nt-row-page-section-title", text: "页面内容" });
    const textarea = contentSection.createEl("textarea", {
      cls: "nt-row-page-textarea",
      attr: {
        placeholder: "写点什么…（纯文本，随数据库文件一起保存）",
        rows: "8",
      },
    });
    textarea.value = this.row.content || "";
    textarea.addEventListener("input", () => {
      this.row.content = textarea.value;
      this.row.updatedAt = Date.now();
      touchDatabase(this.db);
      this.options.onMutate();
    });

    const footer = this.contentEl.createDiv({ cls: "nt-row-page-footer" });
    const deleteButton = footer.createEl("button", {
      cls: "nt-button nt-button-danger-ghost",
    });
    deleteButton.append(iconEl("trash-2", "nt-button-icon"));
    deleteButton.createSpan({ text: "删除这一行" });
    deleteButton.addEventListener("click", async () => {
      const confirmed = await confirmAction(
        this.app,
        "删除记录",
        `确定要删除「${this.titleText() || "未命名"}」吗？此操作无法撤销。`,
        { confirmLabel: "删除记录" },
      );
      if (!confirmed) return;
      await this.options.onDelete(this.row);
      this.close();
    });

    const closeFooter = footer.createEl("button", {
      cls: "nt-button nt-button-primary",
      text: "完成",
    });
    closeFooter.addEventListener("click", () => this.close());
  }

  private titleText(): string {
    return String(getCell(this.row, this.titleProp) ?? "");
  }

  private renderProperty(container: HTMLElement, property: DatabaseProperty): void {
    const row = container.createDiv({ cls: "nt-row-page-property" });
    const label = row.createDiv({ cls: "nt-row-page-property-label" });
    label.append(iconEl("chevron-right", "nt-property-collapse"));
    label.append(iconEl(this.propertyIcon(property), "nt-property-type-icon"));
    label.createSpan({ text: property.name });

    const value = row.createDiv({ cls: "nt-row-page-property-value" });
    if (isReadOnlyProperty(property)) {
      const text =
        property.type === "created_time"
          ? formatTimestamp(this.row.createdAt, true)
          : formatTimestamp(this.row.updatedAt, true);
      value.createSpan({ cls: "nt-muted", text });
      return;
    }

    switch (property.type) {
      case "text":
      case "url":
      case "email":
        this.renderTextProperty(value, property);
        break;
      case "number":
        this.renderNumberProperty(value, property);
        break;
      case "select":
      case "status":
        this.renderSingleSelectProperty(value, property);
        break;
      case "multi_select":
        this.renderMultiSelectProperty(value, property);
        break;
      case "date":
        this.renderDateProperty(value, property);
        break;
      case "checkbox":
        this.renderCheckboxProperty(value, property);
        break;
      default:
        value.createSpan({ cls: "nt-muted", text: cellText(this.row, property) });
    }
  }

  private renderTextProperty(container: HTMLElement, property: DatabaseProperty): void {
    const input = container.createEl("input", {
      cls: "nt-text-input nt-row-page-input",
      type: property.type === "email" ? "email" : "text",
      value: String(getCell(this.row, property) ?? ""),
      attr: { placeholder: "空" },
    });
    if (property.type === "url") {
      const open = container.createEl("button", {
        cls: "nt-icon-button nt-inline-icon-button",
        attr: { type: "button", "aria-label": "打开链接" },
      });
      open.append(iconEl("external-link", "nt-icon"));
      open.addEventListener("click", () => {
        const url = String(getCell(this.row, property) ?? "").trim();
        if (url) window.open(url, "_blank");
      });
    }
    input.addEventListener("input", () => {
      setCell(this.row, property, input.value);
      this.options.onMutate();
    });
  }

  private renderNumberProperty(container: HTMLElement, property: DatabaseProperty): void {
    const input = container.createEl("input", {
      cls: "nt-text-input nt-row-page-input",
      type: "number",
      value:
        getCell(this.row, property) === null || getCell(this.row, property) === undefined
          ? ""
          : String(getCell(this.row, property)),
      attr: { placeholder: "空", step: "any" },
    });
    input.addEventListener("input", () => {
      const value = input.value.trim();
      setCell(this.row, property, value === "" ? null : Number(value));
      this.options.onMutate();
    });
  }

  private renderSingleSelectProperty(container: HTMLElement, property: DatabaseProperty): void {
    const wrap = container.createDiv({ cls: "nt-field-options" });
    for (const option of property.options || []) {
      const selected = getCell(this.row, property) === option.id;
      const pill = wrap.createEl("button", {
        cls: `nt-option-chip nt-color-${option.color}${selected ? " is-selected" : ""}`,
        attr: { type: "button" },
      });
      pill.createSpan({ cls: "nt-option-dot" });
      pill.createSpan({ text: option.name });
      pill.addEventListener("click", () => {
        setCell(this.row, property, selected ? null : option.id);
        this.options.onMutate();
        this.refreshProperties();
      });
    }
    if (!property.options?.length) {
      container.createSpan({ cls: "nt-muted", text: "在表格中点击单元格即可创建选项" });
    }
  }

  private renderMultiSelectProperty(container: HTMLElement, property: DatabaseProperty): void {
    const wrap = container.createDiv({ cls: "nt-field-options" });
    const selectedIds = Array.isArray(getCell(this.row, property))
      ? (getCell(this.row, property) as string[])
      : [];
    for (const option of property.options || []) {
      const selected = selectedIds.includes(option.id);
      const pill = wrap.createEl("button", {
        cls: `nt-option-chip nt-color-${option.color}${selected ? " is-selected" : ""}`,
        attr: { type: "button" },
      });
      pill.createSpan({ cls: "nt-option-dot" });
      pill.createSpan({ text: option.name });
      pill.addEventListener("click", () => {
        const now = Array.isArray(getCell(this.row, property))
          ? [...(getCell(this.row, property) as string[])]
          : [];
        const index = now.indexOf(option.id);
        if (index >= 0) now.splice(index, 1);
        else now.push(option.id);
        setCell(this.row, property, now);
        this.options.onMutate();
        this.refreshProperties();
      });
    }
    if (!property.options?.length) {
      container.createSpan({ cls: "nt-muted", text: "在表格中点击单元格即可创建选项" });
    }
  }

  private renderDateProperty(container: HTMLElement, property: DatabaseProperty): void {
    const value = (getCell(this.row, property) as DateValue) || null;
    const wrap = container.createDiv({ cls: "nt-date-range-fields" });
    const start = wrap.createEl("input", {
      cls: "nt-text-input nt-date-input",
      type: "date",
      value: value?.start ? value.start.slice(0, 10) : "",
    });
    const end = wrap.createEl("input", {
      cls: "nt-text-input nt-date-input",
      type: "date",
      value: value?.end ? value.end.slice(0, 10) : "",
      attr: { title: "结束日期（可选）" },
    });
    const update = () => {
      if (!start.value) {
        setCell(this.row, property, null);
      } else {
        const next: DateValue = { start: start.value };
        if (end.value) next.end = end.value;
        setCell(this.row, property, next);
      }
      this.options.onMutate();
    };
    start.addEventListener("change", update);
    end.addEventListener("change", update);
    const clear = wrap.createEl("button", {
      cls: "nt-icon-button",
      attr: { type: "button", "aria-label": "清除日期" },
    });
    clear.append(iconEl("x", "nt-icon"));
    clear.addEventListener("click", () => {
      start.value = "";
      end.value = "";
      setCell(this.row, property, null);
      this.options.onMutate();
    });
    const today = wrap.createEl("button", {
      cls: "nt-button nt-button-quiet",
      text: "今天",
    });
    today.addEventListener("click", () => {
      start.value = toDateInput(new Date());
      update();
    });
  }

  private renderCheckboxProperty(container: HTMLElement, property: DatabaseProperty): void {
    const checked = getCell(this.row, property) === true;
    const toggle = container.createEl("button", {
      cls: `nt-checkbox nt-row-page-checkbox${checked ? " is-checked" : ""}`,
      attr: {
        type: "button",
        role: "checkbox",
        "aria-checked": String(checked),
        "aria-label": property.name,
      },
    });
    toggle.append(iconEl("check", "nt-check-icon"));
    toggle.createSpan({ text: checked ? "已完成" : "未完成" });
    toggle.addEventListener("click", () => {
      setCell(this.row, property, !checked);
      this.options.onMutate();
      this.refreshProperties();
    });
  }

  private refreshProperties(): void {
    // Rebuilding the whole modal keeps the interaction model simple and
    // guarantees that multi-select and status fields stay in sync.
    const scrollTop = this.contentEl.scrollTop;
    this.onOpen();
    this.contentEl.scrollTop = scrollTop;
  }

  private propertyIcon(property: DatabaseProperty): string {
    switch (property.type) {
      case "number":
        return "hash";
      case "select":
        return "chevron-down";
      case "multi_select":
        return "tags";
      case "status":
        return "circle-dot";
      case "date":
        return "calendar-days";
      case "checkbox":
        return "square-check";
      case "url":
        return "link";
      case "email":
        return "mail";
      case "created_time":
        return "clock";
      case "last_edited_time":
        return "history";
      default:
        return "align-left";
    }
  }

  private autoGrow(textarea: HTMLTextAreaElement): void {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(180, Math.max(48, textarea.scrollHeight))}px`;
  }

  onClose(): void {
    this.contentEl.empty();
    this.options.onCloseRefresh();
  }
}
