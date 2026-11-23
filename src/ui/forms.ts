import { App, Modal } from "obsidian";
import {
  NumberFormat,
  PROPERTY_TYPE_META,
  PropertyType,
} from "../types";
import { iconEl } from "./dom";

export interface NewPropertyResult {
  name: string;
  type: PropertyType;
  numberFormat: NumberFormat;
}

export class NewPropertyModal extends Modal {
  private readonly existingNames: string[];
  private resolvePromise: (value: NewPropertyResult | null) => void;
  private resolved = false;
  private result: NewPropertyResult | null = null;
  private selectedType: PropertyType = "text";
  private nameInput: HTMLInputElement;
  private formatSelect: HTMLSelectElement | null = null;
  private typeGrid: HTMLElement;

  constructor(app: App, existingNames: string[] = []) {
    super(app);
    this.existingNames = existingNames;
  }

  wait(): Promise<NewPropertyResult | null> {
    this.open();
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  onOpen(): void {
    this.modalEl.addClass("nt-modal", "nt-property-modal");
    this.titleEl.setText("新建属性");
    this.contentEl.empty();

    const nameField = this.contentEl.createDiv({ cls: "nt-form-field" });
    nameField.createDiv({ cls: "nt-field-label", text: "属性名称" });
    this.nameInput = nameField.createEl("input", {
      cls: "nt-text-input",
      type: "text",
      attr: { placeholder: "例如：截止日期", maxlength: "60" },
    });

    const typeField = this.contentEl.createDiv({ cls: "nt-form-field" });
    typeField.createDiv({ cls: "nt-field-label", text: "属性类型" });
    this.typeGrid = typeField.createDiv({ cls: "nt-type-grid" });
    for (const meta of PROPERTY_TYPE_META) {
      if (meta.type === "title") continue;
      const button = this.typeGrid.createEl("button", {
        cls: "nt-type-option",
        attr: { type: "button" },
      });
      button.setAttribute("aria-pressed", String(meta.type === this.selectedType));
      button.append(iconEl(meta.icon, "nt-type-option-icon"));
      const copy = button.createDiv({ cls: "nt-type-option-copy" });
      copy.createDiv({ cls: "nt-type-option-name", text: meta.label });
      copy.createDiv({ cls: "nt-type-option-desc", text: meta.description });
      button.addEventListener("click", () => {
        this.selectedType = meta.type;
        this.updateTypeSelection();
        this.updateFormatField();
      });
      this.typeGrid.append(button);
    }

    const numberField = this.contentEl.createDiv({ cls: "nt-form-field nt-number-format-field" });
    numberField.createDiv({ cls: "nt-field-label", text: "数字格式" });
    this.formatSelect = numberField.createEl("select", { cls: "nt-select" });
    this.formatSelect.createEl("option", { value: "number", text: "数字" });
    this.formatSelect.createEl("option", { value: "comma", text: "千分位" });
    this.formatSelect.createEl("option", { value: "percent", text: "百分比" });
    this.formatSelect.createEl("option", { value: "currency", text: "人民币" });
    numberField.addClass("is-hidden");

    const actions = this.contentEl.createDiv({ cls: "nt-modal-actions" });
    const cancel = actions.createEl("button", { cls: "nt-button", text: "取消" });
    cancel.addEventListener("click", () => this.close());
    const submit = actions.createEl("button", {
      cls: "nt-button nt-button-primary",
      text: "创建属性",
    });
    submit.addEventListener("click", () => this.submit());
    this.nameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.submit();
      }
    });
    this.updateTypeSelection();
    window.setTimeout(() => this.nameInput.focus(), 30);
  }

  private updateTypeSelection(): void {
    const buttons = Array.from(this.typeGrid.querySelectorAll<HTMLElement>(".nt-type-option"));
    buttons.forEach((button, index) => {
      const meta = PROPERTY_TYPE_META.filter((item) => item.type !== "title")[index];
      button.toggleClass("is-selected", meta.type === this.selectedType);
      button.setAttribute("aria-pressed", String(meta.type === this.selectedType));
    });
  }

  private updateFormatField(): void {
    const field = this.contentEl.querySelector<HTMLElement>(".nt-number-format-field");
    field?.toggleClass("is-hidden", this.selectedType !== "number");
  }

  private submit(): void {
    const name = this.nameInput.value.trim();
    if (!name) {
      this.nameInput.focus();
      this.nameInput.addClass("is-invalid");
      return;
    }
    if (this.existingNames.some((item) => item.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      this.nameInput.addClass("is-invalid");
      this.nameInput.focus();
      return;
    }
    this.result = {
      name,
      type: this.selectedType,
      numberFormat: (this.formatSelect?.value as NumberFormat) || "number",
    };
    this.close();
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.resolved) {
      this.resolved = true;
      this.resolvePromise?.(this.result);
    }
  }
}

export class HelpModal extends Modal {
  onOpen(): void {
    this.modalEl.addClass("nt-modal", "nt-help-modal");
    this.titleEl.setText("使用 One Database");
    this.contentEl.empty();
    const intro = this.contentEl.createEl("p", {
      cls: "nt-help-intro",
      text: "One Database 是一个以 Notion 数据库为灵感的 Obsidian 插件，支持表格、折线图和饼图视图。每个 .odata 文件都是一个数据库，数据以可读的 JSON 保存在仓库内。",
    });
    intro.setAttr("style", "margin-top:0");

    const sections: Array<[string, string[]]> = [
      [
        "基本操作",
        [
          "点击单元格即可编辑；Enter 保存，Esc 取消。",
          "点击表头可重命名、移动、隐藏或删除属性，也可以拖拽表头右边缘调整列宽。",
          "点击表格底部的「＋ 新建一行」添加记录；行标题右侧的按钮可打开任务详情页。",
          "左侧勾选框支持多选，选中后可批量删除。",
        ],
      ],
      [
        "视图",
        [
          "一个数据库可以有多个表格或图表视图。每个视图独立保存筛选、排序、搜索、分组、隐藏属性与计算方式。",
          "点击视图标签右侧的「＋」可以新建表格视图、折线图或饼图。",
          "双击视图标签可重命名，右键可复制或删除视图。",
          "筛选支持「满足全部 / 任一条件」；排序支持多个条件。",
        ],
      ],
      [
        "图表视图",
        [
          "图表使用按需引入的 ECharts 渲染，只包含折线图、饼图和必要组件。",
          "折线图：用「X 轴」选择分类，用「Y 轴」选择数字属性与聚合方式；还可以按单选、状态或复选框拆分多条线。",
          "饼图：用「X 轴」选择分类，用「Y 轴」选择数值或记录数，自动计算各分类占比。",
          "X 轴为日期时，可以在 X 轴菜单中选择按天、按月或按年聚合。",
          "图表与表格共用筛选和搜索；图表视图右上角的「…」可显示/隐藏图例、导出原始数据或转为表格视图。",
        ],
      ],
      [
        "数据与备份",
        [
          "数据库是纯文本 .odata 文件，可以直接被 Git、同步盘备份。",
          "右键数据库文件可导出当前视图为 CSV。",
          "不要同时打开同一个数据库的多个标签页编辑，以免后保存的版本覆盖先保存的版本。",
        ],
      ],
    ];

    for (const [title, lines] of sections) {
      const section = this.contentEl.createDiv({ cls: "nt-help-section" });
      section.createEl("h3", { text: title });
      const list = section.createEl("ul");
      for (const line of lines) list.createEl("li", { text: line });
    }

    const actions = this.contentEl.createDiv({ cls: "nt-modal-actions" });
    const close = actions.createEl("button", {
      cls: "nt-button nt-button-primary",
      text: "开始使用",
    });
    close.addEventListener("click", () => this.close());
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
