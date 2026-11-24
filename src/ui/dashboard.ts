import { App } from "obsidian";
import { ChartData, buildChartData, formatChartValue } from "../chart-model";
import {
  createChartView,
  createDashboardWidget,
  createView,
  dashboardWidgetView,
  cellText,
  filteredRows,
  formatNumber,
  getCell,
  isCellEmpty,
  optionById,
  recommendedDashboardWidgets,
  titleProperty,
  uid,
  visibleProperties,
} from "../model";
import {
  CHART_KIND_LABELS,
  DASHBOARD_HEIGHT_LABELS,
  DASHBOARD_MAX_WIDGETS,
  DASHBOARD_SPAN_LABELS,
  DashboardWidget,
  DashboardWidgetHeight,
  DashboardWidgetSpan,
  DatabaseData,
  DatabaseProperty,
  DatabaseRow,
  ViewConfig,
} from "../types";
import { ChartInstance, createChart, disposeChart, isDarkTheme } from "./chart-render";
import {
  colorClass,
  confirmAction,
  h,
  iconEl,
  notify,
  openPopover,
  truncate,
} from "./dom";

export interface DashboardCallbacks {
  persist(): void;
  /** Rebuild the dashboard view (also refreshes the toolbar counters). */
  refresh(): void;
  openView(viewId: string): void;
  openRow(row: DatabaseRow): void;
}

/**
 * Renders a Notion-style dashboard: a responsive grid of cards, each one a live
 * preview of a table or chart view that belongs to the same database.
 *
 * The renderer is intentionally short-lived. Every layout change calls
 * `callbacks.refresh()`, which builds a fresh renderer; that keeps the chart
 * instances, DOM, and persisted model from drifting apart.
 */
export class DashboardRenderer {
  private readonly app: App;
  private readonly host: HTMLElement;
  private readonly db: DatabaseData;
  private readonly view: ViewConfig;
  private readonly editMode: boolean;
  private readonly callbacks: DashboardCallbacks;
  private charts: ChartInstance[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private disposed = false;
  private dragWidgetId: string | null = null;

  constructor(
    app: App,
    host: HTMLElement,
    db: DatabaseData,
    view: ViewConfig,
    editMode: boolean,
    callbacks: DashboardCallbacks,
  ) {
    this.app = app;
    this.host = host;
    this.db = db;
    this.view = view;
    this.editMode = editMode;
    this.callbacks = callbacks;
  }

  render(): void {
    this.disposeCharts();
    this.host.empty();
    this.host.addClass("nt-dashboard-area");

    const inner = h("div", "nt-dashboard-inner");
    this.host.append(inner);

    const widgets = this.widgets();
    if (widgets.length === 0) {
      this.renderEmptyState(inner);
      return;
    }

    const grid = h("div", "nt-dashboard-grid");
    if (this.editMode) grid.addClass("is-editing");
    inner.append(grid);

    for (const widget of widgets) this.renderWidget(grid, widget);
    if (this.editMode && widgets.length < DASHBOARD_MAX_WIDGETS) {
      this.renderAddTile(grid);
    }

    const hint = h("div", "nt-dashboard-hint");
    if (this.editMode) {
      hint.setText(
        `拖动卡片左侧的手柄调整顺序 · 使用卡片右上角的菜单调整宽度和高度 · ${widgets.length}/${DASHBOARD_MAX_WIDGETS} 个组件`,
      );
    } else {
      hint.setText(
        `共 ${widgets.length} 个组件 · 组件直接显示数据库中的表格和图表视图，修改源视图后会自动同步`,
      );
    }
    inner.append(hint);
  }

  dispose(): void {
    this.disposed = true;
    this.disposeCharts();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  private widgets(): DashboardWidget[] {
    if (!this.view.dashboard || !Array.isArray(this.view.dashboard.widgets)) {
      this.view.dashboard = { widgets: [] };
    }
    return this.view.dashboard.widgets;
  }

  private disposeCharts(): void {
    for (const chart of this.charts) disposeChart(chart);
    this.charts = [];
  }

  /* ---------------------------------------------------------------- */
  /* Empty state                                                       */
  /* ---------------------------------------------------------------- */

  private renderEmptyState(inner: HTMLElement): void {
    const empty = h("div", "nt-dashboard-empty");
    const icon = h("div", "nt-dashboard-empty-icon");
    icon.append(iconEl("layout-dashboard", "nt-icon"));
    empty.append(icon);

    empty.createEl("h3", { text: "把视图组合成一个管理面板" });
    empty.createEl("p", {
      text: "像 Notion 仪表盘一样，把表格、折线图和饼图放进同一个页面，快速查看关键指标和最新记录。",
    });

    const actions = h("div", "nt-dashboard-empty-actions");
    const add = h("button", "nt-button nt-button-primary", "添加组件");
    add.type = "button";
    add.prepend(iconEl("plus", "nt-icon"));
    add.addEventListener("click", () => this.openAddWidgetMenu(add));
    actions.append(add);

    const recommend = h("button", "nt-button", "使用推荐布局");
    recommend.type = "button";
    recommend.prepend(iconEl("sparkles", "nt-icon"));
    recommend.addEventListener("click", () => this.applyRecommendedLayout());
    actions.append(recommend);
    empty.append(actions);

    empty.createDiv({
      cls: "nt-dashboard-empty-note",
      text: "组件只是视图的窗口，不会复制数据；删除组件不会影响原始视图。",
    });
    inner.append(empty);
  }

  /* ---------------------------------------------------------------- */
  /* Widgets                                                           */
  /* ---------------------------------------------------------------- */

  private renderWidget(grid: HTMLElement, widget: DashboardWidget): void {
    const source = dashboardWidgetView(this.db, widget);
    const card = h(
      "article",
      `nt-dash-widget nt-dash-span-${widget.span} nt-dash-height-${widget.height}`,
    );
    card.setAttribute("data-widget-id", widget.id);
    grid.append(card);

    if (!source) {
      this.renderBrokenWidget(card, widget);
      return;
    }

    const rows = filteredRows(this.db, source);
    const chartData =
      source.type === "chart" ? buildChartData(this.db, source, rows) : null;

    const header = h("header", "nt-dash-widget-header");
    if (this.editMode) {
      const handle = h("span", "nt-dash-drag-handle");
      handle.append(iconEl("grip-vertical", "nt-icon"));
      handle.draggable = true;
      handle.title = "拖动调整顺序";
      this.bindWidgetDrag(handle, card, widget);
      header.append(handle);
    }

    const icon = h("span", "nt-dash-widget-icon");
    icon.append(iconEl(this.sourceIcon(source), "nt-icon"));
    header.append(icon);

    const title = h("button", "nt-dash-widget-title", source.name);
    title.type = "button";
    title.title = `打开「${source.name}」`;
    title.addEventListener("click", () => this.callbacks.openView(source.id));
    header.append(title);

    header.append(
      h("span", "nt-dash-widget-meta", this.widgetMeta(source, rows, chartData)),
    );

    const menu = h("button", "nt-icon-button nt-dash-widget-menu");
    menu.type = "button";
    menu.setAttribute("aria-label", "组件选项");
    menu.setAttribute("title", "组件选项");
    menu.append(iconEl("more-horizontal", "nt-icon"));
    menu.addEventListener("click", () => this.openWidgetMenu(menu, widget, source));
    header.append(menu);
    card.append(header);

    const body = h("div", "nt-dash-widget-body");
    card.append(body);
    card.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.openWidgetMenu(card, widget, source);
    });
    if (source.type === "chart" && chartData) {
      this.renderChartWidget(body, source, chartData);
    } else {
      this.renderTableWidget(body, source, rows, widget);
    }
  }

  private renderBrokenWidget(card: HTMLElement, widget: DashboardWidget): void {
    card.addClass("is-broken");
    const header = h("header", "nt-dash-widget-header");
    header.append(iconEl("triangle-alert", "nt-dash-widget-icon"));
    header.append(h("span", "nt-dash-widget-title", "视图已删除"));
    card.append(header);
    const body = h("div", "nt-dash-widget-body");
    const empty = h("div", "nt-dash-widget-empty");
    empty.createEl("strong", { text: "这个组件引用的视图不存在了" });
    empty.createEl("p", { text: "可以移除组件，或从其他视图重新添加。" });
    const remove = h("button", "nt-button nt-button-danger-ghost", "移除组件");
    remove.type = "button";
    remove.addEventListener("click", () => this.removeWidget(widget));
    empty.append(remove);
    body.append(empty);
    card.append(body);
  }

  private sourceIcon(source: ViewConfig): string {
    if (source.type === "chart") {
      return source.chart.kind === "pie" ? "chart-pie" : "chart-line";
    }
    return "table-2";
  }

  private widgetMeta(
    source: ViewConfig,
    rows: DatabaseRow[],
    data: ChartData | null,
  ): string {
    const filterSuffix = source.filters.length ? ` · ${source.filters.length} 个筛选` : "";
    if (
      source.type === "chart" &&
      data &&
      !data.empty &&
      source.chart.aggregation === "sum"
    ) {
      return `${rows.length} 条 · 合计 ${formatChartValue(data.total, data)}${filterSuffix}`;
    }
    return `${rows.length} 条记录${filterSuffix}`;
  }

  private renderChartWidget(
    body: HTMLElement,
    source: ViewConfig,
    data: ChartData,
  ): void {
    body.addClass("nt-dash-chart-body");
    if (data.empty) {
      const empty = h("div", "nt-dash-widget-empty");
      empty.append(iconEl(source.chart.kind === "pie" ? "chart-pie" : "chart-line", "nt-icon"));
      empty.createEl("strong", { text: data.message });
      empty.createEl("p", {
        text:
          data.rowCount === 0
            ? "当前视图没有匹配的记录。"
            : "调整视图的坐标轴或数值属性后再试。",
      });
      const open = h("button", "nt-button nt-button-quiet", "打开视图");
      open.type = "button";
      open.addEventListener("click", () => this.callbacks.openView(source.id));
      empty.append(open);
      body.append(empty);
      return;
    }

    const canvas = h("div", "nt-dash-chart-canvas");
    body.append(canvas);
    let initialized = false;
    const initialize = () => {
      if (initialized || this.disposed || !canvas.isConnected) return;
      initialized = true;
      try {
        const chart = createChart(canvas, data, isDarkTheme());
        this.charts.push(chart);
        this.observeChartResize(canvas);
        chart.resize();
      } catch (error) {
        console.error("One Database: could not render dashboard chart", error);
        canvas.empty();
        canvas.createDiv({
          cls: "nt-dash-chart-error",
          text: "图表渲染失败，请打开视图后重试。",
        });
      }
    };
    window.requestAnimationFrame(initialize);
    // Background windows and popouts pause rAF; the timeout still initialises.
    window.setTimeout(initialize, 80);
  }

  private observeChartResize(canvas: HTMLElement): void {
    if (typeof ResizeObserver === "undefined") return;
    if (!this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        for (const chart of this.charts) chart.resize();
      });
    }
    this.resizeObserver.observe(canvas);
  }

  /* ---------------------------------------------------------------- */
  /* Table preview                                                     */
  /* ---------------------------------------------------------------- */

  private previewProperties(source: ViewConfig, span: DashboardWidgetSpan): DatabaseProperty[] {
    const visible = visibleProperties(this.db, source);
    const title = titleProperty(this.db);
    const maxColumns = span >= 3 ? 4 : span === 2 ? 3 : 2;
    const properties: DatabaseProperty[] = [];
    if (title) properties.push(title);
    for (const property of visible) {
      if (properties.length >= maxColumns) break;
      if (property.id === title?.id || property.type === "title") continue;
      properties.push(property);
    }
    if (properties.length === 0) properties.push(...visible.slice(0, maxColumns));
    return properties;
  }

  private renderTableWidget(
    body: HTMLElement,
    source: ViewConfig,
    rows: DatabaseRow[],
    widget: DashboardWidget,
  ): void {
    body.addClass("nt-dash-table-body");
    const properties = this.previewProperties(source, widget.span);
    const limit =
      widget.height === "compact" ? 5 : widget.height === "tall" ? 13 : 8;
    const visibleRows = rows.slice(0, limit);

    const wrap = h("div", "nt-dash-table-wrap");
    const table = h("table", "nt-dash-table");
    const thead = h("thead");
    const headRow = h("tr");
    for (const property of properties) {
      const th = h("th", property.type === "title" ? "is-title" : "", truncate(property.name, 9));
      th.title = property.name;
      headRow.append(th);
    }
    thead.append(headRow);
    table.append(thead);

    const tbody = h("tbody");
    if (visibleRows.length === 0) {
      const tr = h("tr", "nt-dash-table-empty");
      const td = h("td", "", "没有匹配的记录");
      td.colSpan = Math.max(1, properties.length);
      tr.append(td);
      tbody.append(tr);
    } else {
      for (const row of visibleRows) {
        const tr = h("tr", "nt-dash-row");
        tr.tabIndex = 0;
        tr.title = "打开记录";
        tr.addEventListener("click", () => this.callbacks.openRow(row));
        tr.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          this.callbacks.openRow(row);
        });
        for (const property of properties) {
          const td = h("td");
          this.appendPreviewCell(td, row, property);
          tr.append(td);
        }
        tbody.append(tr);
      }
    }
    table.append(tbody);
    wrap.append(table);
    body.append(wrap);

    const footer = h("div", "nt-dash-widget-footer");
    const count =
      rows.length === 0 ? "打开视图" : `查看全部 ${rows.length} 条记录`;
    const open = h("button", "nt-dash-open-view", count);
    open.type = "button";
    open.append(iconEl("arrow-up-right", "nt-icon"));
    open.addEventListener("click", () => this.callbacks.openView(source.id));
    footer.append(open);
    body.append(footer);
  }

  private appendPreviewCell(
    td: HTMLElement,
    row: DatabaseRow,
    property: DatabaseProperty,
  ): void {
    const value = getCell(row, property);
    if (property.type === "checkbox") {
      const checked = value === true;
      const icon = iconEl(checked ? "square-check" : "square", "nt-dash-checkbox");
      if (!checked) icon.addClass("is-muted");
      td.append(icon);
      return;
    }
    if (isCellEmpty(value)) {
      td.addClass("is-empty");
      return;
    }

    switch (property.type) {
      case "title": {
        if (row.icon) td.append(h("span", "nt-dash-row-icon", row.icon));
        td.append(h("span", "nt-dash-title-text", truncate(String(value), 40)));
        break;
      }
      case "number": {
        td.addClass("is-number");
        td.append(h("span", "nt-number-value", formatNumber(value, property)));
        break;
      }
      case "select":
      case "status": {
        const option = optionById(property, value);
        if (!option) {
          td.append(h("span", "nt-dash-plain", String(value)));
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
        const options = ids
          .map((id) => optionById(property, id))
          .filter((option): option is NonNullable<typeof option> => Boolean(option));
        for (const option of options.slice(0, 2)) {
          const pill = h("span", `nt-pill ${colorClass(option.color)}`);
          pill.append(h("span", "nt-pill-text", option.name));
          td.append(pill);
        }
        if (options.length > 2) {
          td.append(h("span", "nt-dash-more", `+${options.length - 2}`));
        }
        break;
      }
      case "date":
      case "created_time":
      case "last_edited_time": {
        td.append(h("span", "nt-dash-plain", truncate(cellText(row, property), 40)));
        break;
      }
      case "url":
      case "email": {
        td.append(iconEl(property.type === "url" ? "link" : "mail", "nt-dash-inline-icon"));
        td.append(h("span", "nt-dash-plain", truncate(String(value), 48)));
        break;
      }
      default: {
        const text = truncate(String(value ?? ""), 48);
        td.append(h("span", "nt-dash-plain", text));
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* Widget menu                                                       */
  /* ---------------------------------------------------------------- */

  private openWidgetMenu(
    anchor: HTMLElement,
    widget: DashboardWidget,
    source: ViewConfig,
  ): void {
    openPopover(
      anchor,
      "nt-menu-popover nt-dash-widget-popover",
      (content, popover) => {
        content.createDiv({ cls: "nt-menu-heading", text: source.name });

        this.menuItem(content, "maximize-2", "打开视图", () => {
          popover.close();
          this.callbacks.openView(source.id);
        });
        this.menuItem(content, "refresh-cw", "更换数据源", () => {
          popover.close();
          this.openSourceMenu(anchor, widget);
        });
        this.menuItem(content, "copy", "复制组件", () => {
          popover.close();
          this.duplicateWidget(widget);
        });

        content.createDiv({ cls: "nt-menu-divider" });
        content.createDiv({ cls: "nt-menu-heading", text: "宽度" });
        const widths = content.createDiv({ cls: "nt-dash-size-row" });
        for (const span of [1, 2, 3, 4] as DashboardWidgetSpan[]) {
          this.sizeButton(widths, DASHBOARD_SPAN_LABELS[span], widget.span === span, () => {
            popover.close();
            this.commit(() => {
              widget.span = span;
            });
          });
        }

        content.createDiv({ cls: "nt-menu-heading", text: "高度" });
        const heights = content.createDiv({ cls: "nt-dash-size-row" });
        for (const height of ["compact", "standard", "tall"] as DashboardWidgetHeight[]) {
          this.sizeButton(
            heights,
            DASHBOARD_HEIGHT_LABELS[height],
            widget.height === height,
            () => {
              popover.close();
              this.commit(() => {
                widget.height = height;
              });
            },
          );
        }

        content.createDiv({ cls: "nt-menu-divider" });
        const index = this.widgets().findIndex((item) => item.id === widget.id);
        this.menuItem(content, "arrow-left", "向左移动", () => {
          popover.close();
          this.moveWidget(widget, -1);
        }, { disabled: index <= 0 });
        this.menuItem(content, "arrow-right", "向右移动", () => {
          popover.close();
          this.moveWidget(widget, 1);
        }, { disabled: index < 0 || index >= this.widgets().length - 1 });

        content.createDiv({ cls: "nt-menu-divider" });
        this.menuItem(
          content,
          "trash-2",
          "移除组件",
          () => {
            popover.close();
            this.removeWidget(widget);
          },
          { danger: true },
        );
      },
      { width: 302, align: "end" },
    );
  }

  private openSourceMenu(anchor: HTMLElement, widget: DashboardWidget): void {
    const candidates = this.db.views.filter((view) => view.type !== "dashboard");
    openPopover(
      anchor,
      "nt-menu-popover nt-dash-widget-popover",
      (content, popover) => {
        content.createDiv({ cls: "nt-menu-heading", text: "更换数据源" });
        for (const candidate of candidates) {
          this.menuItem(
            content,
            this.sourceIcon(candidate),
            candidate.name,
            () => {
              popover.close();
              this.commit(() => {
                widget.viewId = candidate.id;
              });
            },
            {
              checked: widget.viewId === candidate.id,
              hint: this.viewTypeLabel(candidate),
            },
          );
        }
        if (candidates.length === 0) {
          content.createDiv({ cls: "nt-menu-note", text: "还没有可用的表格或图表视图。" });
        }
      },
      { width: 292, align: "end" },
    );
  }

  private viewTypeLabel(view: ViewConfig): string {
    if (view.type === "chart") return CHART_KIND_LABELS[view.chart.kind];
    return "表格";
  }

  private sizeButton(
    parent: HTMLElement,
    label: string,
    active: boolean,
    onClick: () => void,
  ): void {
    const button = h("button", `nt-dash-size-button${active ? " is-active" : ""}`, label);
    button.type = "button";
    button.addEventListener("click", onClick);
    parent.append(button);
  }

  private duplicateWidget(widget: DashboardWidget): void {
    const widgets = this.widgets();
    if (widgets.length >= DASHBOARD_MAX_WIDGETS) {
      notify(`每个管理面板最多 ${DASHBOARD_MAX_WIDGETS} 个组件`);
      return;
    }
    const index = widgets.findIndex((item) => item.id === widget.id);
    if (index < 0) return;
    const copy: DashboardWidget = { ...widget, id: uid("widget") };
    this.commit(() => {
      widgets.splice(index + 1, 0, copy);
    });
  }

  private removeWidget(widget: DashboardWidget): void {
    this.commit(() => {
      this.view.dashboard.widgets = this.widgets().filter((item) => item.id !== widget.id);
    });
  }

  private moveWidget(widget: DashboardWidget, delta: number): void {
    const widgets = this.widgets();
    const index = widgets.findIndex((item) => item.id === widget.id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= widgets.length) return;
    this.commit(() => {
      const [moved] = widgets.splice(index, 1);
      widgets.splice(target, 0, moved);
    });
  }

  /* ---------------------------------------------------------------- */
  /* Add widget                                                        */
  /* ---------------------------------------------------------------- */

  openAddWidgetMenu(anchor: HTMLElement): void {
    const widgets = this.widgets();
    const full = widgets.length >= DASHBOARD_MAX_WIDGETS;
    const candidates = this.db.views.filter((view) => view.type !== "dashboard");
    openPopover(
      anchor,
      "nt-menu-popover nt-dash-add-popover",
      (content, popover) => {
        const heading = content.createDiv({ cls: "nt-popover-heading" });
        heading.createSpan({ text: "添加组件" });
        heading.createSpan({
          cls: "nt-popover-subtitle",
          text: `${widgets.length}/${DASHBOARD_MAX_WIDGETS}`,
        });
        content.createDiv({
          cls: "nt-menu-note",
          text: "组件会实时显示所选视图的数据、筛选和排序。",
        });

        for (const candidate of candidates) {
          const used = widgets.some((widget) => widget.viewId === candidate.id);
          this.menuItem(
            content,
            this.sourceIcon(candidate),
            candidate.name,
            () => {
              popover.close();
              this.addWidget(candidate);
            },
            {
              checked: used,
              disabled: full,
              hint: this.viewTypeLabel(candidate),
            },
          );
        }
        if (candidates.length === 0) {
          content.createDiv({ cls: "nt-menu-note", text: "还没有可用的表格或图表视图。" });
        }

        content.createDiv({ cls: "nt-menu-divider" });
        content.createDiv({ cls: "nt-menu-heading", text: "新建视图并添加" });
        this.menuItem(
          content,
          "table-2",
          "新建表格视图",
          () => {
            popover.close();
            this.createSourceAndAdd("table");
          },
          { disabled: full },
        );
        this.menuItem(
          content,
          "chart-line",
          "新建折线图",
          () => {
            popover.close();
            this.createSourceAndAdd("line");
          },
          { disabled: full },
        );
        this.menuItem(
          content,
          "chart-pie",
          "新建饼图",
          () => {
            popover.close();
            this.createSourceAndAdd("pie");
          },
          { disabled: full },
        );

        if (full) {
          content.createDiv({
            cls: "nt-menu-note",
            text: `已达到 ${DASHBOARD_MAX_WIDGETS} 个组件的上限，请先移除一些组件。`,
          });
        }
      },
      { width: 324, align: "end" },
    );
  }

  private addWidget(
    source: ViewConfig,
    options: { span?: DashboardWidgetSpan; height?: DashboardWidgetHeight } = {},
  ): void {
    const widgets = this.widgets();
    if (widgets.length >= DASHBOARD_MAX_WIDGETS) {
      notify(`每个管理面板最多 ${DASHBOARD_MAX_WIDGETS} 个组件`);
      return;
    }
    const span = options.span || (source.type === "table" ? 4 : 2);
    this.commit(() => {
      widgets.push(
        createDashboardWidget(source.id, {
          span,
          height: options.height || "standard",
        }),
      );
    });
  }

  private createSourceAndAdd(kind: "table" | "line" | "pie"): void {
    const baseName = kind === "table" ? "表格" : kind === "line" ? "折线图" : "饼图";
    const name = this.uniqueViewName(baseName);
    const view =
      kind === "table" ? createView(name) : createChartView(this.db, kind, name);
    this.db.views.push(view);
    this.addWidget(view, { span: kind === "table" ? 4 : 2 });
  }

  private uniqueViewName(base: string): string {
    let name = base;
    let index = 2;
    while (this.db.views.some((view) => view.name === name)) {
      name = `${base} ${index}`;
      index += 1;
    }
    return name;
  }

  async applyRecommendedLayout(): Promise<void> {
    const widgets = recommendedDashboardWidgets(this.db, this.view.id);
    if (widgets.length === 0) {
      notify("还没有可用的表格或图表视图");
      return;
    }
    if (this.view.dashboard.widgets.length > 0) {
      const confirmed = await confirmAction(
        this.app,
        "使用推荐布局",
        "这会替换当前管理面板中的所有组件，但不会删除任何视图或记录。",
        { confirmLabel: "替换布局", danger: false },
      );
      if (!confirmed) return;
    }
    this.commit(() => {
      this.view.dashboard.widgets = widgets;
    });
  }

  async clearWidgets(): Promise<void> {
    if (this.view.dashboard.widgets.length === 0) return;
    const confirmed = await confirmAction(
      this.app,
      "清空管理面板",
      `确定要移除当前管理面板中的全部 ${this.view.dashboard.widgets.length} 个组件吗？视图和数据不会受到影响。`,
      { confirmLabel: "清空组件" },
    );
    if (!confirmed) return;
    this.commit(() => {
      this.view.dashboard.widgets = [];
    });
  }

  /* ---------------------------------------------------------------- */
  /* Drag and drop                                                     */
  /* ---------------------------------------------------------------- */

  private bindWidgetDrag(
    handle: HTMLElement,
    card: HTMLElement,
    widget: DashboardWidget,
  ): void {
    handle.addEventListener("dragstart", (event) => {
      this.dragWidgetId = widget.id;
      card.addClass("is-dragging");
      try {
        event.dataTransfer?.setData("text/plain", widget.id);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
      } catch {
        // Some Obsidian popout windows provide a restricted dataTransfer.
      }
    });
    handle.addEventListener("dragend", () => {
      this.dragWidgetId = null;
      card.removeClass("is-dragging");
      card.removeClass("is-drop-before");
      card.removeClass("is-drop-after");
    });
    card.addEventListener("dragover", (event) => {
      const dragId = this.dragWidgetId;
      if (!dragId || dragId === widget.id) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      const rect = card.getBoundingClientRect();
      const after = event.clientY > rect.top + rect.height / 2;
      card.toggleClass("is-drop-after", after);
      card.toggleClass("is-drop-before", !after);
    });
    card.addEventListener("dragleave", () => {
      card.removeClass("is-drop-before");
      card.removeClass("is-drop-after");
    });
    card.addEventListener("drop", (event) => {
      if (!this.dragWidgetId) return;
      event.preventDefault();
      const rect = card.getBoundingClientRect();
      const after = event.clientY > rect.top + rect.height / 2;
      const sourceId = this.dragWidgetId;
      this.dragWidgetId = null;
      this.reorderWidget(sourceId, widget.id, after);
    });
  }

  private reorderWidget(sourceId: string, targetId: string, after: boolean): void {
    const widgets = this.widgets();
    const from = widgets.findIndex((item) => item.id === sourceId);
    const target = widgets.findIndex((item) => item.id === targetId);
    if (from < 0 || target < 0 || from === target) return;
    let insertIndex = target + (after ? 1 : 0);
    this.commit(() => {
      const [moved] = widgets.splice(from, 1);
      if (from < insertIndex) insertIndex -= 1;
      widgets.splice(insertIndex, 0, moved);
    });
  }

  private renderAddTile(grid: HTMLElement): void {
    const tile = h("button", "nt-dash-add-tile");
    tile.type = "button";
    tile.append(iconEl("plus", "nt-icon"));
    tile.createSpan({ text: "添加组件" });
    tile.addEventListener("click", () => this.openAddWidgetMenu(tile));
    grid.append(tile);
  }

  /* ---------------------------------------------------------------- */
  /* Helpers                                                           */
  /* ---------------------------------------------------------------- */

  private commit(action: () => void): void {
    action();
    this.callbacks.persist();
    this.callbacks.refresh();
  }

  private menuItem(
    parent: HTMLElement,
    icon: string,
    label: string,
    action: () => void,
    options: { danger?: boolean; checked?: boolean; disabled?: boolean; hint?: string } = {},
  ): HTMLButtonElement {
    const item = h(
      "button",
      `nt-menu-item${options.danger ? " is-danger" : ""}${options.disabled ? " is-disabled" : ""}`,
    );
    item.type = "button";
    item.disabled = Boolean(options.disabled);
    item.append(iconEl(icon, "nt-menu-icon"));
    item.createSpan({ cls: "nt-menu-label", text: label });
    if (options.hint) item.createSpan({ cls: "nt-menu-hint", text: options.hint });
    if (options.checked) item.append(iconEl("check", "nt-menu-check"));
    item.addEventListener("click", () => {
      if (options.disabled) return;
      action();
    });
    parent.append(item);
    return item;
  }
}
