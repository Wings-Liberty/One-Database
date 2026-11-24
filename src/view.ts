import { TextFileView, WorkspaceLeaf, setIcon, TFile } from "obsidian";
import type NotionTablePlugin from "./main";
import {
  activeView,
  calculate,
  calculationLabel,
  calculationOptions,
  cellText,
  createChartView,
  createRow,
  createView,
  csvForView,
  dateKey,
  deepClone,
  defaultFilter,
  duplicateRow,
  ensureOption,
  filteredRows,
  filterOperators,
  filterValueForProperty,
  formatDateValue,
  formatNumber,
  formatTimestamp,
  getCell,
  groupRows,
  isCellEmpty,
  isDateOverdue,
  isReadOnlyProperty,
  normalizeDatabase,
  operatorNeedsValue,
  optionById,
  pad2,
  parseDatabaseJson,
  propertyById,
  RowGroup,
  serializeDatabase,
  setCell,
  titleProperty,
  toDateInput,
  todayInput,
  touchDatabase,
  uid,
  visibleProperties,
} from "./model";
import {
  CHART_AGGREGATION_LABELS,
  CHART_DATE_GRAIN_LABELS,
  CHART_KIND_LABELS,
  CellValue,
  ChartAggregation,
  ChartDateGrain,
  ChartKind,
  DatabaseData,
  DatabaseProperty,
  DatabaseRow,
  DateValue,
  FILE_EXTENSION,
  FilterOperator,
  FilterRule,
  SELECT_COLORS,
  SortRule,
  VIEW_TYPE,
  ViewConfig,
} from "./types";
import { ChartData, buildChartData, formatChartValue } from "./chart-model";
import {
  ChartInstance,
  createChart,
  disposeChart,
  isDarkTheme,
} from "./ui/chart-render";
import {
  Popover,
  buttonEl,
  clear,
  closeActivePopover,
  colorClass,
  confirmAction,
  debounce,
  downloadTextFile,
  h,
  iconEl,
  notify,
  openPopover,
  promptText,
  sanitizeFilename,
} from "./ui/dom";
import { HelpModal, NewPropertyModal } from "./ui/forms";
import { RowPageModal } from "./ui/row-page";

const EMOJI_CHOICES = [
  "🗂️",
  "🚀",
  "📌",
  "📚",
  "🧭",
  "🎯",
  "💡",
  "🧪",
  "🛠️",
  "📝",
  "📊",
  "🗓️",
  "✅",
  "🌱",
  "🔥",
  "⭐",
  "🧩",
  "🎨",
  "💼",
  "🏠",
  "🍀",
  "☕",
  "🌊",
  "🪐",
];

const TABLE_ROW_CHUNK = 80;
/** How close to the bottom the table must be before the next batch is loaded. */
const TABLE_SCROLL_LOAD_THRESHOLD = 320;

type TableRenderEntry =
  | { kind: "group"; group: RowGroup; collapsed: boolean }
  | { kind: "row"; row: DatabaseRow };

interface TableRenderOptions {
  afterRender?: () => void;
  reuseRows?: boolean;
  /** Include this row in the initial window, even if it is past the current batch. */
  ensureRowId?: string;
  /** Start over from the first batch instead of keeping the previously loaded range. */
  resetWindow?: boolean;
}

interface ActiveEditor {
  td: HTMLElement;
  row: DatabaseRow;
  property: DatabaseProperty;
  input: HTMLInputElement;
  original: string;
  done: boolean;
}

export class NotionTableView extends TextFileView {
  plugin: NotionTablePlugin;
  private db: DatabaseData | null = null;
  private loadError = "";
  private serializedCache: string | null = null;
  private rootEl: HTMLElement | null = null;
  private tableHostEl: HTMLElement | null = null;
  private tableScrollEl: HTMLElement | null = null;
  private tableEl: HTMLTableElement | null = null;
  private tableCountEl: HTMLElement | null = null;
  private filterButton: HTMLButtonElement | null = null;
  private sortButton: HTMLButtonElement | null = null;
  private groupButton: HTMLButtonElement | null = null;
  private propertyButton: HTMLButtonElement | null = null;
  private titleInput: HTMLTextAreaElement | null = null;
  private iconButton: HTMLButtonElement | null = null;
  private activeEditor: ActiveEditor | null = null;
  private currentRows: DatabaseRow[] = [];
  private rowsById = new Map<string, DatabaseRow>();
  private propertiesById = new Map<string, DatabaseProperty>();
  private rowDoneCache = new Map<string, boolean>();
  private rowEls = new Map<string, HTMLTableRowElement>();
  private tableColEls = new Map<string, HTMLTableColElement>();
  private rovingTabEl: HTMLElement | null = null;
  private poolSignature: string | null = null;
  private calcValueEls = new Map<string, HTMLElement>();
  private bulkBarEl: HTMLElement | null = null;
  private bulkCountEl: HTMLElement | null = null;
  private selectAllEl: HTMLInputElement | null = null;
  private tableRenderToken = 0;
  private tableQuerySignatureCache = "";
  private tableLoadedCount = 0;
  private tableLoadedRowCount = 0;
  private selectedRows = new Set<string>();
  private searchTimer: number | null = null;
  private saveTimer: number | null = null;
  private dirty = false;
  private chartInstance: ChartInstance | null = null;
  private chartResizeObserver: ResizeObserver | null = null;
  private chartRenderToken = 0;
  private themeObserver: MutationObserver | null = null;
  private themeMode = "";
  private chartTypeButton: HTMLButtonElement | null = null;
  private chartXButton: HTMLButtonElement | null = null;
  private chartYButton: HTMLButtonElement | null = null;
  private chartGroupButton: HTMLButtonElement | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: NotionTablePlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.db?.title || this.file?.basename || "One Database";
  }

  getIcon(): string {
    return "table-2";
  }

  canAcceptExtension(extension: string): boolean {
    return extension === FILE_EXTENSION;
  }

  async onOpen(): Promise<void> {
    await super.onOpen();
    this.contentEl.addClass("nt-view");
    this.contentEl.empty();
    this.setupThemeObserver();
    this.renderLoading();
  }

  async onClose(): Promise<void> {
    this.tableRenderToken += 1;
    closeActivePopover();
    if (this.searchTimer !== null) window.clearTimeout(this.searchTimer);
    this.teardownChart();
    this.themeObserver?.disconnect();
    this.themeObserver = null;
    await this.flushToDisk();
    await super.onClose();
  }

  private setupThemeObserver(): void {
    this.themeMode = isDarkTheme() ? "dark" : "light";
    if (this.themeObserver) return;
    this.themeObserver = new MutationObserver(() => {
      const mode = isDarkTheme() ? "dark" : "light";
      if (mode === this.themeMode) return;
      this.themeMode = mode;
      if (this.activeView?.type === "chart") this.renderChartView();
    });
    this.themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  async onUnloadFile(file: TFile): Promise<void> {
    await this.flushToDisk();
    await super.onUnloadFile(file);
  }

  async save(clear?: boolean): Promise<void> {
    await super.save(clear);
    this.dirty = false;
  }

  private async flushToDisk(): Promise<void> {
    if (!this.db || !this.file || !this.dirty) return;
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    const serialized = this.serializedData();
    this.data = serialized;
    try {
      await this.app.vault.modify(this.file, serialized);
      this.dirty = false;
    } catch (error) {
      console.error("One Database: could not flush database to disk", error);
    }
  }

  private serializedData(): string {
    if (!this.db) return this.data || "";
    if (this.serializedCache === null) {
      this.serializedCache = serializeDatabase(this.db);
    }
    return this.serializedCache;
  }

  clear(): void {
    this.db = null;
    this.loadError = "";
    this.data = "";
    this.serializedCache = null;
    this.dirty = false;
    this.selectedRows.clear();
    this.currentRows = [];
    this.rowsById.clear();
    this.propertiesById.clear();
    this.rowDoneCache.clear();
    this.rowEls.clear();
    this.rovingTabEl = null;
    this.poolSignature = null;
    this.tableColEls.clear();
    this.calcValueEls.clear();
    this.tableQuerySignatureCache = "";
    this.tableLoadedCount = 0;
    this.tableLoadedRowCount = 0;
  }

  setViewData(data: string, _clear: boolean): void {
    this.data = data;
    this.serializedCache = null;
    this.dirty = false;
    try {
      this.db = parseDatabaseJson(data);
      this.loadError = "";
      this.tableLoadedCount = 0;
      this.tableLoadedRowCount = 0;
      this.tableQuerySignatureCache = "";
      this.renderAll();
    } catch (error) {
      console.error("One Database: could not parse database", error);
      this.db = null;
      this.loadError = error instanceof Error ? error.message : String(error);
      this.renderError();
    }
  }

  getViewData(): string {
    if (!this.db) return this.data || "";
    this.data = this.serializedData();
    return this.data;
  }

  private get activeView(): ViewConfig | null {
    return this.db ? activeView(this.db) : null;
  }

  private persist(): void {
    if (!this.db) return;
    this.dirty = true;
    this.serializedCache = null;
    touchDatabase(this.db);
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      this.requestSave();
    }, 250);
    this.refreshTabTitle();
  }

  private persistNow(): void {
    if (!this.db) return;
    this.dirty = true;
    this.serializedCache = null;
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.requestSave();
    this.refreshTabTitle();
  }

  private refreshTabTitle(): void {
    try {
      (this.leaf as unknown as { updateHeader?: () => void }).updateHeader?.();
    } catch {
      // Obsidian's internal header API is not public; ignore if unavailable.
    }
  }

  private renderLoading(): void {
    const root = h("div", "nt-page nt-loading-page");
    const loading = root.createDiv({ cls: "nt-loading" });
    loading.createDiv({ cls: "nt-loading-spinner" });
    loading.createDiv({ cls: "nt-loading-text", text: "正在打开数据库…" });
    this.contentEl.append(root);
    this.rootEl = root;
  }

  private renderError(): void {
    closeActivePopover();
    this.contentEl.empty();
    this.contentEl.addClass("nt-view");
    const page = h("div", "nt-page nt-error-page");
    this.contentEl.append(page);
    const panel = page.createDiv({ cls: "nt-error-panel" });
    const icon = panel.createDiv({ cls: "nt-error-icon" });
    icon.append(iconEl("triangle-alert", "nt-icon"));
    panel.createEl("h2", { text: "无法读取这个数据库" });
    panel.createEl("p", {
      cls: "nt-error-message",
      text: this.loadError || "文件内容不是有效的 One Database 数据。",
    });
    panel.createEl("p", {
      cls: "nt-muted",
      text: "你可以修正下方内容后重试。数据库文件是纯文本 JSON，建议先备份。",
    });
    const textarea = panel.createEl("textarea", {
      cls: "nt-error-source",
      attr: { spellcheck: "false", "aria-label": "数据库源文件" },
    });
    textarea.value = this.data || "";
    const actions = panel.createDiv({ cls: "nt-error-actions" });
    const retry = actions.createEl("button", {
      cls: "nt-button nt-button-primary",
      text: "保存并重试",
    });
    retry.addEventListener("click", () => {
      try {
        const parsed = parseDatabaseJson(textarea.value);
        this.db = parsed;
        this.loadError = "";
        this.serializedCache = null;
        this.requestSave();
        this.renderAll();
        notify("数据库已修复并重新加载");
      } catch (error) {
        this.loadError = error instanceof Error ? error.message : String(error);
        this.renderError();
      }
    });
    const reload = actions.createEl("button", {
      cls: "nt-button",
      text: "从文件重新加载",
    });
    reload.addEventListener("click", async () => {
      if (!this.file) return;
      try {
        const text = await this.app.vault.read(this.file);
        this.setViewData(text, false);
      } catch (error) {
        this.loadError = error instanceof Error ? error.message : String(error);
        this.renderError();
      }
    });
    const help = actions.createEl("button", {
      cls: "nt-button nt-button-quiet",
      text: "使用帮助",
    });
    help.addEventListener("click", () => new HelpModal(this.app).open());
    this.rootEl = page;
  }

  private renderAll(): void {
    closeActivePopover();
    this.closeEditor(false);
    this.teardownChart();
    this.contentEl.empty();
    this.contentEl.addClass("nt-view");
    if (!this.db) {
      this.renderError();
      return;
    }
    const page = h("div", "nt-page");
    this.contentEl.append(page);
    this.rootEl = page;
    this.renderPageHeader(page);
    this.renderTabs(page);
    this.renderToolbar(page);
    const bodyArea = h("div", "nt-table-area");
    page.append(bodyArea);
    this.tableHostEl = bodyArea;
    this.renderViewBody();
  }

  private renderViewBody(): void {
    if (!this.activeView) return;
    if (this.activeView.type === "chart") this.renderChartView();
    else this.renderTable();
  }

  private renderBodyPreserveScroll(): void {
    if (this.activeView?.type === "chart") {
      this.renderChartView();
      return;
    }
    this.renderTablePreserveScroll();
  }

  private renderPageHeader(page: HTMLElement): void {
    const db = this.db!;
    const headerWrap = page.createDiv({ cls: "nt-page-header-wrap" });
    const header = headerWrap.createDiv({ cls: "nt-page-header" });

    const topLine = header.createDiv({ cls: "nt-page-topline" });
    const typeLabel = topLine.createDiv({ cls: "nt-database-label" });
    typeLabel.append(iconEl("database", "nt-database-icon"));
    typeLabel.createSpan({ text: "数据库" });

    const actions = topLine.createDiv({ cls: "nt-page-actions" });
    const newButton = actions.createEl("button", {
      cls: "nt-new-button",
      attr: { type: "button", "aria-label": "新建一行" },
    });
    newButton.append(iconEl("plus", "nt-button-icon"));
    newButton.createSpan({ text: "新建" });
    newButton.addEventListener("click", () => this.addRowAndFocus());

    const helpButton = actions.createEl("button", {
      cls: "nt-icon-button",
      attr: { type: "button", "aria-label": "使用帮助", title: "使用帮助" },
    });
    helpButton.append(iconEl("circle-help", "nt-icon"));
    helpButton.addEventListener("click", () => new HelpModal(this.app).open());

    const moreButton = actions.createEl("button", {
      cls: "nt-icon-button",
      attr: { type: "button", "aria-label": "更多选项", title: "更多选项" },
    });
    moreButton.append(iconEl("more-horizontal", "nt-icon"));
    moreButton.addEventListener("click", () => this.openPageMenu(moreButton));

    const titleRow = header.createDiv({ cls: "nt-title-row" });
    this.iconButton = titleRow.createEl("button", {
      cls: "nt-db-icon-button",
      attr: { type: "button", "aria-label": "更改图标", title: "更改图标" },
    });
    this.iconButton.setText(db.icon || "🗂️");
    this.iconButton.addEventListener("click", () => this.openEmojiPicker(this.iconButton!));

    this.titleInput = titleRow.createEl("textarea", {
      cls: "nt-title-input",
      attr: {
        rows: "1",
        placeholder: "未命名数据库",
        spellcheck: "false",
        "aria-label": "数据库标题",
      },
    });
    this.titleInput.value = db.title;
    this.autoGrowTitle(this.titleInput);
    this.titleInput.addEventListener("input", () => {
      if (!this.db) return;
      this.db.title = this.titleInput!.value;
      this.autoGrowTitle(this.titleInput!);
      this.persist();
    });
    this.titleInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.titleInput?.blur();
      }
    });

    const description = header.createEl("textarea", {
      cls: "nt-description-input",
      attr: {
        rows: "1",
        placeholder: "添加描述…",
        "aria-label": "数据库描述",
      },
    });
    description.value = db.description;
    description.addEventListener("input", () => {
      if (!this.db) return;
      this.db.description = description.value;
      this.persist();
    });
  }

  private autoGrowTitle(textarea: HTMLTextAreaElement): void {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(150, Math.max(46, textarea.scrollHeight))}px`;
  }

  private renderTabs(page: HTMLElement): void {
    const db = this.db!;
    const tabsWrap = page.createDiv({ cls: "nt-tabs-wrap" });
    const tabs = tabsWrap.createDiv({ cls: "nt-view-tabs" });
    for (const view of db.views) {
      const active = view.id === db.activeViewId;
      const tab = tabs.createEl("button", {
        cls: `nt-view-tab${active ? " is-active" : ""}`,
        attr: { type: "button", "aria-pressed": String(active) },
      });
      tab.append(iconEl(this.viewIcon(view), "nt-view-tab-icon"));
      tab.createSpan({ cls: "nt-view-tab-name", text: view.name });
      tab.addEventListener("click", () => this.switchView(view.id));
      tab.addEventListener("dblclick", (event) => {
        event.preventDefault();
        void this.renameView(view, tab);
      });
      tab.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        this.openViewMenu(tab, view);
      });
      tabs.append(tab);
    }
    const addTab = tabs.createEl("button", {
      cls: "nt-view-add",
      attr: { type: "button", "aria-label": "新建视图", title: "新建视图" },
    });
    addTab.append(iconEl("plus", "nt-icon"));
    addTab.addEventListener("click", () => this.openAddViewMenu(addTab));
  }

  private switchView(viewId: string): void {
    if (!this.db || viewId === this.db.activeViewId) return;
    this.db.activeViewId = viewId;
    this.selectedRows.clear();
    this.persist();
    this.renderAll();
  }

  private renderToolbar(page: HTMLElement): void {
    if (this.activeView?.type === "chart") this.renderChartToolbar(page);
    else this.renderTableToolbar(page);
  }

  private renderTableToolbar(page: HTMLElement): void {
    const view = this.activeView!;
    const toolbarWrap = page.createDiv({ cls: "nt-toolbar-wrap" });
    const toolbar = toolbarWrap.createDiv({ cls: "nt-toolbar" });
    const left = toolbar.createDiv({ cls: "nt-toolbar-left" });

    this.filterButton = this.createToolbarButton(left, "list-filter", "筛选");
    this.filterButton.toggleClass("is-active", view.filters.length > 0);
    this.updateBadge(this.filterButton, view.filters.length);
    this.filterButton.addEventListener("click", () => this.openFilterPanel(this.filterButton!));

    this.sortButton = this.createToolbarButton(left, "arrow-up-down", "排序");
    this.sortButton.toggleClass("is-active", view.sorts.length > 0);
    this.updateBadge(this.sortButton, view.sorts.length);
    this.sortButton.addEventListener("click", () => this.openSortPanel(this.sortButton!));

    this.groupButton = this.createToolbarButton(left, "layers", "分组");
    this.groupButton.toggleClass("is-active", Boolean(view.groupBy));
    this.groupButton.addEventListener("click", () => this.openGroupPanel(this.groupButton!));

    const right = toolbar.createDiv({ cls: "nt-toolbar-right" });
    const search = right.createDiv({ cls: "nt-search-box" });
    search.append(iconEl("search", "nt-search-icon"));
    const searchInput = search.createEl("input", {
      cls: "nt-search-input",
      type: "search",
      value: view.search,
      attr: { placeholder: "搜索…", "aria-label": "搜索记录" },
    });
    const clearSearch = search.createEl("button", {
      cls: `nt-search-clear${view.search ? "" : " is-hidden"}`,
      attr: { type: "button", "aria-label": "清除搜索" },
    });
    clearSearch.append(iconEl("x", "nt-icon"));
    clearSearch.addEventListener("click", () => {
      searchInput.value = "";
      view.search = "";
      clearSearch.toggleClass("is-hidden", true);
      this.persist();
      this.renderBodyPreserveScroll();
    });
    searchInput.addEventListener("input", () => {
      view.search = searchInput.value;
      clearSearch.toggleClass("is-hidden", !view.search);
      this.persist();
      if (this.searchTimer !== null) window.clearTimeout(this.searchTimer);
      this.searchTimer = window.setTimeout(() => {
        this.searchTimer = null;
        this.renderBodyPreserveScroll();
      }, 120);
    });

    const count = right.createDiv({ cls: "nt-toolbar-count" });
    this.tableCountEl = count;

    this.propertyButton = this.createToolbarButton(right, "sliders-horizontal", "属性");
    this.propertyButton.addEventListener("click", () => this.openPropertiesPanel(this.propertyButton!));

    const moreButton = right.createEl("button", {
      cls: "nt-icon-button",
      attr: { type: "button", "aria-label": "视图选项", title: "视图选项" },
    });
    moreButton.append(iconEl("more-horizontal", "nt-icon"));
    moreButton.addEventListener("click", () => this.openViewOptionsMenu(moreButton));
  }

  private createToolbarButton(
    parent: HTMLElement,
    icon: string,
    label: string,
  ): HTMLButtonElement {
    const button = buttonEl(icon, label, "nt-toolbar-button");
    parent.append(button);
    return button;
  }

  private updateBadge(button: HTMLElement, count: number): void {
    button.querySelector(".nt-toolbar-badge")?.remove();
    if (count <= 0) return;
    const badge = h("span", "nt-toolbar-badge", String(count));
    button.append(badge);
  }

  private renderTablePreserveScroll(
    afterRender?: () => void,
    reuseRows = true,
    ensureRowId?: string,
  ): void {
    if (this.activeView?.type === "chart") {
      this.renderChartView();
      afterRender?.();
      return;
    }
    const top = this.tableScrollEl?.scrollTop ?? 0;
    const left = this.tableScrollEl?.scrollLeft ?? 0;
    const resetScroll = this.renderTable({
      reuseRows,
      ensureRowId,
      afterRender: () => {
        window.requestAnimationFrame(() => {
          if (this.tableScrollEl) {
            this.tableScrollEl.scrollTop = resetScroll ? 0 : top;
            this.tableScrollEl.scrollLeft = resetScroll ? 0 : left;
          }
          afterRender?.();
        });
      },
    });
  }

  /**
   * Changing the batch size takes effect immediately: the table starts over from
   * the first batch so the new chunk size is visible from the top of the view.
   */
  refreshTablePageSize(): void {
    if (!this.db || !this.tableHostEl || this.activeView?.type === "chart") return;
    this.tableLoadedCount = 0;
    this.tableLoadedRowCount = 0;
    this.renderTable({ reuseRows: false, resetWindow: true });
  }

  private tablePageSize(): number | null {
    const size = this.plugin.settings?.tablePageSize;
    if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) return null;
    return Math.max(1, Math.floor(size));
  }

  private tableQuerySignature(view: ViewConfig): string {
    return JSON.stringify({
      id: view.id,
      conjunction: view.conjunction,
      filters: view.filters,
      sorts: view.sorts,
      search: view.search,
      groupBy: view.groupBy,
    });
  }

  private tableCellSignature(properties: DatabaseProperty[]): string {
    return properties
      .map(
        (property) =>
          `${property.id}\u0001${property.type}\u0001${property.numberFormat || ""}\u0001${(
            property.options || []
          )
            .map((option) => `${option.id}\u0002${option.name}\u0002${option.color}`)
            .join("\u0003")}`,
      )
      .join("\u0004");
  }

  private renderTable(options: TableRenderOptions = {}): boolean {
    if (!this.db || !this.tableHostEl) {
      options.afterRender?.();
      return false;
    }
    const token = ++this.tableRenderToken;
    const db = this.db;
    const view = this.activeView!;
    this.rowsById = new Map(db.rows.map((row) => [row.id, row]));
    this.propertiesById = new Map(db.properties.map((property) => [property.id, property]));
    this.rowDoneCache.clear();
    const rows = filteredRows(db, view);
    this.currentRows = rows;

    const querySignature = this.tableQuerySignature(view);
    const resetWindow =
      options.resetWindow === true || querySignature !== this.tableQuerySignatureCache;
    this.tableQuerySignatureCache = querySignature;
    if (resetWindow) {
      this.tableLoadedCount = 0;
      this.tableLoadedRowCount = 0;
    }

    for (const id of Array.from(this.selectedRows)) {
      if (!this.rowsById.has(id)) this.selectedRows.delete(id);
    }

    const properties = visibleProperties(db, view);
    const signature = this.tableCellSignature(properties);
    const previousRows =
      options.reuseRows && this.poolSignature === signature ? new Map(this.rowEls) : null;
    this.rowEls.clear();
    this.poolSignature = signature;
    this.rovingTabEl = null;
    this.tableColEls.clear();
    this.calcValueEls.clear();
    this.bulkBarEl = null;
    this.bulkCountEl = null;
    this.selectAllEl = null;

    const tableHost = this.tableHostEl;
    this.teardownChart();
    tableHost.empty();
    tableHost.removeClass("nt-chart-area");
    tableHost.toggleClass("is-grouped", Boolean(view.groupBy));

    if (this.selectedRows.size > 0) this.renderBulkBar(tableHost);

    const scroll = tableHost.createDiv({ cls: "nt-table-scroll" });
    this.tableScrollEl = scroll;
    const table = scroll.createEl("table", {
      cls: `nt-table${view.wrapText ? " is-wrapped" : ""}`,
    });
    this.tableEl = table;

    const gutterWidth = 56;
    const addColumnWidth = 44;
    const totalWidth =
      gutterWidth +
      addColumnWidth +
      properties.reduce((sum, property) => sum + (property.width || 170), 0);
    table.style.width = `${Math.max(680, totalWidth)}px`;

    const colgroup = table.createEl("colgroup");
    colgroup.createEl("col", { attr: { style: `width:${gutterWidth}px` } });
    for (const property of properties) {
      const col = colgroup.createEl("col", {
        attr: { style: `width:${property.width || 170}px` },
      });
      this.tableColEls.set(property.id, col);
    }
    colgroup.createEl("col", { attr: { style: `width:${addColumnWidth}px` } });

    this.renderTableHead(table, properties, rows);
    const tbody = table.createEl("tbody");
    this.bindTableEvents(tbody);
    const groups = view.groupBy ? groupRows(db, view, rows) : null;

    const entries: TableRenderEntry[] = [];
    if (groups && groups.length > 0) {
      for (const group of groups) {
        const collapsed = view.collapsedGroups.includes(group.key);
        entries.push({ kind: "group", group, collapsed });
        if (!collapsed) {
          for (const row of group.rows) entries.push({ kind: "row", row });
        }
      }
    } else {
      for (const row of rows) entries.push({ kind: "row", row });
    }

    if (rows.length === 0) this.appendEmptyState(tbody, properties.length + 2);

    let addRowEl: HTMLTableRowElement | null = null;
    if (rows.length > 0) {
      addRowEl = tbody.createEl("tr", { cls: "nt-add-row-row" });
      const cell = addRowEl.createEl("td", {
        attr: { colspan: String(properties.length + 2) },
      });
      const addButton = cell.createEl("button", {
        cls: "nt-add-row-button",
        attr: { type: "button" },
      });
      addButton.append(iconEl("plus", "nt-add-row-icon"));
      addButton.createSpan({ text: "新建一行" });
      addButton.addEventListener("click", () => this.addRowAndFocus());
    }

    if (view.showCalculations) this.renderCalculationFooter(table, properties, rows);
    this.updateTableCount(rows.length);

    const pageSize = this.tablePageSize();
    // Group headers are render entries too, but the setting counts records, so
    // the window is expanded until it contains the requested number of rows.
    const entryLimitForRows = (start: number, rowBudget: number): number => {
      let index = start;
      let counted = 0;
      while (index < entries.length && counted < rowBudget) {
        if (entries[index].kind === "row") counted += 1;
        index += 1;
      }
      // When every remaining row is already loaded, trailing headers of empty
      // groups can be added without waiting for another scroll.
      let scan = index;
      while (scan < entries.length && entries[scan].kind === "group") scan += 1;
      if (scan >= entries.length) index = entries.length;
      return index;
    };
    let initialCount = entries.length;
    if (pageSize !== null) {
      const rowBudget = Math.max(pageSize, resetWindow ? 0 : this.tableLoadedRowCount);
      initialCount = entryLimitForRows(0, rowBudget);
      if (options.ensureRowId) {
        const ensureIndex = entries.findIndex(
          (entry) => entry.kind === "row" && entry.row.id === options.ensureRowId,
        );
        if (ensureIndex >= 0) initialCount = Math.max(initialCount, ensureIndex + 1);
      }
      initialCount = Math.min(initialCount, entries.length);
    }

    if (initialCount > TABLE_ROW_CHUNK) {
      const total = db.rows.length;
      this.tableCountEl?.setText(
        rows.length === total
          ? `${rows.length} 条记录 · 渲染中…`
          : `${rows.length} / ${total} 条记录 · 渲染中…`,
      );
    }

    let loadMoreEl: HTMLTableRowElement | null = null;
    let loadedRowCount = 0;
    let cursor = 0;
    let busy = true;

    const updateLoadMoreIndicator = (): void => {
      if (!loadMoreEl) return;
      if (this.tableLoadedCount >= entries.length) {
        loadMoreEl.remove();
        loadMoreEl = null;
        return;
      }
      const textEl = loadMoreEl.querySelector<HTMLElement>(".nt-load-more-text");
      textEl?.setText(`已显示 ${loadedRowCount} / ${rows.length} 条记录，向下滚动加载更多`);
    };

    const pump = (
      limit: number,
      reusable: Map<string, HTMLTableRowElement> | null,
      done: () => void,
    ): void => {
      if (token !== this.tableRenderToken) return;
      const target = Math.min(limit, entries.length);
      const fragment = document.createDocumentFragment();
      const end = Math.min(target, cursor + TABLE_ROW_CHUNK);
      for (; cursor < end; cursor += 1) {
        const entry = entries[cursor];
        if (entry.kind === "group") {
          this.appendGroupRow(fragment, entry.group, entry.collapsed, properties, view);
        } else {
          this.appendDataRow(fragment, entry.row, properties, reusable);
          loadedRowCount += 1;
        }
      }
      if (fragment.childNodes.length > 0) {
        const anchor = loadMoreEl ?? addRowEl;
        if (anchor && anchor.parentElement === tbody) tbody.insertBefore(fragment, anchor);
        else tbody.append(fragment);
      }
      this.tableLoadedCount = cursor;
      this.tableLoadedRowCount = loadedRowCount;
      updateLoadMoreIndicator();
      if (cursor < target) {
        window.requestAnimationFrame(() => pump(limit, reusable, done));
        return;
      }
      done();
    };

    const nearBottom = (): boolean => {
      if (this.tableScrollEl !== scroll) return false;
      return (
        scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight <=
        TABLE_SCROLL_LOAD_THRESHOLD
      );
    };

    const startAppend = (): void => {
      if (busy || token !== this.tableRenderToken) return;
      if (pageSize === null || this.tableLoadedCount >= entries.length) return;
      busy = true;
      loadMoreEl?.addClass("is-loading");
      const target = entryLimitForRows(this.tableLoadedCount, pageSize);
      pump(target, null, () => {
        busy = false;
        loadMoreEl?.removeClass("is-loading");
        updateLoadMoreIndicator();
        scheduleCheck();
      });
    };

    // Break the load loop out of the current call stack so tiny batch sizes
    // cannot recurse indefinitely while filling a tall viewport.
    const scheduleCheck = (): void => {
      window.requestAnimationFrame(() => {
        if (!busy && nearBottom()) startAppend();
      });
    };

    if (pageSize !== null && initialCount < entries.length) {
      loadMoreEl = tbody.createEl("tr", { cls: "nt-load-more-row" });
      const cell = loadMoreEl.createEl("td", {
        attr: { colspan: String(properties.length + 2) },
      });
      const button = cell.createEl("button", {
        cls: "nt-load-more-button",
        attr: { type: "button", "aria-label": "加载更多记录" },
      });
      button.createSpan({ cls: "nt-load-more-spinner" });
      button.createSpan({ cls: "nt-load-more-text", text: "" });
      button.addEventListener("click", () => startAppend());
      if (addRowEl) tbody.insertBefore(loadMoreEl, addRowEl);
      updateLoadMoreIndicator();
    }

    const handleNearBottom = (): void => {
      if (!busy && nearBottom()) startAppend();
    };
    scroll.addEventListener("scroll", handleNearBottom, { passive: true });
    scroll.addEventListener("wheel", handleNearBottom, { passive: true });

    pump(initialCount, previousRows, () => {
      busy = false;
      this.ensureRovingTabStop();
      this.updateTableCount(rows.length);
      updateLoadMoreIndicator();
      options.afterRender?.();
      scheduleCheck();
    });

    return resetWindow;
  }

  private appendGroupRow(
    container: DocumentFragment | HTMLTableSectionElement,
    group: RowGroup,
    collapsed: boolean,
    properties: DatabaseProperty[],
    view: ViewConfig,
  ): void {
    const groupRow = container.createEl("tr", { cls: "nt-group-row" });
    const groupCell = groupRow.createEl("td", {
      attr: { colspan: String(properties.length + 2) },
    });
    const groupButton = groupCell.createDiv({ cls: "nt-group-header" });
    groupButton.append(
      iconEl(collapsed ? "chevron-right" : "chevron-down", "nt-group-chevron"),
    );
    const pill = groupButton.createSpan({
      cls: `nt-pill ${group.color ? `nt-color-${group.color}` : "nt-color-default"}`,
    });
    if (group.color) pill.createSpan({ cls: "nt-option-dot" });
    pill.createSpan({ text: group.label });
    groupButton.createSpan({ cls: "nt-group-count", text: String(group.rows.length) });
    groupButton.addEventListener("click", () => {
      const index = view.collapsedGroups.indexOf(group.key);
      if (index >= 0) view.collapsedGroups.splice(index, 1);
      else view.collapsedGroups.push(group.key);
      this.persist();
      this.renderTablePreserveScroll();
    });
  }

  private viewIcon(view: ViewConfig): string {
    if (view.type === "chart") {
      return view.chart.kind === "pie" ? "chart-pie" : "chart-line";
    }
    return "table-2";
  }

  private teardownChart(): void {
    this.chartRenderToken += 1;
    this.chartResizeObserver?.disconnect();
    this.chartResizeObserver = null;
    if (this.chartInstance) {
      disposeChart(this.chartInstance);
      this.chartInstance = null;
    }
  }

  private renderChartView(): void {
    this.tableRenderToken += 1;
    if (!this.db || !this.tableHostEl) return;
    const db = this.db;
    const view = this.activeView!;
    const host = this.tableHostEl;
    const rows = filteredRows(db, view);
    this.currentRows = rows;
    this.teardownChart();
    host.empty();
    host.addClass("nt-chart-area");
    host.removeClass("is-grouped");
    this.updateTableCount(rows.length);

    const data = buildChartData(db, view, rows);
    const card = h("div", "nt-chart-card");
    host.append(card);

    const header = card.createDiv({ cls: "nt-chart-header" });
    const titleBlock = header.createDiv({ cls: "nt-chart-title-block" });
    const eyebrow = titleBlock.createDiv({ cls: "nt-chart-eyebrow" });
    eyebrow.append(
      iconEl(view.chart.kind === "pie" ? "chart-pie" : "chart-line", "nt-chart-eyebrow-icon"),
    );
    eyebrow.createSpan({ text: CHART_KIND_LABELS[view.chart.kind] });
    titleBlock.createDiv({ cls: "nt-chart-title", text: view.name });
    const groupSuffix = data.groupLabel ? ` · 按${data.groupLabel}分组` : "";
    titleBlock.createDiv({
      cls: "nt-chart-subtitle",
      text: `${data.categoryLabel} → ${data.metricLabel}${groupSuffix} · ${rows.length} 条记录`,
    });

    if (
      !data.empty &&
      (view.chart.aggregation === "sum" || view.chart.aggregation === "count")
    ) {
      const summary = header.createDiv({ cls: "nt-chart-summary" });
      summary.createSpan({ cls: "nt-chart-summary-label", text: "合计" });
      summary.createSpan({
        cls: "nt-chart-summary-value",
        text: formatChartValue(data.total, data),
      });
    }

    if (data.empty) {
      this.renderChartEmpty(card, data);
      return;
    }

    const canvas = card.createDiv({ cls: "nt-chart-canvas" });
    const token = this.chartRenderToken;
    let initialized = false;
    const initializeChart = () => {
      if (
        initialized ||
        token !== this.chartRenderToken ||
        !canvas.isConnected
      ) {
        return;
      }
      initialized = true;
      try {
        this.chartInstance = createChart(canvas, data, isDarkTheme());
        this.chartResizeObserver = new ResizeObserver(() => {
          this.chartInstance?.resize();
        });
        this.chartResizeObserver.observe(canvas);
        this.chartInstance.resize();
      } catch (error) {
        console.error("One Database: could not render chart", error);
        canvas.empty();
        canvas.createDiv({
          cls: "nt-chart-render-error",
          text: "图表渲染失败，请尝试切换图表类型或重新打开视图。",
        });
      }
    };
    window.requestAnimationFrame(initializeChart);
    // requestAnimationFrame is paused while the window is hidden; the timeout
    // still lets the chart initialize for background windows and popouts.
    window.setTimeout(initializeChart, 80);
  }

  private renderChartEmpty(card: HTMLElement, data: ChartData): void {
    card.addClass("is-empty");
    const empty = card.createDiv({ cls: "nt-chart-empty" });
    const icon = empty.createDiv({ cls: "nt-chart-empty-icon" });
    icon.append(iconEl(data.kind === "pie" ? "chart-pie" : "chart-line", "nt-icon"));
    empty.createEl("strong", { text: data.message });
    empty.createEl("p", {
      text:
        data.rowCount === 0
          ? "当前筛选条件下没有记录，调整筛选或搜索后再试。"
          : "选择适合的 X 轴和数值属性，即可生成图表。",
    });
    const actions = empty.createDiv({ cls: "nt-chart-empty-actions" });
    const xButton = actions.createEl("button", {
      cls: "nt-button",
      text: "选择 X 轴",
    });
    xButton.addEventListener("click", () => this.openChartXAxisMenu(xButton));
    const yButton = actions.createEl("button", {
      cls: "nt-button nt-button-primary",
      text: "设置 Y 轴",
    });
    yButton.addEventListener("click", () => this.openChartYAxisMenu(yButton));
  }

  private renderChartToolbar(page: HTMLElement): void {
    const view = this.activeView!;
    const chart = view.chart;
    const toolbarWrap = page.createDiv({ cls: "nt-toolbar-wrap" });
    const toolbar = toolbarWrap.createDiv({ cls: "nt-toolbar nt-chart-toolbar" });
    const left = toolbar.createDiv({ cls: "nt-toolbar-left" });

    const typeIcon = chart.kind === "pie" ? "chart-pie" : "chart-line";
    this.chartTypeButton = this.createToolbarButton(
      left,
      typeIcon,
      CHART_KIND_LABELS[chart.kind],
    );
    this.chartTypeButton.addClass("nt-chart-type-button");
    this.chartTypeButton.addEventListener("click", () =>
      this.openChartTypeMenu(this.chartTypeButton!),
    );

    const xProperty = chart.xPropertyId ? propertyById(this.db!, chart.xPropertyId) : undefined;
    this.chartXButton = this.createToolbarButton(
      left,
      "arrow-right",
      `X 轴 · ${xProperty?.name || "未选择"}`,
    );
    this.chartXButton.addEventListener("click", () =>
      this.openChartXAxisMenu(this.chartXButton!),
    );

    const valueProperty =
      chart.valuePropertyId && chart.aggregation !== "count"
        ? propertyById(this.db!, chart.valuePropertyId)
        : undefined;
    const yLabel = valueProperty?.name || "记录数";
    this.chartYButton = this.createToolbarButton(left, "sigma", `Y 轴 · ${yLabel}`);
    this.chartYButton.title = `Y 轴 · ${yLabel} · ${CHART_AGGREGATION_LABELS[chart.aggregation]}`;
    this.chartYButton.addEventListener("click", () =>
      this.openChartYAxisMenu(this.chartYButton!),
    );

    if (chart.kind === "line") {
      const groupProperty =
        chart.groupByPropertyId ? propertyById(this.db!, chart.groupByPropertyId) : undefined;
      this.chartGroupButton = this.createToolbarButton(
        left,
        "layers",
        groupProperty ? `分组 · ${groupProperty.name}` : "分组",
      );
      this.chartGroupButton.toggleClass("is-active", Boolean(groupProperty));
      this.chartGroupButton.addEventListener("click", () =>
        this.openChartGroupMenu(this.chartGroupButton!),
      );
    }

    this.filterButton = this.createToolbarButton(left, "list-filter", "筛选");
    this.filterButton.toggleClass("is-active", view.filters.length > 0);
    this.updateBadge(this.filterButton, view.filters.length);
    this.filterButton.addEventListener("click", () => this.openFilterPanel(this.filterButton!));

    const right = toolbar.createDiv({ cls: "nt-toolbar-right" });
    const search = right.createDiv({ cls: "nt-search-box" });
    search.append(iconEl("search", "nt-search-icon"));
    const searchInput = search.createEl("input", {
      cls: "nt-search-input",
      type: "search",
      value: view.search,
      attr: { placeholder: "搜索…", "aria-label": "搜索记录" },
    });
    const clearSearch = search.createEl("button", {
      cls: `nt-search-clear${view.search ? "" : " is-hidden"}`,
      attr: { type: "button", "aria-label": "清除搜索" },
    });
    clearSearch.append(iconEl("x", "nt-icon"));
    clearSearch.addEventListener("click", () => {
      searchInput.value = "";
      view.search = "";
      clearSearch.toggleClass("is-hidden", true);
      this.persist();
      this.renderChartView();
    });
    searchInput.addEventListener("input", () => {
      view.search = searchInput.value;
      clearSearch.toggleClass("is-hidden", !view.search);
      this.persist();
      if (this.searchTimer !== null) window.clearTimeout(this.searchTimer);
      this.searchTimer = window.setTimeout(() => {
        this.searchTimer = null;
        if (this.activeView?.type === "chart") this.renderChartView();
      }, 120);
    });

    this.tableCountEl = right.createDiv({ cls: "nt-toolbar-count" });

    const moreButton = right.createEl("button", {
      cls: "nt-icon-button",
      attr: { type: "button", "aria-label": "图表选项", title: "图表选项" },
    });
    moreButton.append(iconEl("more-horizontal", "nt-icon"));
    moreButton.addEventListener("click", () => this.openChartViewOptionsMenu(moreButton));
  }

  private openChartTypeMenu(anchor: HTMLElement): void {
    if (!this.db) return;
    const view = this.activeView!;
    openPopover(anchor, "nt-menu-popover", (content, popover) => {
      content.createDiv({ cls: "nt-menu-heading", text: "图表类型" });
      for (const kind of ["line", "pie"] as ChartKind[]) {
        this.menuItem(
          content,
          kind === "pie" ? "chart-pie" : "chart-line",
          CHART_KIND_LABELS[kind],
          () => {
            view.chart.kind = kind;
            if (kind === "pie") view.chart.groupByPropertyId = null;
            this.persist();
            popover.close();
            this.renderAll();
          },
          { checked: view.chart.kind === kind },
        );
      }
      content.createDiv({
        cls: "nt-menu-note",
        text: "折线图适合展示趋势；饼图适合展示分类占比。",
      });
    }, { width: 225 });
  }

  private chartXProperties(): DatabaseProperty[] {
    if (!this.db) return [];
    return this.db.properties;
  }

  private openChartXAxisMenu(anchor: HTMLElement): void {
    if (!this.db) return;
    const view = this.activeView!;
    const chart = view.chart;
    openPopover(anchor, "nt-menu-popover", (content, popover) => {
      content.createDiv({ cls: "nt-menu-heading", text: "X 轴 · 分类" });
      for (const property of this.chartXProperties()) {
        this.menuItem(
          content,
          this.propertyIcon(property),
          property.name,
          () => {
            chart.xPropertyId = property.id;
            if (chart.groupByPropertyId === property.id) chart.groupByPropertyId = null;
            this.persist();
            popover.close();
            this.renderAll();
          },
          { checked: chart.xPropertyId === property.id },
        );
      }
      const xProperty = chart.xPropertyId ? propertyById(this.db!, chart.xPropertyId) : undefined;
      if (
        xProperty &&
        ["date", "created_time", "last_edited_time"].includes(xProperty.type)
      ) {
        content.createDiv({ cls: "nt-menu-divider" });
        content.createDiv({ cls: "nt-menu-heading", text: "日期粒度" });
        for (const grain of ["day", "month", "year"] as ChartDateGrain[]) {
          this.menuItem(
            content,
            "calendar-days",
            CHART_DATE_GRAIN_LABELS[grain],
            () => {
              chart.dateGrain = grain;
              this.persist();
              popover.close();
              this.renderAll();
            },
            { checked: chart.dateGrain === grain },
          );
        }
      }
    }, { width: 260 });
  }

  private openChartYAxisMenu(anchor: HTMLElement): void {
    if (!this.db) return;
    const view = this.activeView!;
    const chart = view.chart;
    const numericProperties = this.db.properties.filter((property) => property.type === "number");
    openPopover(anchor, "nt-menu-popover", (content, popover) => {
      content.createDiv({ cls: "nt-menu-heading", text: "Y 轴 · 数值" });
      this.menuItem(
        content,
        "hash",
        "记录数（计数）",
        () => {
          chart.valuePropertyId = null;
          chart.aggregation = "count";
          this.persist();
          popover.close();
          this.renderAll();
        },
        { checked: chart.aggregation === "count" || !chart.valuePropertyId },
      );
      for (const property of numericProperties) {
        this.menuItem(
          content,
          "hash",
          property.name,
          () => {
            chart.valuePropertyId = property.id;
            if (chart.aggregation === "count") chart.aggregation = "sum";
            this.persist();
            popover.close();
            this.renderAll();
          },
          { checked: chart.valuePropertyId === property.id && chart.aggregation !== "count" },
        );
      }
      if (numericProperties.length === 0) {
        content.createDiv({ cls: "nt-menu-note", text: "还没有数字属性，当前按记录数计数。" });
      } else if (chart.valuePropertyId && chart.aggregation !== "count") {
        content.createDiv({ cls: "nt-menu-divider" });
        content.createDiv({ cls: "nt-menu-heading", text: "聚合方式" });
        for (const aggregation of ["sum", "average", "min", "max", "median"] as ChartAggregation[]) {
          this.menuItem(
            content,
            "sigma",
            CHART_AGGREGATION_LABELS[aggregation],
            () => {
              chart.aggregation = aggregation;
              this.persist();
              popover.close();
              this.renderAll();
            },
            { checked: chart.aggregation === aggregation },
          );
        }
      }
    }, { width: 255 });
  }

  private openChartGroupMenu(anchor: HTMLElement): void {
    if (!this.db) return;
    const view = this.activeView!;
    const chart = view.chart;
    const candidates = this.db.properties.filter((property) =>
      ["select", "status", "checkbox"].includes(property.type),
    );
    openPopover(anchor, "nt-menu-popover", (content, popover) => {
      content.createDiv({ cls: "nt-menu-heading", text: "按属性拆分线条" });
      this.menuItem(
        content,
        "ban",
        "不分组",
        () => {
          chart.groupByPropertyId = null;
          this.persist();
          popover.close();
          this.renderAll();
        },
        { checked: !chart.groupByPropertyId },
      );
      for (const property of candidates) {
        this.menuItem(
          content,
          this.propertyIcon(property),
          property.name,
          () => {
            chart.groupByPropertyId = property.id;
            this.persist();
            popover.close();
            this.renderAll();
          },
          { checked: chart.groupByPropertyId === property.id },
        );
      }
      if (candidates.length === 0) {
        content.createDiv({
          cls: "nt-menu-note",
          text: "添加「单选」「状态」或「复选框」属性后即可分组。",
        });
      }
    }, { width: 235 });
  }

  private openChartViewOptionsMenu(anchor: HTMLElement): void {
    if (!this.db) return;
    const view = this.activeView!;
    openPopover(anchor, "nt-menu-popover", (content, popover) => {
      content.createDiv({ cls: "nt-menu-heading", text: "图表选项" });
      this.menuItem(
        content,
        "list",
        "显示图例",
        () => {
          view.chart.showLegend = !view.chart.showLegend;
          this.persist();
          popover.close();
          this.renderChartView();
        },
        { checked: view.chart.showLegend },
      );
      this.menuItem(content, "table-2", "改为表格视图", () => {
        view.type = "table";
        this.persist();
        popover.close();
        this.renderAll();
      });
      content.createDiv({ cls: "nt-menu-divider" });
      this.menuItem(content, "download", "导出原始数据为 CSV", () => {
        popover.close();
        this.exportCsv();
      });
      this.menuItem(content, "eraser", "清除筛选与搜索", () => {
        view.filters = [];
        view.search = "";
        this.persist();
        popover.close();
        this.renderAll();
      });
      content.createDiv({ cls: "nt-menu-divider" });
      this.menuItem(
        content,
        "trash-2",
        "删除全部记录",
        () => {
          popover.close();
          void this.deleteAllRows();
        },
        { danger: true },
      );
    }, { width: 245 });
  }

  private renderBulkBar(parent: HTMLElement): void {
    const bar = h("div", "nt-bulk-bar");
    if (this.tableScrollEl && this.tableScrollEl.parentElement === parent) {
      parent.insertBefore(bar, this.tableScrollEl);
    } else {
      parent.append(bar);
    }
    this.bulkBarEl = bar;
    this.bulkCountEl = bar.createSpan({
      cls: "nt-bulk-count",
      text: `已选择 ${this.selectedRows.size} 项`,
    });
    const actions = bar.createDiv({ cls: "nt-bulk-actions" });
    const remove = actions.createEl("button", {
      cls: "nt-button nt-button-danger",
      text: "删除",
    });
    remove.addEventListener("click", () => void this.deleteSelectedRows());
    const cancel = actions.createEl("button", {
      cls: "nt-button nt-button-quiet",
      text: "取消选择",
    });
    cancel.addEventListener("click", () => {
      this.selectedRows.clear();
      this.updateSelectionUi();
    });
  }

  private updateSelectionUi(): void {
    if (this.tableEl) {
      for (const tr of Array.from(
        this.tableEl.querySelectorAll<HTMLTableRowElement>("tr.nt-data-row"),
      )) {
        const id = tr.dataset.rowId;
        if (id) this.syncRowSelection(tr, id);
      }
    }
    if (this.selectedRows.size > 0) {
      if (this.bulkBarEl) {
        this.bulkCountEl?.setText(`已选择 ${this.selectedRows.size} 项`);
      } else if (this.tableHostEl) {
        this.renderBulkBar(this.tableHostEl);
      }
    } else if (this.bulkBarEl) {
      this.bulkBarEl.remove();
      this.bulkBarEl = null;
      this.bulkCountEl = null;
    }
    this.updateSelectAllState();
  }

  private updateSelectAllState(): void {
    if (!this.selectAllEl) return;
    const total = this.currentRows.length;
    let selected = 0;
    for (const row of this.currentRows) {
      if (this.selectedRows.has(row.id)) selected += 1;
    }
    this.selectAllEl.checked = total > 0 && selected === total;
    this.selectAllEl.indeterminate = selected > 0 && selected < total;
  }

  private renderTableHead(
    table: HTMLTableElement,
    properties: DatabaseProperty[],
    rows: DatabaseRow[],
  ): void {
    const thead = table.createEl("thead");
    const tr = thead.createEl("tr");

    const gutter = tr.createEl("th", { cls: "nt-gutter-cell" });
    const selectAll = gutter.createEl("input", {
      cls: "nt-checkbox-input",
      type: "checkbox",
      attr: { "aria-label": "选择全部记录" },
    });
    this.selectAllEl = selectAll;
    const selectedVisible = rows.filter((row) => this.selectedRows.has(row.id)).length;
    selectAll.checked = rows.length > 0 && selectedVisible === rows.length;
    selectAll.indeterminate = selectedVisible > 0 && selectedVisible < rows.length;
    selectAll.addEventListener("change", () => {
      if (selectAll.checked) {
        for (const row of rows) this.selectedRows.add(row.id);
      } else {
        for (const row of rows) this.selectedRows.delete(row.id);
      }
      this.updateSelectionUi();
    });

    const view = this.activeView!;
    for (const property of properties) {
      const th = tr.createEl("th", {
        cls: `nt-th nt-th-${property.type}`,
        attr: {
          "data-property-id": property.id,
          "aria-label": property.name,
        },
      });
      th.style.width = `${property.width || 170}px`;
      const inner = th.createDiv({ cls: "nt-th-inner" });
      inner.append(iconEl(this.propertyIcon(property), "nt-prop-type-icon"));
      inner.createSpan({ cls: "nt-th-label", text: property.name });
      if (view.filters.some((rule) => rule.propertyId === property.id)) {
        inner.append(iconEl("list-filter", "nt-th-indicator is-filter"));
      }
      const activeSort = view.sorts.find((sort) => sort.propertyId === property.id);
      if (activeSort) {
        inner.append(
          iconEl(
            activeSort.direction === "asc" ? "arrow-up" : "arrow-down",
            "nt-th-indicator is-sort",
          ),
        );
      }
      inner.append(iconEl("chevron-down", "nt-th-chevron"));
      th.addEventListener("click", (event) => {
        if ((event.target as HTMLElement).closest(".nt-column-resize")) return;
        this.openPropertyMenu(th, property);
      });
      const resize = th.createDiv({
        cls: "nt-column-resize",
        attr: { "aria-hidden": "true" },
      });
      resize.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.startColumnResize(event, th, property);
      });
    }

    const addColumn = tr.createEl("th", { cls: "nt-add-column" });
    const addButton = addColumn.createEl("button", {
      cls: "nt-add-column-button",
      attr: { type: "button", "aria-label": "新建属性", title: "新建属性" },
    });
    addButton.append(iconEl("plus", "nt-icon"));
    addButton.addEventListener("click", () => void this.createProperty());
  }

  private renderCalculationFooter(
    table: HTMLTableElement,
    properties: DatabaseProperty[],
    rows: DatabaseRow[],
  ): void {
    const db = this.db!;
    const view = this.activeView!;
    const tfoot = table.createEl("tfoot");
    const tr = tfoot.createEl("tr");
    const prefix = tr.createEl("td", { cls: "nt-calculation-prefix" });
    prefix.append(iconEl("sigma", "nt-calc-icon"));
    prefix.createSpan({ text: "计算" });

    for (const property of properties) {
      const cell = tr.createEl("td", { cls: "nt-calculation-cell" });
      const configured = view.calculations[property.id] || "none";
      const value = calculate(db, property, rows, configured);
      const button = cell.createEl("button", {
        cls: `nt-calculation-button${configured !== "none" ? " is-active" : ""}`,
        attr: {
          type: "button",
          "aria-label": `${property.name} 的计算`,
          title: configured === "none" ? "添加计算" : calculationLabel(configured),
        },
      });
      if (configured === "none") {
        button.append(iconEl("sigma", "nt-calc-placeholder-icon"));
        button.createSpan({ cls: "nt-calc-placeholder", text: "计算" });
      } else {
        button.createSpan({ cls: "nt-calc-label", text: calculationLabel(configured) });
        this.calcValueEls.set(
          property.id,
          button.createSpan({ cls: "nt-calc-value", text: value || "—" }),
        );
      }
      button.addEventListener("click", () => this.openCalculationMenu(button, property));
    }
    tr.createEl("td", { cls: "nt-calculation-cell" });
  }

  private bindTableEvents(tbody: HTMLTableSectionElement): void {
    tbody.addEventListener("click", (event) => this.handleTableClick(event));
    tbody.addEventListener("keydown", (event) => this.handleTableKeydown(event));
    tbody.addEventListener("change", (event) => this.handleTableChange(event));
    tbody.addEventListener("contextmenu", (event) => this.handleTableContextMenu(event));
    tbody.addEventListener("focusin", (event) => this.handleTableFocusIn(event));
  }

  private handleTableFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement | null;
    const td = target?.closest<HTMLElement>("td.nt-cell");
    if (td) this.setRovingTabStop(td);
  }

  private setRovingTabStop(td: HTMLElement): void {
    if (td === this.rovingTabEl) return;
    if (this.rovingTabEl?.isConnected) this.rovingTabEl.tabIndex = -1;
    td.tabIndex = 0;
    this.rovingTabEl = td;
  }

  private ensureRovingTabStop(): void {
    if (this.rovingTabEl?.isConnected) return;
    this.rovingTabEl = null;
    const first = this.tableEl?.querySelector<HTMLElement>("tr.nt-data-row td.nt-cell");
    if (first) this.setRovingTabStop(first);
  }

  private moveCellFocus(td: HTMLElement, dx: number, dy: number): void {
    const tr = td.closest<HTMLTableRowElement>("tr.nt-data-row");
    if (!tr) return;
    const cells = Array.from(tr.querySelectorAll<HTMLElement>("td.nt-cell"));
    const column = cells.indexOf(td);
    if (column < 0) return;
    if (dx !== 0) {
      const target = cells[column + dx];
      if (target) {
        this.setRovingTabStop(target);
        target.focus();
      }
      return;
    }
    let sibling =
      dy < 0 ? tr.previousElementSibling : tr.nextElementSibling;
    while (sibling && !sibling.classList.contains("nt-data-row")) {
      sibling = dy < 0 ? sibling.previousElementSibling : sibling.nextElementSibling;
    }
    const targetRow = sibling as HTMLTableRowElement | null;
    const targetCells = targetRow?.querySelectorAll<HTMLElement>("td.nt-cell");
    if (!targetCells || targetCells.length === 0) return;
    const target = targetCells[Math.min(column, targetCells.length - 1)];
    if (target) {
      this.setRovingTabStop(target);
      target.focus();
    }
  }

  private rowEntryFor(
    target: HTMLElement | null,
  ): { tr: HTMLTableRowElement; row: DatabaseRow } | null {
    const tr = target?.closest<HTMLTableRowElement>("tr.nt-data-row");
    if (!tr) return null;
    const rowId = tr.dataset.rowId;
    const row = rowId ? this.rowsById.get(rowId) : undefined;
    return row ? { tr, row } : null;
  }

  private handleTableClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const entry = this.rowEntryFor(target);
    const action = target.closest<HTMLElement>(".nt-row-action");
    if (action && entry) {
      if (action.classList.contains("nt-row-action-open")) this.openRowPage(entry.row);
      else this.openRowMenu(action, entry.row);
      return;
    }
    if (entry && target.closest(".nt-row-emoji")) {
      this.openRowPage(entry.row);
      return;
    }
    if (target.closest("button, a, input, .nt-checkbox")) return;
    const td = target.closest<HTMLElement>("td.nt-cell");
    if (!td || td.classList.contains("is-editing")) return;
    const row = td.dataset.rowId ? this.rowsById.get(td.dataset.rowId) : undefined;
    const property = td.dataset.propertyId
      ? this.propertiesById.get(td.dataset.propertyId)
      : undefined;
    if (!row || !property || isReadOnlyProperty(property)) return;
    this.setRovingTabStop(td);
    this.activateCell(td, row, property);
  }

  private handleTableKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const td = target.closest<HTMLElement>("td.nt-cell");
    if (!td || td !== target) return;
    this.setRovingTabStop(td);
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.moveCellFocus(td, -1, 0);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      this.moveCellFocus(td, 1, 0);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.moveCellFocus(td, 0, -1);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.moveCellFocus(td, 0, 1);
      return;
    }
    const row = td.dataset.rowId ? this.rowsById.get(td.dataset.rowId) : undefined;
    const property = td.dataset.propertyId
      ? this.propertiesById.get(td.dataset.propertyId)
      : undefined;
    if (!row || !property || isReadOnlyProperty(property)) return;
    if (event.key === "Enter" || event.key === "F2") {
      event.preventDefault();
      this.activateCell(td, row, property);
    }
    if (event.key === " " && property.type === "checkbox") {
      event.preventDefault();
      this.toggleCellCheckbox(row, property);
    }
  }

  private handleTableChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input || !input.classList.contains("nt-checkbox-input")) return;
    if (!input.closest(".nt-row-gutter")) return;
    const entry = this.rowEntryFor(input);
    if (!entry) return;
    if (input.checked) this.selectedRows.add(entry.row.id);
    else this.selectedRows.delete(entry.row.id);
    this.updateSelectionUi();
  }

  private handleTableContextMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    const entry = this.rowEntryFor(target);
    if (!entry) return;
    event.preventDefault();
    const anchor =
      target?.closest<HTMLElement>("td") ||
      entry.tr.querySelector<HTMLElement>(".nt-cell");
    if (anchor) this.openRowMenu(anchor, entry.row);
  }

  private appendDataRow(
    container: DocumentFragment | HTMLTableSectionElement,
    row: DatabaseRow,
    properties: DatabaseProperty[],
    reusableRows?: Map<string, HTMLTableRowElement> | null,
  ): void {
    const reusable = reusableRows?.get(row.id);
    if (reusable) {
      reusableRows!.delete(row.id);
      this.syncRowSelection(reusable, row.id);
      for (const td of Array.from(reusable.querySelectorAll<HTMLElement>("td.nt-cell"))) {
        td.tabIndex = -1;
      }
      container.append(reusable);
      this.rowEls.set(row.id, reusable);
      return;
    }
    const tr = container.createEl("tr", {
      cls: `nt-data-row${this.selectedRows.has(row.id) ? " is-selected" : ""}`,
      attr: { "data-row-id": row.id },
    });
    this.rowEls.set(row.id, tr);

    const gutter = tr.createEl("td", { cls: "nt-row-gutter" });
    const checkbox = gutter.createEl("input", {
      cls: "nt-checkbox-input",
      type: "checkbox",
      attr: { "aria-label": "选择记录" },
    });
    checkbox.checked = this.selectedRows.has(row.id);
    checkbox.tabIndex = -1;

    for (const property of properties) {
      const td = tr.createEl("td", {
        cls: `nt-cell nt-cell-${property.type}`,
        attr: {
          "data-row-id": row.id,
          "data-property-id": property.id,
          tabindex: "-1",
        },
      });
      this.renderCellContent(td, row, property);
    }
    tr.createEl("td", { cls: "nt-add-column nt-add-column-cell" });
  }

  private syncRowSelection(tr: HTMLTableRowElement, rowId: string): void {
    const selected = this.selectedRows.has(rowId);
    tr.toggleClass("is-selected", selected);
    const checkbox = tr.querySelector<HTMLInputElement>(".nt-row-gutter .nt-checkbox-input");
    if (checkbox) checkbox.checked = selected;
  }

  private appendEmptyState(tbody: HTMLTableSectionElement, colspan: number): void {
    const view = this.activeView!;
    const row = tbody.createEl("tr", { cls: "nt-empty-row" });
    const cell = row.createEl("td", { attr: { colspan: String(colspan) } });
    const empty = cell.createDiv({ cls: "nt-empty-state" });
    const icon = empty.createDiv({ cls: "nt-empty-icon" });
    icon.append(iconEl("table-2", "nt-icon"));
    const hasFilter = view.filters.length > 0 || Boolean(view.search.trim());
    empty.createEl("strong", {
      text: hasFilter ? "没有匹配的记录" : "这张表还是空的",
    });
    empty.createEl("p", {
      text: hasFilter
        ? "试试调整筛选或搜索条件，也可以直接添加一条新记录。"
        : "添加第一条记录，开始管理你的数据。",
    });
    const actions = empty.createDiv({ cls: "nt-empty-actions" });
    if (hasFilter) {
      const clearButton = actions.createEl("button", {
        cls: "nt-button",
        text: "清除筛选",
      });
      clearButton.addEventListener("click", () => {
        view.filters = [];
        view.search = "";
        this.persist();
        this.renderAll();
      });
    }
    const addButton = actions.createEl("button", {
      cls: "nt-button nt-button-primary",
      text: "新建记录",
    });
    addButton.addEventListener("click", () => this.addRowAndFocus());
  }

  private updateTableCount(visibleCount: number): void {
    if (!this.tableCountEl || !this.db || !this.activeView) return;
    const total = this.db.rows.length;
    this.tableCountEl.setText(
      visibleCount === total ? `${total} 条记录` : `${visibleCount} / ${total} 条记录`,
    );
  }

  private propertyIcon(property: DatabaseProperty): string {
    switch (property.type) {
      case "title":
        return "type";
      case "text":
        return "align-left";
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
        return "type";
    }
  }

  private renderCellContent(td: HTMLElement, row: DatabaseRow, property: DatabaseProperty): void {
    clear(td);
    td.removeClass("is-editing");
    td.removeClass("nt-cell-empty");
    const value = getCell(row, property);
    if (property.type === "title") {
      this.renderTitleCell(td, row, property, value);
      return;
    }
    if (property.type === "checkbox") {
      const checked = value === true;
      td.append(
        h("span", `nt-checkbox nt-cell-checkbox${checked ? " is-checked" : ""}`),
      );
      return;
    }
    if (isCellEmpty(value)) {
      td.addClass("nt-cell-empty");
      return;
    }

    switch (property.type) {
      case "number": {
        td.append(h("span", "nt-number-value", formatNumber(value, property)));
        break;
      }
      case "select":
      case "status": {
        const option = optionById(property, value);
        if (!option) {
          td.addClass("nt-cell-empty");
          break;
        }
        const pill = h("span", `nt-pill ${colorClass(option.color)}`);
        if (property.type === "status") pill.append(h("span", "nt-option-dot"));
        pill.append(h("span", "nt-pill-text", option.name));
        td.append(pill);
        break;
      }
      case "multi_select": {
        const ids = Array.isArray(value) ? value : [];
        const wrap = h("div", "nt-tag-list");
        for (const id of ids) {
          const option = optionById(property, id);
          if (!option) continue;
          wrap.append(h("span", `nt-tag ${colorClass(option.color)}`, option.name));
        }
        if (wrap.childElementCount === 0) td.addClass("nt-cell-empty");
        else td.append(wrap);
        break;
      }
      case "date": {
        const dateValue = value as DateValue;
        const span = h(
          "span",
          `nt-date-value${isDateOverdue(dateValue, this.isRowDone(row)) ? " is-overdue" : ""}`,
        );
        span.append(h("span", "", formatDateValue(dateValue)));
        td.append(span);
        break;
      }
      case "url": {
        const url = String(value);
        const link = h("a", "nt-link-value") as HTMLAnchorElement;
        link.href = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(url) ? url : `https://${url}`;
        link.target = "_blank";
        link.rel = "noopener";
        link.append(h("span", "", url.replace(/^https?:\/\//, "")));
        td.append(link);
        break;
      }
      case "email": {
        const link = h("a", "nt-link-value nt-mail-link") as HTMLAnchorElement;
        link.href = `mailto:${String(value)}`;
        link.append(h("span", "", String(value)));
        td.append(link);
        break;
      }
      case "created_time":
      case "last_edited_time": {
        const span = h(
          "span",
          `nt-readonly-value nt-time-${property.type === "created_time" ? "created" : "edited"}`,
        );
        span.append(h("span", "", formatTimestamp(Number(value), true)));
        td.append(span);
        break;
      }
      default:
        td.append(h("span", "nt-text-value", String(value ?? "")));
    }
  }

  private renderTitleCell(
    td: HTMLElement,
    row: DatabaseRow,
    property: DatabaseProperty,
    value: unknown,
  ): void {
    const text = String(value ?? "");
    const wrap = h("div", "nt-title-cell");
    if (row.icon) wrap.append(h("span", "nt-row-emoji", row.icon));
    const title = h(
      "span",
      `nt-cell-text${text ? "" : " is-placeholder"}`,
      text || "未命名",
    );
    wrap.append(title);
    const actions = h("div", "nt-title-actions");
    const open = h("button", "nt-row-action nt-row-action-open") as HTMLButtonElement;
    open.type = "button";
    open.tabIndex = -1;
    open.title = "打开记录页面";
    open.setAttribute("aria-label", "打开记录页面");
    const menu = h("button", "nt-row-action nt-row-action-menu") as HTMLButtonElement;
    menu.type = "button";
    menu.tabIndex = -1;
    menu.title = "记录选项";
    menu.setAttribute("aria-label", "记录选项");
    actions.append(open, menu);
    wrap.append(actions);
    td.append(wrap);
    td.addClass("nt-title-td");
    void property;
  }

  private isRowDone(row: DatabaseRow): boolean {
    const cached = this.rowDoneCache.get(row.id);
    if (cached !== undefined) return cached;
    if (!this.db) return false;
    let done = false;
    const checkboxes = this.db.properties.filter(
      (property) =>
        property.type === "checkbox" && /完成|done|complete|finish/i.test(property.name),
    );
    for (const property of checkboxes) {
      if (getCell(row, property) === true) {
        done = true;
        break;
      }
    }
    if (!done) {
      const status = this.db.properties.find((property) => property.type === "status");
      if (status) {
        const name = optionById(status, getCell(row, status))?.name || "";
        done = /已完成|完成|done|complete/i.test(name);
      }
    }
    this.rowDoneCache.set(row.id, done);
    return done;
  }

  private toggleCellCheckbox(row: DatabaseRow, property: DatabaseProperty): void {
    if (!this.db) return;
    setCell(row, property, getCell(row, property) !== true);
    this.persist();
    this.refreshAfterCellEdit(row, property);
  }

  private viewDependsOnEdit(view: ViewConfig, property: DatabaseProperty): boolean {
    if (view.search.trim()) return true;
    // Any edit bumps updatedAt, so views keyed on last_edited_time are affected too.
    const affected = (id: string | null | undefined): boolean => {
      if (!id) return false;
      const target = this.propertiesById.get(id);
      return Boolean(target && (target.id === property.id || target.type === "last_edited_time"));
    };
    return (
      affected(view.groupBy) ||
      view.filters.some((rule) => affected(rule.propertyId)) ||
      view.sorts.some((sort) => affected(sort.propertyId))
    );
  }

  private refreshAfterCellEdit(row: DatabaseRow, property: DatabaseProperty): void {
    if (!this.db) return;
    const view = this.activeView;
    if (!view) return;
    this.rowDoneCache.delete(row.id);
    if (this.viewDependsOnEdit(view, property)) {
      this.renderTablePreserveScroll(undefined, false);
      return;
    }
    this.refreshRowCells(row, property);
    this.refreshCalculationCell(property);
  }

  private refreshRowCells(row: DatabaseRow, property: DatabaseProperty): void {
    const tr = this.rowEls.get(row.id);
    if (!tr) {
      this.renderTablePreserveScroll(undefined, false);
      return;
    }
    const refreshDates = property.type === "checkbox" || property.type === "status";
    for (const td of Array.from(tr.querySelectorAll<HTMLElement>("td.nt-cell"))) {
      const propertyId = td.dataset.propertyId;
      const cellProperty = propertyId ? this.propertiesById.get(propertyId) : undefined;
      if (!cellProperty) continue;
      if (
        cellProperty.id === property.id ||
        cellProperty.type === "last_edited_time" ||
        (refreshDates && cellProperty.type === "date")
      ) {
        this.renderCellContent(td, row, cellProperty);
      }
    }
  }

  private refreshCalculationCell(property: DatabaseProperty): void {
    if (!this.db || !this.activeView) return;
    const valueEl = this.calcValueEls.get(property.id);
    if (!valueEl) return;
    const configured = this.activeView.calculations[property.id] || "none";
    if (configured === "none") return;
    valueEl.setText(calculate(this.db, property, this.currentRows, configured) || "—");
  }

  private activateCell(td: HTMLElement, row: DatabaseRow, property: DatabaseProperty): void {
    if (!this.db || isReadOnlyProperty(property)) return;
    switch (property.type) {
      case "checkbox":
        this.toggleCellCheckbox(row, property);
        break;
      case "select":
      case "status":
      case "multi_select":
        this.openOptionPicker(td, row, property);
        break;
      case "date":
        this.openDatePicker(td, row, property);
        break;
      default:
        this.beginTextEdit(td, row, property);
    }
  }

  private beginTextEdit(td: HTMLElement, row: DatabaseRow, property: DatabaseProperty): void {
    if (this.activeEditor) this.closeEditor(true);
    closeActivePopover();
    const initial = String(getCell(row, property) ?? "");
    clear(td);
    td.removeClass("nt-cell-empty");
    td.addClass("is-editing");
    const input = td.createEl("input", {
      cls: "nt-cell-input",
      type: property.type === "email" ? "email" : "text",
      value: initial,
      attr: {
        placeholder: property.type === "title" ? "未命名" : "",
        "aria-label": property.name,
      },
    });
    if (property.type === "number") input.inputMode = "decimal";
    const editor: ActiveEditor = {
      td,
      row,
      property,
      input,
      original: initial,
      done: false,
    };
    this.activeEditor = editor;
    const finish = () => {
      if (editor.done) return;
      editor.done = true;
      this.activeEditor = null;
      const raw = input.value;
      let value: CellValue = raw.trim() === "" ? null : raw.trim();
      if (property.type === "number" && value !== null) {
        const numeric = Number(String(value).replace(/,/g, ""));
        if (!Number.isFinite(numeric)) {
          notify("请输入有效数字");
          td.empty();
          td.removeClass("is-editing");
          this.renderCellContent(td, row, property);
          return;
        }
        value = numeric;
      }
      if (property.type === "title") value = raw.trim();
      const changed = String(getCell(row, property) ?? "") !== String(value ?? "");
      if (changed) {
        setCell(row, property, value);
        this.persist();
      }
      if (changed) this.refreshAfterCellEdit(row, property);
      else this.renderCellContent(td, row, property);
    };
    const cancel = () => {
      editor.done = true;
      this.activeEditor = null;
      input.removeEventListener("blur", finish);
      td.empty();
      td.removeClass("is-editing");
      this.renderCellContent(td, row, property);
    };
    input.addEventListener("blur", finish);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      } else if (event.key === "Escape") {
        event.preventDefault();
        editor.done = true;
        this.activeEditor = null;
        input.removeEventListener("blur", finish);
        cancel();
      } else if (event.key === "Tab") {
        event.preventDefault();
        input.blur();
      }
    });
    window.setTimeout(() => {
      input.focus();
      if (property.type === "title" || property.type === "number") input.select();
      else input.setSelectionRange(input.value.length, input.value.length);
    }, 0);
  }

  private closeEditor(commit: boolean): void {
    const editor = this.activeEditor;
    if (!editor) return;
    this.activeEditor = null;
    if (commit) {
      editor.input.blur();
    } else {
      editor.done = true;
      editor.td.empty();
      editor.td.removeClass("is-editing");
      this.renderCellContent(editor.td, editor.row, editor.property);
    }
  }

  private startColumnResize(
    event: PointerEvent,
    th: HTMLElement,
    property: DatabaseProperty,
  ): void {
    if (!this.db) return;
    const startX = event.clientX;
    const startWidth = property.width || 170;
    const table = this.tableEl;
    const startTableWidth = table?.getBoundingClientRect().width || 0;
    th.addClass("is-resizing");
    document.body.addClass("nt-resizing-column");

    const move = (moveEvent: PointerEvent) => {
      const width = Math.max(80, Math.min(600, startWidth + (moveEvent.clientX - startX)));
      property.width = Math.round(width);
      th.style.width = `${property.width}px`;
      const col = this.tableColEls.get(property.id);
      if (col) col.style.width = `${property.width}px`;
      if (table) {
        table.style.width = `${Math.max(680, startTableWidth + (property.width - startWidth))}px`;
      }
    };
    const up = () => {
      th.removeClass("is-resizing");
      document.body.removeClass("nt-resizing-column");
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      this.persist();
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  }

  private findCell(rowId: string, propertyId: string): HTMLElement | null {
    const tr = this.rowEls.get(rowId);
    if (!tr) return null;
    for (const child of Array.from(tr.children)) {
      if (!(child instanceof HTMLElement) || !child.classList.contains("nt-cell")) continue;
      if (child.dataset.propertyId === propertyId) return child;
    }
    return null;
  }

  addRowAndFocus(): void {
    if (!this.db) return;
    const row = createRow(this.db);
    this.db.rows.push(row);
    this.persist();
    if (this.activeView?.type === "chart") {
      this.renderChartView();
      notify("已添加一条记录，图表已更新");
      return;
    }
    this.renderTablePreserveScroll(
      () => {
        if (!this.db) return;
        const title = titleProperty(this.db);
        const cell = this.findCell(row.id, title.id);
        if (cell) {
          cell.scrollIntoView({ block: "nearest", inline: "nearest" });
          this.beginTextEdit(cell, row, title);
        } else {
          notify("新记录已被当前筛选条件隐藏");
        }
      },
      true,
      row.id,
    );
  }

  private async deleteSelectedRows(): Promise<void> {
    if (!this.db || this.selectedRows.size === 0) return;
    const confirmed = await confirmAction(
      this.app,
      "删除记录",
      `确定要删除选中的 ${this.selectedRows.size} 条记录吗？此操作无法撤销。`,
      { confirmLabel: "删除记录" },
    );
    if (!confirmed) return;
    const ids = new Set(this.selectedRows);
    this.db.rows = this.db.rows.filter((row) => !ids.has(row.id));
    this.selectedRows.clear();
    this.persist();
    this.renderTablePreserveScroll();
    this.updateTableCount(filteredRows(this.db, this.activeView!).length);
  }

  exportCsv(): void {
    if (!this.db || !this.activeView) return;
    const view = this.activeView;
    const rows = filteredRows(this.db, view);
    const content = csvForView(this.db, view, rows);
    const filename = sanitizeFilename(`${this.db.title} - ${view.name}`) + ".csv";
    downloadTextFile(filename, content, "text/csv");
    notify(`已导出 ${rows.length} 条记录`);
  }

  private openRowPage(row: DatabaseRow): void {
    if (!this.db) return;
    const modal = new RowPageModal(this.app, this.db, row, {
      onMutate: () => this.persist(),
      onDelete: (target) => {
        if (!this.db) return;
        this.db.rows = this.db.rows.filter((item) => item.id !== target.id);
        this.selectedRows.delete(target.id);
        this.persist();
      },
      onCloseRefresh: () => {
        this.renderTablePreserveScroll(undefined, false);
      },
    });
    modal.open();
  }

  private menuItem(
    parent: HTMLElement,
    icon: string,
    label: string,
    action: () => void,
    options: { danger?: boolean; checked?: boolean; disabled?: boolean; hint?: string } = {},
  ): HTMLButtonElement {
    const item = parent.createEl("button", {
      cls: `nt-menu-item${options.danger ? " is-danger" : ""}${options.disabled ? " is-disabled" : ""}`,
      attr: { type: "button" },
    });
    item.disabled = Boolean(options.disabled);
    item.append(iconEl(icon, "nt-menu-icon"));
    item.createSpan({ cls: "nt-menu-label", text: label });
    if (options.hint) item.createSpan({ cls: "nt-menu-hint", text: options.hint });
    if (options.checked) item.append(iconEl("check", "nt-menu-check"));
    item.addEventListener("click", () => {
      if (options.disabled) return;
      action();
    });
    return item;
  }

  private openPageMenu(anchor: HTMLElement): void {
    if (!this.db) return;
    openPopover(anchor, "nt-menu-popover", (content, popover) => {
      content.createDiv({ cls: "nt-menu-heading", text: this.db!.title });
      this.menuItem(content, "circle-help", "使用帮助", () => {
        popover.close();
        new HelpModal(this.app).open();
      });
      this.menuItem(content, "download", "导出当前视图为 CSV", () => {
        popover.close();
        this.exportCsv();
      });
      this.menuItem(content, "copy", "复制视图标签", () => {
        try {
          void navigator.clipboard
            ?.writeText(`${this.db!.title} / ${this.activeView!.name}`)
            .catch(() => undefined);
        } catch {
          // Clipboard access can be restricted; the menu should still close.
        }
        popover.close();
        notify("视图名称已复制");
      });
      content.createDiv({ cls: "nt-menu-divider" });
      this.menuItem(
        content,
        "trash-2",
        "删除数据库",
        () => {
          popover.close();
          void this.deleteDatabase();
        },
        { danger: true },
      );
    });
  }

  private openViewOptionsMenu(anchor: HTMLElement): void {
    if (!this.db) return;
    const view = this.activeView!;
    openPopover(anchor, "nt-menu-popover", (content, popover) => {
      content.createDiv({ cls: "nt-menu-heading", text: "视图选项" });
      this.menuItem(
        content,
        "sigma",
        "显示计算",
        () => {
          view.showCalculations = !view.showCalculations;
          this.persist();
          popover.close();
          this.renderTablePreserveScroll();
        },
        { checked: view.showCalculations },
      );
      this.menuItem(
        content,
        "wrap-text",
        "自动换行",
        () => {
          view.wrapText = !view.wrapText;
          this.persist();
          popover.close();
          this.renderTablePreserveScroll();
        },
        { checked: view.wrapText },
      );
      this.menuItem(
        content,
        "layers",
        "按属性分组",
        () => {
          popover.close();
          this.openGroupPanel(anchor);
        },
        { checked: Boolean(view.groupBy) },
      );
      content.createDiv({ cls: "nt-menu-divider" });
      this.menuItem(content, "download", "导出当前视图为 CSV", () => {
        popover.close();
        this.exportCsv();
      });
      this.menuItem(content, "eraser", "清空当前视图的筛选与排序", () => {
        view.filters = [];
        view.sorts = [];
        view.search = "";
        view.collapsedGroups = [];
        this.persist();
        popover.close();
        this.renderAll();
      });
      content.createDiv({ cls: "nt-menu-divider" });
      this.menuItem(
        content,
        "trash-2",
        "删除全部记录",
        () => {
          popover.close();
          void this.deleteAllRows();
        },
        { danger: true },
      );
    }, { width: 250 });
  }

  private async deleteDatabase(): Promise<void> {
    if (!this.file) return;
    const confirmed = await confirmAction(
      this.app,
      "删除数据库",
      `确定要删除「${this.db?.title || this.file.basename}」吗？数据库文件会被移到回收站。`,
      { confirmLabel: "删除数据库" },
    );
    if (!confirmed || !this.file) return;
    await this.app.fileManager.trashFile(this.file);
  }

  private async deleteAllRows(): Promise<void> {
    if (!this.db || this.db.rows.length === 0) return;
    const confirmed = await confirmAction(
      this.app,
      "删除全部记录",
      `确定要删除全部 ${this.db.rows.length} 条记录吗？属性和视图会保留，此操作无法撤销。`,
      { confirmLabel: "删除全部记录" },
    );
    if (!confirmed || !this.db) return;
    this.db.rows = [];
    this.selectedRows.clear();
    this.persist();
    this.renderTablePreserveScroll();
  }

  private openEmojiPicker(anchor: HTMLElement): void {
    if (!this.db) return;
    openPopover(
      anchor,
      "nt-emoji-popover",
      (content, popover) => {
        const input = content.createEl("input", {
          cls: "nt-text-input nt-emoji-input",
          type: "text",
          value: this.db!.icon,
          attr: { placeholder: "输入一个 emoji", maxlength: "4" },
        });
        const grid = content.createDiv({ cls: "nt-emoji-grid" });
        for (const emoji of EMOJI_CHOICES) {
          const button = grid.createEl("button", {
            cls: "nt-emoji-choice",
            text: emoji,
            attr: { type: "button" },
          });
          button.addEventListener("click", () => {
            this.setDatabaseIcon(emoji);
            popover.close();
          });
        }
        const footer = content.createDiv({ cls: "nt-emoji-footer" });
        const remove = footer.createEl("button", {
          cls: "nt-button nt-button-quiet",
          text: "移除图标",
        });
        remove.addEventListener("click", () => {
          this.setDatabaseIcon("");
          popover.close();
        });
        input.addEventListener("input", () => {
          const value = input.value.trim();
          if (!value) return;
          this.setDatabaseIcon(value);
        });
        window.setTimeout(() => input.focus(), 20);
      },
      { width: 304 },
    );
  }

  private setDatabaseIcon(icon: string): void {
    if (!this.db) return;
    this.db.icon = icon;
    if (this.iconButton) this.iconButton.setText(icon || "🗂️");
    this.persist();
  }

  private uniqueViewName(base: string): string {
    if (!this.db) return base;
    let name = base;
    let index = 2;
    while (this.db.views.some((view) => view.name === name)) {
      name = `${base} ${index}`;
      index += 1;
    }
    return name;
  }

  private openAddViewMenu(anchor: HTMLElement): void {
    if (!this.db) return;
    openPopover(anchor, "nt-menu-popover", (content, popover) => {
      content.createDiv({ cls: "nt-menu-heading", text: "添加视图" });
      this.menuItem(content, "table-2", "表格视图", () => {
        const view = createView(this.uniqueViewName("表格"));
        this.db!.views.push(view);
        this.db!.activeViewId = view.id;
        this.selectedRows.clear();
        this.persist();
        popover.close();
        this.renderAll();
      });
      content.createDiv({ cls: "nt-menu-divider" });
      this.menuItem(content, "chart-line", "折线图", () => {
        const view = createChartView(
          this.db!,
          "line",
          this.uniqueViewName("折线图"),
        );
        this.db!.views.push(view);
        this.db!.activeViewId = view.id;
        this.selectedRows.clear();
        this.persist();
        popover.close();
        this.renderAll();
      });
      this.menuItem(content, "chart-pie", "饼图", () => {
        const view = createChartView(
          this.db!,
          "pie",
          this.uniqueViewName("饼图"),
        );
        this.db!.views.push(view);
        this.db!.activeViewId = view.id;
        this.selectedRows.clear();
        this.persist();
        popover.close();
        this.renderAll();
      });
      content.createDiv({ cls: "nt-menu-divider" });
      this.menuItem(content, "copy", "复制当前视图", () => {
        popover.close();
        this.duplicateActiveView();
      });
      content.createDiv({ cls: "nt-menu-note", text: "支持表格、折线图和饼图视图。" });
    }, { width: 230 });
  }

  private duplicateActiveView(): void {
    if (!this.db || !this.activeView) return;
    const source = deepClone(this.activeView);
    source.id = uid("view");
    source.name = this.uniqueViewName(`${source.name} 副本`);
    source.filters = source.filters.map((rule) => ({ ...rule, id: uid("filter") }));
    source.sorts = source.sorts.map((sort) => ({ ...sort, id: uid("sort") }));
    const sourceIndex = this.db.views.findIndex((view) => view.id === this.activeView!.id);
    this.db.views.splice(sourceIndex + 1, 0, source);
    this.db.activeViewId = source.id;
    this.selectedRows.clear();
    this.persist();
    this.renderAll();
  }

  private openViewMenu(anchor: HTMLElement, view: ViewConfig): void {
    if (!this.db) return;
    openPopover(anchor, "nt-menu-popover", (content, popover) => {
      content.createDiv({ cls: "nt-menu-heading", text: view.name });
      this.menuItem(content, "pencil", "重命名视图", () => {
        popover.close();
        void this.renameView(view, anchor);
      });
      this.menuItem(content, "copy", "复制视图", () => {
        popover.close();
        this.duplicateView(view);
      });
      content.createDiv({ cls: "nt-menu-divider" });
      this.menuItem(
        content,
        "trash-2",
        "删除视图",
        () => {
          popover.close();
          void this.deleteView(view);
        },
        { danger: true, disabled: this.db!.views.length <= 1 },
      );
      if (this.db.views.length <= 1) {
        content.createDiv({ cls: "nt-menu-note", text: "至少保留一个视图。" });
      }
    }, { width: 220 });
  }

  private async renameView(view: ViewConfig, _anchor: HTMLElement): Promise<void> {
    const name = await promptText(this.app, {
      title: "重命名视图",
      label: "视图名称",
      value: view.name,
      submitLabel: "保存",
    });
    if (!name || !this.db) return;
    view.name = name;
    this.persist();
    this.renderAll();
  }

  private duplicateView(view: ViewConfig): void {
    if (!this.db) return;
    const copy = deepClone(view);
    copy.id = uid("view");
    copy.name = this.uniqueViewName(`${view.name} 副本`);
    copy.filters = copy.filters.map((rule) => ({ ...rule, id: uid("filter") }));
    copy.sorts = copy.sorts.map((sort) => ({ ...sort, id: uid("sort") }));
    const index = this.db.views.findIndex((item) => item.id === view.id);
    this.db.views.splice(index + 1, 0, copy);
    this.db.activeViewId = copy.id;
    this.selectedRows.clear();
    this.persist();
    this.renderAll();
  }

  private async deleteView(view: ViewConfig): Promise<void> {
    if (!this.db || this.db.views.length <= 1) return;
    const confirmed = await confirmAction(
      this.app,
      "删除视图",
      `确定要删除视图「${view.name}」吗？这不会删除数据库中的记录。`,
      { confirmLabel: "删除视图" },
    );
    if (!confirmed || !this.db) return;
    this.db.views = this.db.views.filter((item) => item.id !== view.id);
    if (this.db.activeViewId === view.id) this.db.activeViewId = this.db.views[0].id;
    this.persist();
    this.renderAll();
  }

  private openPropertiesPanel(anchor: HTMLElement): void {
    if (!this.db) return;
    openPopover(
      anchor,
      "nt-properties-popover",
      (content, popover) => {
        const build = () => {
          clear(content);
          const header = content.createDiv({ cls: "nt-popover-heading" });
          header.createSpan({ text: "属性" });
          header.createSpan({
            cls: "nt-popover-subtitle",
            text: `${this.db!.properties.length} 个属性`,
          });
          const list = content.createDiv({ cls: "nt-property-list" });
          const view = this.activeView!;
          this.db!.properties.forEach((property, index) => {
            const isTitle = property.type === "title";
            const hidden = view.hiddenProperties.includes(property.id);
            const row = list.createDiv({
              cls: `nt-property-row${hidden ? " is-hidden" : ""}`,
            });
            const visibility = row.createEl("button", {
              cls: "nt-icon-button nt-property-visibility",
              attr: {
                type: "button",
                "aria-label": hidden ? "显示属性" : "隐藏属性",
                title: isTitle ? "名称属性不能隐藏" : hidden ? "显示属性" : "隐藏属性",
              },
            });
            visibility.append(iconEl(hidden ? "eye-off" : "eye", "nt-icon"));
            if (isTitle) visibility.addClass("is-disabled");
            visibility.addEventListener("click", () => {
              if (isTitle) return;
              if (hidden) view.hiddenProperties = view.hiddenProperties.filter((id) => id !== property.id);
              else view.hiddenProperties.push(property.id);
              this.persist();
              this.renderTablePreserveScroll();
              build();
            });
            row.append(iconEl(this.propertyIcon(property), "nt-property-row-icon"));
            row.createSpan({ cls: "nt-property-row-name", text: property.name });
            const controls = row.createDiv({ cls: "nt-property-row-controls" });
            const up = controls.createEl("button", {
              cls: "nt-icon-button nt-mini-icon-button",
              attr: { type: "button", "aria-label": "上移属性" },
            });
            up.append(iconEl("arrow-up", "nt-icon"));
            up.disabled = index === 0;
            up.addEventListener("click", () => this.moveProperty(index, -1));
            const down = controls.createEl("button", {
              cls: "nt-icon-button nt-mini-icon-button",
              attr: { type: "button", "aria-label": "下移属性" },
            });
            down.append(iconEl("arrow-down", "nt-icon"));
            down.disabled = index === this.db!.properties.length - 1;
            down.addEventListener("click", () => this.moveProperty(index, 1));
          });
          const footer = content.createDiv({ cls: "nt-popover-footer" });
          const add = footer.createEl("button", {
            cls: "nt-menu-item nt-menu-item-strong",
            attr: { type: "button" },
          });
          add.append(iconEl("plus", "nt-menu-icon"));
          add.createSpan({ text: "新建属性" });
          add.addEventListener("click", () => {
            popover.close();
            void this.createProperty();
          });
        };
        build();
        this.propertiesPanelRefresh = build;
      },
      { width: 340, align: "end" },
    );
  }

  private propertiesPanelRefresh: (() => void) | null = null;

  private moveProperty(index: number, delta: number): void {
    if (!this.db) return;
    const target = index + delta;
    if (target < 0 || target >= this.db.properties.length) return;
    const [property] = this.db.properties.splice(index, 1);
    this.db.properties.splice(target, 0, property);
    this.persist();
    this.renderTablePreserveScroll();
    if (document.querySelector(".nt-properties-popover")) this.propertiesPanelRefresh?.();
  }

  private async createProperty(): Promise<void> {
    if (!this.db) return;
    closeActivePopover();
    const result = await new NewPropertyModal(
      this.app,
      this.db.properties.map((property) => property.name),
    ).wait();
    if (!result || !this.db) return;
    const width =
      result.type === "number"
        ? 110
        : result.type === "checkbox"
          ? 90
          : result.type === "date"
            ? 150
            : result.type === "multi_select"
              ? 200
              : 170;
    const property: DatabaseProperty = {
      id: uid("prop"),
      name: result.name,
      type: result.type,
      width,
      ...(result.type === "select" || result.type === "multi_select" || result.type === "status"
        ? { options: [] }
        : {}),
      ...(result.type === "number" ? { numberFormat: result.numberFormat } : {}),
    };
    this.db.properties.push(property);
    this.persist();
    this.renderTablePreserveScroll();
    notify(`已添加属性「${property.name}」`);
  }

  private openCalculationMenu(anchor: HTMLElement, property: DatabaseProperty): void {
    if (!this.db) return;
    const view = this.activeView!;
    openPopover(anchor, "nt-menu-popover", (content, popover) => {
      content.createDiv({ cls: "nt-menu-heading", text: `${property.name} · 计算` });
      for (const type of calculationOptions(property)) {
        this.menuItem(
          content,
          type === "none" ? "ban" : "sigma",
          calculationLabel(type),
          () => {
            if (type === "none") delete view.calculations[property.id];
            else view.calculations[property.id] = type;
            this.persist();
            popover.close();
            this.renderTablePreserveScroll();
          },
          { checked: (view.calculations[property.id] || "none") === type },
        );
      }
    }, { width: 220, align: "end" });
  }

  private openRowMenu(anchor: HTMLElement, row: DatabaseRow): void {
    if (!this.db) return;
    openPopover(anchor, "nt-menu-popover", (content, popover) => {
      content.createDiv({
        cls: "nt-menu-heading",
        text: String(getCell(row, titleProperty(this.db!)) || "未命名"),
      });
      this.menuItem(content, "maximize-2", "打开记录页面", () => {
        popover.close();
        this.openRowPage(row);
      });
      this.menuItem(content, "copy", "复制记录", () => {
        popover.close();
        this.duplicateRowAt(row);
      });
      content.createDiv({ cls: "nt-menu-divider" });
      this.menuItem(content, "arrow-up-to-line", "在上方插入记录", () => {
        popover.close();
        this.insertRowRelative(row, -1);
      });
      this.menuItem(content, "arrow-down-to-line", "在下方插入记录", () => {
        popover.close();
        this.insertRowRelative(row, 1);
      });
      content.createDiv({ cls: "nt-menu-divider" });
      this.menuItem(
        content,
        "trash-2",
        "删除记录",
        () => {
          popover.close();
          void this.deleteRow(row);
        },
        { danger: true },
      );
    }, { width: 240 });
  }

  private duplicateRowAt(row: DatabaseRow): void {
    if (!this.db) return;
    const copy = duplicateRow(row);
    const index = this.db.rows.findIndex((item) => item.id === row.id);
    this.db.rows.splice(index + 1, 0, copy);
    this.persist();
    this.renderTablePreserveScroll(undefined, true, copy.id);
  }

  private insertRowRelative(row: DatabaseRow, delta: number): void {
    if (!this.db) return;
    const newRow = createRow(this.db);
    const index = this.db.rows.findIndex((item) => item.id === row.id);
    this.db.rows.splice(delta < 0 ? index : index + 1, 0, newRow);
    this.persist();
    this.renderTablePreserveScroll(
      () => {
        if (!this.db) return;
        const title = titleProperty(this.db);
        const cell = this.findCell(newRow.id, title.id);
        if (cell) this.beginTextEdit(cell, newRow, title);
      },
      true,
      newRow.id,
    );
  }

  private async deleteRow(row: DatabaseRow): Promise<void> {
    if (!this.db) return;
    const confirmed = await confirmAction(
      this.app,
      "删除记录",
      `确定要删除「${String(getCell(row, titleProperty(this.db)) || "未命名")}」吗？此操作无法撤销。`,
      { confirmLabel: "删除记录" },
    );
    if (!confirmed || !this.db) return;
    this.db.rows = this.db.rows.filter((item) => item.id !== row.id);
    this.selectedRows.delete(row.id);
    this.persist();
    this.renderTablePreserveScroll();
  }

  private openPropertyMenu(anchor: HTMLElement, property: DatabaseProperty): void {
    if (!this.db) return;
    const index = this.db.properties.findIndex((item) => item.id === property.id);
    const isTitle = property.type === "title";
    openPopover(anchor, "nt-menu-popover", (content, popover) => {
      content.createDiv({
        cls: "nt-menu-heading",
        text: property.name,
      });
      const detail = content.createDiv({ cls: "nt-menu-property-type" });
      detail.append(iconEl(this.propertyIcon(property), "nt-menu-icon"));
      detail.createSpan({ text: property.type === "title" ? "标题属性" : this.typeLabel(property.type) });

      this.menuItem(content, "pencil", "重命名属性", () => {
        popover.close();
        void this.renameProperty(property);
      });
      this.menuItem(
        content,
        "arrow-left",
        "向左移动",
        () => {
          popover.close();
          this.moveProperty(index, -1);
        },
        { disabled: index === 0 },
      );
      this.menuItem(
        content,
        "arrow-right",
        "向右移动",
        () => {
          popover.close();
          this.moveProperty(index, 1);
        },
        { disabled: index === this.db!.properties.length - 1 },
      );
      content.createDiv({ cls: "nt-menu-divider" });
      this.menuItem(content, "arrow-up-narrow-wide", "升序排序", () => {
        popover.close();
        this.sortByProperty(property, "asc");
      });
      this.menuItem(content, "arrow-down-wide-narrow", "降序排序", () => {
        popover.close();
        this.sortByProperty(property, "desc");
      });
      this.menuItem(content, "list-filter", "添加筛选", () => {
        popover.close();
        this.addFilterForProperty(property);
      });
      if (!isTitle) {
        this.menuItem(content, "eye-off", "隐藏属性", () => {
          popover.close();
          const view = this.activeView!;
          if (!view.hiddenProperties.includes(property.id)) {
            view.hiddenProperties.push(property.id);
            this.persist();
            this.renderTablePreserveScroll();
          }
        });
      }
      content.createDiv({ cls: "nt-menu-divider" });
      this.menuItem(
        content,
        "trash-2",
        "删除属性",
        () => {
          popover.close();
          void this.deleteProperty(property);
        },
        { danger: true, disabled: isTitle },
      );
      if (isTitle) {
        content.createDiv({ cls: "nt-menu-note", text: "名称属性不能删除或隐藏。" });
      }
    }, { width: 245 });
  }

  private typeLabel(type: DatabaseProperty["type"]): string {
    switch (type) {
      case "text":
        return "文本";
      case "number":
        return "数字";
      case "select":
        return "单选";
      case "multi_select":
        return "多选";
      case "status":
        return "状态";
      case "date":
        return "日期";
      case "checkbox":
        return "复选框";
      case "url":
        return "网址";
      case "email":
        return "邮箱";
      case "created_time":
        return "创建时间";
      case "last_edited_time":
        return "最后编辑时间";
      default:
        return "标题";
    }
  }

  private async renameProperty(property: DatabaseProperty): Promise<void> {
    const name = await promptText(this.app, {
      title: "重命名属性",
      label: "属性名称",
      value: property.name,
      submitLabel: "保存",
    });
    if (!name || !this.db) return;
    property.name = name;
    this.persist();
    this.renderTablePreserveScroll();
  }

  private sortByProperty(property: DatabaseProperty, direction: "asc" | "desc"): void {
    if (!this.db || !this.activeView) return;
    const view = this.activeView;
    view.sorts = view.sorts.filter((sort) => sort.propertyId !== property.id);
    view.sorts.unshift({
      id: uid("sort"),
      propertyId: property.id,
      direction,
    });
    this.persist();
    this.renderTablePreserveScroll();
    if (this.sortButton) {
      this.sortButton.addClass("is-active");
      this.updateBadge(this.sortButton, view.sorts.length);
    }
  }

  private addFilterForProperty(property: DatabaseProperty): void {
    if (!this.db || !this.activeView) return;
    const view = this.activeView;
    view.filters.push(defaultFilter(property));
    this.persist();
    this.renderTablePreserveScroll();
    if (this.filterButton) {
      this.filterButton.addClass("is-active");
      this.updateBadge(this.filterButton, view.filters.length);
      window.setTimeout(() => this.openFilterPanel(this.filterButton!), 20);
    }
  }

  private async deleteProperty(property: DatabaseProperty): Promise<void> {
    if (!this.db || property.type === "title") return;
    const confirmed = await confirmAction(
      this.app,
      "删除属性",
      `确定要删除属性「${property.name}」吗？该列中的所有数据都会被删除。`,
      { confirmLabel: "删除属性" },
    );
    if (!confirmed || !this.db) return;
    this.db.properties = this.db.properties.filter((item) => item.id !== property.id);
    for (const row of this.db.rows) delete row.cells[property.id];
    for (const view of this.db.views) {
      view.filters = view.filters.filter((rule) => rule.propertyId !== property.id);
      view.sorts = view.sorts.filter((sort) => sort.propertyId !== property.id);
      view.hiddenProperties = view.hiddenProperties.filter((id) => id !== property.id);
      delete view.calculations[property.id];
      if (view.groupBy === property.id) view.groupBy = null;
      if (view.chart.xPropertyId === property.id) view.chart.xPropertyId = null;
      if (view.chart.valuePropertyId === property.id) {
        view.chart.valuePropertyId = null;
        view.chart.aggregation = "count";
      }
      if (view.chart.groupByPropertyId === property.id) {
        view.chart.groupByPropertyId = null;
      }
    }
    this.persist();
    this.renderTablePreserveScroll();
  }

  private refreshFilterBadge(): void {
    if (!this.filterButton || !this.activeView) return;
    this.filterButton.toggleClass("is-active", this.activeView.filters.length > 0);
    this.updateBadge(this.filterButton, this.activeView.filters.length);
  }

  private refreshSortBadge(): void {
    if (!this.sortButton || !this.activeView) return;
    this.sortButton.toggleClass("is-active", this.activeView.sorts.length > 0);
    this.updateBadge(this.sortButton, this.activeView.sorts.length);
  }

  private refreshGroupBadge(): void {
    if (!this.groupButton || !this.activeView) return;
    this.groupButton.toggleClass("is-active", Boolean(this.activeView.groupBy));
  }

  private applyFilterChange(): void {
    this.persist();
    this.refreshFilterBadge();
    this.renderTablePreserveScroll();
  }

  private applySortChange(): void {
    this.persist();
    this.refreshSortBadge();
    this.renderTablePreserveScroll();
  }

  private openFilterPanel(anchor: HTMLElement): void {
    if (!this.db) return;
    const view = this.activeView!;
    openPopover(
      anchor,
      "nt-filter-popover",
      (content) => {
        const render = () => {
          clear(content);
          const header = content.createDiv({ cls: "nt-popover-heading" });
          header.createSpan({ text: "筛选" });
          const subtitle = header.createSpan({ cls: "nt-popover-subtitle" });
          if (view.filters.length > 1) {
            const toggle = subtitle.createDiv({ cls: "nt-conjunction-toggle" });
            const and = toggle.createEl("button", {
              cls: view.conjunction === "and" ? "is-active" : "",
              text: "全部",
              attr: { type: "button" },
            });
            const or = toggle.createEl("button", {
              cls: view.conjunction === "or" ? "is-active" : "",
              text: "任一",
              attr: { type: "button" },
            });
            and.addEventListener("click", () => {
              view.conjunction = "and";
              this.applyFilterChange();
              render();
            });
            or.addEventListener("click", () => {
              view.conjunction = "or";
              this.applyFilterChange();
              render();
            });
          } else {
            subtitle.setText("满足以下条件");
          }

          if (view.filters.length === 0) {
            const empty = content.createDiv({ cls: "nt-popover-empty" });
            empty.append(iconEl("list-filter", "nt-empty-popover-icon"));
            empty.createDiv({ text: "还没有筛选条件" });
            empty.createEl("p", {
              text: "筛选只作用于当前视图，不会修改数据库中的记录。",
            });
          }

          const list = content.createDiv({ cls: "nt-filter-list" });
          view.filters.forEach((rule) => {
            const property = propertyById(this.db!, rule.propertyId);
            if (!property) return;
            const row = list.createDiv({ cls: "nt-filter-row" });
            const propertySelect = row.createEl("select", { cls: "nt-select nt-filter-property" });
            for (const item of this.db!.properties) {
              propertySelect.createEl("option", {
                value: item.id,
                text: item.name,
              });
            }
            propertySelect.value = property.id;
            propertySelect.addEventListener("change", () => {
              const next = propertyById(this.db!, propertySelect.value);
              if (!next) return;
              const defaults = defaultFilter(next);
              rule.propertyId = next.id;
              rule.operator = defaults.operator;
              rule.value = defaults.value;
              this.applyFilterChange();
              render();
            });

            const operatorSelect = row.createEl("select", {
              cls: "nt-select nt-filter-operator",
            });
            for (const operator of filterOperators(property.type)) {
              operatorSelect.createEl("option", {
                value: operator.value,
                text: operator.label,
              });
            }
            operatorSelect.value = rule.operator;
            operatorSelect.addEventListener("change", () => {
              rule.operator = operatorSelect.value as FilterOperator;
              if (!operatorNeedsValue(rule.operator)) {
                rule.value = null;
              } else if (rule.value === null || rule.value === "") {
                const defaults = defaultFilter(property);
                rule.value = defaults.value;
              }
              this.applyFilterChange();
              render();
            });

            if (operatorNeedsValue(rule.operator)) {
              this.appendFilterValueEditor(row, property, rule, () => {
                this.applyFilterChange();
                if (property.type === "select" || property.type === "status" || property.type === "multi_select") {
                  render();
                }
              });
            }

            const remove = row.createEl("button", {
              cls: "nt-icon-button nt-filter-remove",
              attr: { type: "button", "aria-label": "删除筛选条件", title: "删除筛选条件" },
            });
            remove.append(iconEl("x", "nt-icon"));
            remove.addEventListener("click", () => {
              view.filters = view.filters.filter((item) => item.id !== rule.id);
              this.applyFilterChange();
              render();
            });
          });

          const footer = content.createDiv({ cls: "nt-popover-footer nt-filter-footer" });
          const add = footer.createEl("button", {
            cls: "nt-menu-item nt-menu-item-strong",
            attr: { type: "button" },
          });
          add.append(iconEl("plus", "nt-menu-icon"));
          add.createSpan({ text: "添加筛选条件" });
          add.addEventListener("click", () => {
            const first = this.db!.properties[0];
            if (first) view.filters.push(defaultFilter(first));
            this.applyFilterChange();
            render();
          });
          if (view.filters.length > 0) {
            const clearAll = footer.createEl("button", {
              cls: "nt-text-button",
              text: "清除全部",
            });
            clearAll.addEventListener("click", () => {
              view.filters = [];
              this.applyFilterChange();
              render();
            });
          }
        };
        render();
      },
      { width: 580 },
    );
  }

  private appendFilterValueEditor(
    row: HTMLElement,
    property: DatabaseProperty,
    rule: FilterRule,
    onChange: () => void,
  ): void {
    if (property.type === "checkbox") return;
    if (property.type === "select" || property.type === "status") {
      const select = row.createEl("select", { cls: "nt-select nt-filter-value" });
      select.createEl("option", { value: "", text: "选择选项…" });
      for (const option of property.options || []) {
        select.createEl("option", { value: option.id, text: option.name });
      }
      select.value = String(rule.value ?? "");
      select.addEventListener("change", () => {
        rule.value = select.value;
        onChange();
      });
      if (!property.options?.length) {
        select.disabled = true;
        select.title = "请先在表格中为这个属性创建选项";
      }
      return;
    }
    if (property.type === "multi_select") {
      const select = row.createEl("select", { cls: "nt-select nt-filter-value" });
      select.createEl("option", { value: "", text: "选择标签…" });
      for (const option of property.options || []) {
        select.createEl("option", { value: option.id, text: option.name });
      }
      select.value = String(rule.value ?? "");
      select.addEventListener("change", () => {
        rule.value = select.value;
        onChange();
      });
      return;
    }
    if (
      property.type === "date" ||
      property.type === "created_time" ||
      property.type === "last_edited_time"
    ) {
      const input = row.createEl("input", {
        cls: "nt-text-input nt-filter-value",
        type: "date",
        value: String(rule.value ?? ""),
      });
      input.addEventListener("change", () => {
        rule.value = input.value;
        onChange();
      });
      return;
    }
    if (property.type === "number") {
      const input = row.createEl("input", {
        cls: "nt-text-input nt-filter-value",
        type: "number",
        value: String(rule.value ?? ""),
        attr: { step: "any", placeholder: "数值" },
      });
      input.addEventListener("input", () => {
        rule.value = input.value === "" ? null : Number(input.value);
        onChange();
      });
      return;
    }
    const input = row.createEl("input", {
      cls: "nt-text-input nt-filter-value",
      type: "text",
      value: String(rule.value ?? ""),
      attr: { placeholder: "输入内容" },
    });
    input.addEventListener("input", () => {
      rule.value = input.value;
      onChange();
    });
  }

  private openSortPanel(anchor: HTMLElement): void {
    if (!this.db) return;
    const view = this.activeView!;
    openPopover(
      anchor,
      "nt-sort-popover",
      (content) => {
        const render = () => {
          clear(content);
          const header = content.createDiv({ cls: "nt-popover-heading" });
          header.createSpan({ text: "排序" });
          header.createSpan({
            cls: "nt-popover-subtitle",
            text: view.sorts.length ? "按顺序应用" : "选择排序属性",
          });
          if (view.sorts.length === 0) {
            const empty = content.createDiv({ cls: "nt-popover-empty" });
            empty.append(iconEl("arrow-up-down", "nt-empty-popover-icon"));
            empty.createDiv({ text: "还没有排序条件" });
            empty.createEl("p", { text: "添加条件后，表格会按顺序比较每一列。" });
          }
          const list = content.createDiv({ cls: "nt-sort-list" });
          view.sorts.forEach((sort, index) => {
            const property = propertyById(this.db!, sort.propertyId);
            if (!property) return;
            const row = list.createDiv({ cls: "nt-sort-row" });
            row.createSpan({ cls: "nt-sort-index", text: String(index + 1) });
            const select = row.createEl("select", { cls: "nt-select nt-sort-property" });
            for (const item of this.db!.properties) {
              select.createEl("option", { value: item.id, text: item.name });
            }
            select.value = property.id;
            select.addEventListener("change", () => {
              sort.propertyId = select.value;
              const next = propertyById(this.db!, select.value);
              if (next && next.type === "checkbox") {
                // Keep the sort valid; no additional conversion is needed.
              }
              this.applySortChange();
              render();
            });
            const direction = row.createEl("button", {
              cls: "nt-direction-button",
              attr: { type: "button", "aria-label": "切换排序方向" },
            });
            direction.append(
              iconEl(sort.direction === "asc" ? "arrow-up" : "arrow-down", "nt-icon"),
            );
            direction.createSpan({
              text: sort.direction === "asc" ? "升序" : "降序",
            });
            direction.addEventListener("click", () => {
              sort.direction = sort.direction === "asc" ? "desc" : "asc";
              this.applySortChange();
              render();
            });
            const remove = row.createEl("button", {
              cls: "nt-icon-button nt-sort-remove",
              attr: { type: "button", "aria-label": "删除排序条件", title: "删除排序条件" },
            });
            remove.append(iconEl("x", "nt-icon"));
            remove.addEventListener("click", () => {
              view.sorts = view.sorts.filter((item) => item.id !== sort.id);
              this.applySortChange();
              render();
            });
          });
          const footer = content.createDiv({ cls: "nt-popover-footer nt-filter-footer" });
          const add = footer.createEl("button", {
            cls: "nt-menu-item nt-menu-item-strong",
            attr: { type: "button" },
          });
          add.append(iconEl("plus", "nt-menu-icon"));
          add.createSpan({ text: "添加排序条件" });
          add.addEventListener("click", () => {
            const used = new Set(view.sorts.map((sort) => sort.propertyId));
            const candidate =
              this.db!.properties.find((property) => !used.has(property.id)) ||
              this.db!.properties[0];
            if (!candidate) return;
            view.sorts.push({
              id: uid("sort"),
              propertyId: candidate.id,
              direction: "asc",
            });
            this.applySortChange();
            render();
          });
          if (view.sorts.length > 0) {
            const clearAll = footer.createEl("button", {
              cls: "nt-text-button",
              text: "清除全部",
            });
            clearAll.addEventListener("click", () => {
              view.sorts = [];
              this.applySortChange();
              render();
            });
          }
        };
        render();
      },
      { width: 480 },
    );
  }

  private openGroupPanel(anchor: HTMLElement): void {
    if (!this.db) return;
    const view = this.activeView!;
    const candidates = this.db.properties.filter(
      (property) => property.type === "select" || property.type === "status" || property.type === "checkbox",
    );
    openPopover(anchor, "nt-menu-popover", (content, popover) => {
      content.createDiv({ cls: "nt-menu-heading", text: "分组" });
      this.menuItem(
        content,
        "ban",
        "不分组",
        () => {
          view.groupBy = null;
          view.collapsedGroups = [];
          this.persist();
          popover.close();
          this.refreshGroupBadge();
          this.renderTablePreserveScroll();
        },
        { checked: !view.groupBy },
      );
      if (candidates.length === 0) {
        content.createDiv({
          cls: "nt-menu-note",
          text: "先添加「单选」「状态」或「复选框」属性，才能按属性分组。",
        });
      }
      for (const property of candidates) {
        this.menuItem(
          content,
          this.propertyIcon(property),
          property.name,
          () => {
            view.groupBy = property.id;
            view.collapsedGroups = [];
            this.persist();
            popover.close();
            this.refreshGroupBadge();
            this.renderTablePreserveScroll();
          },
          { checked: view.groupBy === property.id },
        );
      }
    }, { width: 230 });
  }

  private openOptionPicker(anchor: HTMLElement, row: DatabaseRow, property: DatabaseProperty): void {
    if (!this.db) return;
    const isMulti = property.type === "multi_select";
    openPopover(
      anchor,
      "nt-option-popover",
      (content, popover) => {
        const header = content.createDiv({ cls: "nt-option-search-wrap" });
        header.append(iconEl("search", "nt-option-search-icon"));
        const search = header.createEl("input", {
          cls: "nt-option-search",
          type: "text",
          attr: { placeholder: "搜索或创建选项…", "aria-label": "搜索选项" },
        });
        const list = content.createDiv({ cls: "nt-option-list" });
        const clearButton = content.createEl("button", {
          cls: "nt-option-clear",
          text: isMulti ? "清除全部" : "清除选择",
        });
        clearButton.addEventListener("click", () => {
          setCell(row, property, isMulti ? [] : null);
          this.persist();
          this.refreshCell(anchor, row, property);
          if (!isMulti) {
            popover.close();
            this.refreshAfterCellEdit(row, property);
          } else {
            renderList();
            search.focus();
          }
        });

        const toggleOption = (optionId: string) => {
          if (isMulti) {
            const current = Array.isArray(getCell(row, property))
              ? [...(getCell(row, property) as string[])]
              : [];
            const index = current.indexOf(optionId);
            if (index >= 0) current.splice(index, 1);
            else current.push(optionId);
            setCell(row, property, current);
            this.persist();
            this.refreshCell(anchor, row, property);
            renderList();
            window.setTimeout(() => search.focus(), 0);
          } else {
            setCell(row, property, optionId);
            this.persist();
            popover.close();
            this.refreshAfterCellEdit(row, property);
          }
        };

        const createAndToggle = (name: string) => {
          if (!name.trim()) return;
          const option = ensureOption(property, name);
          this.persist();
          toggleOption(option.id);
        };

        const renderList = () => {
          const query = search.value.trim().toLocaleLowerCase();
          clear(list);
          const options = (property.options || []).filter((option) =>
            option.name.toLocaleLowerCase().includes(query),
          );
          const selectedValue = getCell(row, property);
          const selectedIds = Array.isArray(selectedValue) ? selectedValue : [];
          if (options.length === 0 && !query) {
            const empty = list.createDiv({ cls: "nt-option-empty" });
            empty.createSpan({ text: "还没有选项" });
            empty.createEl("p", { text: "在上方输入名称即可创建第一个选项。" });
          }
          for (const option of options) {
            const selected = isMulti
              ? selectedIds.includes(option.id)
              : selectedValue === option.id;
            const optionRow = list.createDiv({
              cls: `nt-option-row${selected ? " is-selected" : ""}`,
            });
            const main = optionRow.createEl("button", {
              cls: "nt-option-main",
              attr: { type: "button" },
            });
            const pill = main.createSpan({ cls: `nt-pill ${colorClass(option.color)}` });
            if (property.type === "status") pill.createSpan({ cls: "nt-option-dot" });
            pill.createSpan({ cls: "nt-pill-text", text: option.name });
            main.addEventListener("click", (event) => {
              event.stopPropagation();
              toggleOption(option.id);
            });
            if (selected) main.append(iconEl("check", "nt-option-check"));
            const remove = optionRow.createEl("button", {
              cls: "nt-icon-button nt-option-delete",
              attr: { type: "button", "aria-label": `删除选项 ${option.name}`, title: "删除选项" },
            });
            remove.append(iconEl("x", "nt-icon"));
            remove.addEventListener("click", (event) => {
              event.stopPropagation();
              void this.deleteSelectOption(property, option);
            });
          }
          const exact = (property.options || []).some(
            (option) => option.name.toLocaleLowerCase() === query,
          );
          if (query && !exact) {
            const create = list.createEl("button", {
              cls: "nt-option-create",
              attr: { type: "button" },
            });
            create.append(iconEl("plus", "nt-icon"));
            create.createSpan({ text: `创建 “${search.value.trim()}”` });
            create.addEventListener("click", () => createAndToggle(search.value));
          }
          if (!property.options?.length && !query) {
            // Keep the create hint visible.
          }
          const footer = content.createDiv({ cls: "nt-option-footer" });
          footer.createSpan({
            text: property.type === "status" ? "状态选项" : "按 Enter 快速创建",
          });
        };

        search.addEventListener("input", renderList);
        search.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          const query = search.value.trim();
          if (!query) return;
          const exact = (property.options || []).find(
            (option) => option.name.toLocaleLowerCase() === query.toLocaleLowerCase(),
          );
          createAndToggle(exact ? exact.name : query);
          search.value = "";
          renderList();
        });
        renderList();
        window.setTimeout(() => search.focus(), 30);
      },
      { width: 290 },
    );
  }

  private async deleteSelectOption(
    property: DatabaseProperty,
    option: { id: string; name: string },
  ): Promise<void> {
    if (!this.db) return;
    const confirmed = await confirmAction(
      this.app,
      "删除选项",
      `确定要删除选项「${option.name}」吗？使用该选项的记录会被清空这个值。`,
      { confirmLabel: "删除选项" },
    );
    if (!confirmed || !this.db) return;
    property.options = (property.options || []).filter((item) => item.id !== option.id);
    for (const row of this.db.rows) {
      const value = getCell(row, property);
      if (property.type === "multi_select" && Array.isArray(value)) {
        const next = value.filter((id) => id !== option.id);
        if (next.length !== value.length) setCell(row, property, next);
      } else if (value === option.id) {
        setCell(row, property, null);
      }
    }
    this.persist();
    closeActivePopover();
    this.renderTablePreserveScroll();
  }

  private refreshCell(anchor: HTMLElement, row: DatabaseRow, property: DatabaseProperty): void {
    if (anchor.classList.contains("nt-cell")) {
      this.renderCellContent(anchor, row, property);
    } else if (anchor.classList.contains("nt-title-cell")) {
      const td = anchor.closest("td.nt-cell") as HTMLElement | null;
      if (td) this.renderCellContent(td, row, property);
    }
  }

  private openDatePicker(anchor: HTMLElement, row: DatabaseRow, property: DatabaseProperty): void {
    if (!this.db) return;
    openPopover(
      anchor,
      "nt-date-popover",
      (content, popover) => {
        const original = (getCell(row, property) as DateValue) || null;
        const value: DateValue = original ? { ...original } : { start: "" };
        let includeEnd = Boolean(original?.end);
        let includeTime = Boolean(original?.includeTime || original?.start?.includes("T"));

        const header = content.createDiv({ cls: "nt-popover-heading" });
        header.createSpan({ text: "日期" });
        const body = content.createDiv({ cls: "nt-date-body" });

        const render = () => {
          clear(body);
          const startLabel = body.createDiv({ cls: "nt-date-field-label", text: "开始" });
          void startLabel;
          const start = body.createEl("input", {
            cls: "nt-text-input nt-date-input",
            type: includeTime ? "datetime-local" : "date",
            value: includeTime
              ? value.start || `${todayInput()}T09:00`
              : value.start.slice(0, 10),
          });
          start.addEventListener("change", () => {
            value.start = start.value;
            if (start.value) value.includeTime = includeTime;
            commit();
          });

          const endRow = body.createDiv({ cls: "nt-date-end-row" });
          if (includeEnd) {
            endRow.createDiv({ cls: "nt-date-field-label", text: "结束" });
            const end = endRow.createEl("input", {
              cls: "nt-text-input nt-date-input",
              type: includeTime ? "datetime-local" : "date",
              value: value.end || "",
            });
            end.addEventListener("change", () => {
              value.end = end.value;
              commit();
            });
            const removeEnd = endRow.createEl("button", {
              cls: "nt-icon-button",
              attr: { type: "button", "aria-label": "移除结束日期" },
            });
            removeEnd.append(iconEl("x", "nt-icon"));
            removeEnd.addEventListener("click", () => {
              includeEnd = false;
              delete value.end;
              commit();
              render();
            });
          } else {
            const addEnd = endRow.createEl("button", {
              cls: "nt-text-button",
              text: "＋ 添加结束日期",
            });
            addEnd.addEventListener("click", () => {
              includeEnd = true;
              value.end = value.start ? value.start.slice(0, 10) : todayInput();
              commit();
              render();
            });
          }

          const options = body.createDiv({ cls: "nt-date-options" });
          const timeLabel = options.createEl("label", { cls: "nt-checkbox-label" });
          const timeCheck = timeLabel.createEl("input", {
            type: "checkbox",
            cls: "nt-checkbox-input",
          });
          timeCheck.checked = includeTime;
          timeLabel.createSpan({ text: "包含时间" });
          timeCheck.addEventListener("change", () => {
            includeTime = timeCheck.checked;
            if (includeTime) {
              value.includeTime = true;
              if (value.start && !value.start.includes("T")) value.start = `${value.start}T09:00`;
            } else {
              value.includeTime = false;
              if (value.start) value.start = value.start.slice(0, 10);
              if (value.end) value.end = value.end.slice(0, 10);
            }
            commit();
            render();
          });

          const quick = body.createDiv({ cls: "nt-date-quick" });
          for (const [label, days] of [
            ["今天", 0],
            ["明天", 1],
            ["下周", 7],
          ] as Array<[string, number]>) {
            const button = quick.createEl("button", {
              cls: "nt-chip-button",
              text: label,
              attr: { type: "button" },
            });
            button.addEventListener("click", () => {
              const date = new Date();
              date.setDate(date.getDate() + days);
              value.start = includeTime
                ? `${toDateInput(date)}T09:00`
                : toDateInput(date);
              value.includeTime = includeTime;
              commit();
              render();
            });
          }

          const footer = body.createDiv({ cls: "nt-date-footer" });
          const clearButton = footer.createEl("button", {
            cls: "nt-text-button",
            text: "清除日期",
          });
          clearButton.addEventListener("click", () => {
            setCell(row, property, null);
            this.persist();
            this.refreshCell(anchor, row, property);
            popover.close();
            this.refreshAfterCellEdit(row, property);
          });
          const done = footer.createEl("button", {
            cls: "nt-button nt-button-primary",
            text: "完成",
          });
          done.addEventListener("click", () => {
            popover.close();
            this.refreshAfterCellEdit(row, property);
          });
        };

        const commit = () => {
          if (!value.start) {
            setCell(row, property, null);
          } else {
            const next: DateValue = { start: value.start };
            if (includeEnd && value.end) next.end = value.end;
            if (includeTime) next.includeTime = true;
            setCell(row, property, next);
          }
          this.persist();
          this.refreshCell(anchor, row, property);
        };

        render();
      },
      { width: 330 },
    );
  }
}
