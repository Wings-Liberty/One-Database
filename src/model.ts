import {
  CALCULATION_LABELS,
  COLOR_LABELS,
  ChartAggregation,
  ChartConfig,
  ChartDateGrain,
  ChartKind,
  DatabaseData,
  DatabaseProperty,
  DatabaseRow,
  DateValue,
  FilterOperator,
  FilterRule,
  PropertyType,
  SCHEMA_VERSION,
  SELECT_COLORS,
  SelectOption,
  SortRule,
  ViewConfig,
  ViewType,
} from "./types";

let idCounter = 0;

export function uid(prefix = "id"): string {
  idCounter = (idCounter + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function defaultChartConfig(
  properties: DatabaseProperty[],
  kind: ChartKind = "line",
): ChartConfig {
  const dateProperties = properties.filter((property) =>
    ["date", "created_time", "last_edited_time"].includes(property.type),
  );
  const groupable = properties.filter((property) =>
    ["select", "status", "checkbox"].includes(property.type),
  );
  const categories = [
    ...groupable,
    ...properties.filter((property) =>
      ["multi_select", "title", "text"].includes(property.type),
    ),
  ];
  const numberProperty = properties.find((property) => property.type === "number");
  const xProperty =
    kind === "pie"
      ? categories[0] || properties[0]
      : dateProperties[0] || groupable[0] || categories[0] || properties[0];
  const groupProperty =
    kind === "line"
      ? groupable.find((property) => property.id !== xProperty?.id) || null
      : null;

  return {
    kind,
    xPropertyId: xProperty?.id || null,
    valuePropertyId: numberProperty?.id || null,
    aggregation: numberProperty ? "sum" : "count",
    groupByPropertyId: groupProperty?.id || null,
    dateGrain: "month",
    showLegend: true,
  };
}

export function createView(name = "表格"): ViewConfig {
  return {
    id: uid("view"),
    name,
    type: "table",
    filters: [],
    conjunction: "and",
    sorts: [],
    search: "",
    hiddenProperties: [],
    showCalculations: false,
    calculations: {},
    groupBy: null,
    collapsedGroups: [],
    wrapText: false,
    chart: defaultChartConfig([], "line"),
  };
}

export function createChartView(
  db: DatabaseData,
  kind: ChartKind,
  name: string,
): ViewConfig {
  const view = createView(name);
  view.type = "chart";
  view.chart = defaultChartConfig(db.properties, kind);
  return view;
}

export function createDatabase(title = "未命名数据库"): DatabaseData {
  const now = Date.now();
  const titleProperty: DatabaseProperty = {
    id: "title",
    name: "名称",
    type: "title",
    width: 320,
  };
  const view = createView("表格");
  view.calculations = { title: "count" };
  return {
    schemaVersion: SCHEMA_VERSION,
    title,
    icon: "🗂️",
    description: "",
    properties: [titleProperty],
    rows: [],
    views: [view],
    activeViewId: view.id,
    createdAt: now,
    updatedAt: now,
  };
}

function option(name: string, color: SelectOption["color"]): SelectOption {
  return { id: `opt_${name}_${Math.random().toString(36).slice(2, 7)}`, name, color };
}

function makeRow(
  title: string,
  cells: Record<string, unknown>,
  daysAgo: number,
  content = "",
): DatabaseRow {
  const now = Date.now() - daysAgo * 86_400_000;
  return {
    id: uid("row"),
    icon: "",
    cells: { title, ...cells } as DatabaseRow["cells"],
    content,
    createdAt: now,
    updatedAt: now,
  };
}

function isoDay(offsetDays: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return toDateInput(date);
}

/**
 * A ready-to-use sample database that demonstrates the main table features.
 */
export function createSampleDatabase(title = "任务追踪"): DatabaseData {
  const db = createDatabase(title);
  db.icon = "🚀";
  db.description =
    "用 Notion 风格的表格管理项目任务。切换视图查看筛选、排序与分组；点击行标题可打开任务详情。";
  db.properties[0].width = 280;

  const statusOptions = [
    option("未开始", "gray"),
    option("进行中", "blue"),
    option("已完成", "green"),
    option("已阻塞", "red"),
  ];
  const ownerOptions = [
    option("我", "blue"),
    option("林夏", "purple"),
    option("陈默", "orange"),
    option("周然", "pink"),
  ];
  const priorityOptions = [
    option("高", "red"),
    option("中", "yellow"),
    option("低", "gray"),
  ];
  const tagOptions = [
    option("设计", "pink"),
    option("开发", "blue"),
    option("内容", "orange"),
    option("研究", "purple"),
    option("协作", "green"),
  ];

  db.properties.push(
    {
      id: "status",
      name: "状态",
      type: "status",
      width: 120,
      options: statusOptions,
    },
    {
      id: "owner",
      name: "负责人",
      type: "select",
      width: 110,
      options: ownerOptions,
    },
    {
      id: "priority",
      name: "优先级",
      type: "select",
      width: 100,
      options: priorityOptions,
    },
    {
      id: "due",
      name: "截止日期",
      type: "date",
      width: 180,
    },
    {
      id: "effort",
      name: "工时",
      type: "number",
      width: 80,
      numberFormat: "number",
    },
    {
      id: "tags",
      name: "标签",
      type: "multi_select",
      width: 160,
      options: tagOptions,
    },
    {
      id: "done",
      name: "完成",
      type: "checkbox",
      width: 90,
    },
    {
      id: "note",
      name: "备注",
      type: "text",
      width: 150,
    },
  );

  const [未开始, 进行中, 已完成, 已阻塞] = statusOptions;
  const [我, 林夏, 陈默, 周然] = ownerOptions;
  const [高, 中, 低] = priorityOptions;
  const [设计, 开发, 内容, 研究, 协作] = tagOptions;

  db.rows = [
    makeRow(
      "梳理产品需求与范围",
      {
        status: 已完成.id,
        owner: 我.id,
        priority: 高.id,
        due: { start: isoDay(-3) },
        effort: 6,
        tags: [研究.id, 协作.id],
        done: true,
        note: "已和团队确认第一版范围。",
      },
      9,
      "## 目标\n\n确定第一版只做表格视图，并锁定属性类型与交互范围。\n\n- [x] 竞品体验\n- [x] 需求清单\n- [x] 范围评审",
    ),
    makeRow(
      "设计数据库表格视觉规范",
      {
        status: 进行中.id,
        owner: 林夏.id,
        priority: 高.id,
        due: { start: isoDay(0), end: isoDay(2) },
        effort: 12,
        tags: [设计.id, 协作.id],
        done: false,
        note: "对齐 Notion 的留白、边框和标签色。",
      },
      6,
      "## 设计要点\n\n- 行高 40px，表头 36px\n- 标签使用低饱和背景色\n- 操作按钮只在悬停时出现\n\n参考 Notion 的表格视图，但保留 Obsidian 的主题配色。",
    ),
    makeRow(
      "实现单元格内联编辑",
      {
        status: 进行中.id,
        owner: 陈默.id,
        priority: 高.id,
        due: { start: isoDay(1) },
        effort: 16,
        tags: [开发.id],
        done: false,
        note: "文本、数字、日期、状态和标签。",
      },
      4,
      "需要支持：\n\n1. 单击编辑，Enter 保存，Esc 取消\n2. 标签即时创建\n3. 日期范围\n4. 空值占位与键盘焦点",
    ),
    makeRow(
      "完善筛选与排序面板",
      {
        status: 未开始.id,
        owner: 陈默.id,
        priority: 中.id,
        due: { start: isoDay(4) },
        effort: 10,
        tags: [开发.id],
        done: false,
        note: "支持 AND / OR 与多条件排序。",
      },
      2,
      "",
    ),
    makeRow(
      "撰写插件使用说明",
      {
        status: 未开始.id,
        owner: 周然.id,
        priority: 中.id,
        due: { start: isoDay(5) },
        effort: 4,
        tags: [内容.id],
        done: false,
        note: "配一张功能截图。",
      },
      2,
      "说明如何：\n\n- 新建数据库\n- 添加属性与记录\n- 使用视图\n- 导出 CSV",
    ),
    makeRow(
      "评估行详情页的 Markdown 编辑",
      {
        status: 已阻塞.id,
        owner: 我.id,
        priority: 低.id,
        due: { start: isoDay(-1) },
        effort: 3,
        tags: [研究.id, 开发.id],
        done: false,
        note: "等待编辑器组件的可行方案。",
      },
      7,
      "阻塞原因：需要评估嵌入式 Markdown 编辑器是否会与 Obsidian 的编辑历史冲突。\n\n当前先使用纯文本备注字段。",
    ),
    makeRow(
      "制作示例任务数据",
      {
        status: 已完成.id,
        owner: 林夏.id,
        priority: 低.id,
        due: { start: isoDay(-5) },
        effort: 2,
        tags: [内容.id, 协作.id],
        done: true,
        note: "覆盖全部属性类型。",
      },
      8,
      "",
    ),
    makeRow(
      "整理发布前检查清单",
      {
        status: 未开始.id,
        owner: 周然.id,
        priority: 中.id,
        due: { start: isoDay(7) },
        effort: 2,
        tags: [协作.id],
        done: false,
        note: "安装、启用、主题兼容性。",
      },
      1,
      "- [ ] 深浅色主题\n- [ ] 窄窗口\n- [ ] 空数据库\n- [ ] 损坏数据提示",
    ),
  ];

  const firstView = db.views[0];
  firstView.name = "全部任务";
  firstView.showCalculations = true;
  firstView.calculations = { title: "count", effort: "sum", done: "percent_checked" };

  const focusView = createView("我负责的");
  focusView.filters = [
    {
      id: uid("filter"),
      propertyId: "owner",
      operator: "is",
      value: 我.id,
    },
    {
      id: uid("filter"),
      propertyId: "done",
      operator: "unchecked",
      value: null,
    },
  ];
  focusView.sorts = [{ id: uid("sort"), propertyId: "due", direction: "asc" }];
  focusView.calculations = { title: "count", effort: "sum" };
  focusView.showCalculations = true;

  const groupedView = createView("按状态分组");
  groupedView.groupBy = "status";
  groupedView.sorts = [{ id: uid("sort"), propertyId: "priority", direction: "asc" }];
  groupedView.showCalculations = true;
  groupedView.calculations = { title: "count" };

  const lineView = createChartView(db, "line", "工时趋势");
  lineView.chart = {
    ...lineView.chart,
    xPropertyId: "due",
    valuePropertyId: "effort",
    aggregation: "sum",
    groupByPropertyId: "owner",
    dateGrain: "day",
    showLegend: true,
  };

  const pieView = createChartView(db, "pie", "状态占比");
  pieView.chart = {
    ...pieView.chart,
    xPropertyId: "status",
    valuePropertyId: null,
    aggregation: "count",
    groupByPropertyId: null,
    showLegend: true,
  };

  db.views.push(focusView, groupedView, lineView, pieView);
  db.activeViewId = firstView.id;
  return db;
}

export function activeView(db: DatabaseData): ViewConfig {
  return db.views.find((view) => view.id === db.activeViewId) || db.views[0];
}

export function titleProperty(db: DatabaseData): DatabaseProperty {
  return db.properties.find((property) => property.type === "title") || db.properties[0];
}

export function propertyById(db: DatabaseData, id: string): DatabaseProperty | undefined {
  return db.properties.find((property) => property.id === id);
}

export function visibleProperties(db: DatabaseData, view: ViewConfig): DatabaseProperty[] {
  return db.properties.filter((property) => !view.hiddenProperties.includes(property.id));
}

export function isReadOnlyProperty(property: DatabaseProperty): boolean {
  return property.type === "created_time" || property.type === "last_edited_time";
}

export function getRawCell(row: DatabaseRow, property: DatabaseProperty): unknown {
  if (property.type === "created_time") return row.createdAt;
  if (property.type === "last_edited_time") return row.updatedAt;
  return row.cells[property.id];
}

export function getCell(row: DatabaseRow, property: DatabaseProperty): unknown {
  return getRawCell(row, property) ?? null;
}

export function isCellEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") {
    const date = value as DateValue;
    return !date.start;
  }
  return false;
}

export function setCell(
  row: DatabaseRow,
  property: DatabaseProperty,
  value: unknown,
): void {
  if (isReadOnlyProperty(property)) return;
  if (isCellEmpty(value)) {
    delete row.cells[property.id];
  } else {
    row.cells[property.id] = value as DatabaseRow["cells"][string];
  }
  row.updatedAt = Date.now();
}

export function optionById(property: DatabaseProperty, id: unknown): SelectOption | undefined {
  if (typeof id !== "string") return undefined;
  return property.options?.find((option) => option.id === id);
}

export function ensureOption(property: DatabaseProperty, name: string): SelectOption {
  const clean = name.trim();
  const existing = property.options?.find(
    (option) => option.name.toLocaleLowerCase() === clean.toLocaleLowerCase(),
  );
  if (existing) return existing;
  if (!property.options) property.options = [];
  const created: SelectOption = {
    id: uid("opt"),
    name: clean,
    color: SELECT_COLORS[property.options.length % SELECT_COLORS.length],
  };
  property.options.push(created);
  return created;
}

export function optionName(property: DatabaseProperty, id: unknown): string {
  return optionById(property, id)?.name ?? "";
}

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function toDateTimeInput(date: Date): string {
  return `${toDateInput(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function todayInput(): string {
  return toDateInput(new Date());
}

export function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function dateKey(value: string | undefined | null): number | null {
  const date = parseDate(value);
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function formatDateValue(value: DateValue): string {
  const start = parseDate(value.start);
  if (!start) return "";
  const currentYear = new Date().getFullYear();
  const startText =
    start.getFullYear() === currentYear
      ? `${start.getMonth() + 1}月${start.getDate()}日`
      : `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日`;
  const withTime = value.includeTime || value.start.includes("T");
  let text = startText;
  if (withTime) {
    text += ` ${pad2(start.getHours())}:${pad2(start.getMinutes())}`;
  }
  if (value.end) {
    const end = parseDate(value.end);
    if (end) {
      const endText =
        end.getFullYear() === start.getFullYear()
          ? `${end.getMonth() + 1}月${end.getDate()}日`
          : `${end.getFullYear()}年${end.getMonth() + 1}月${end.getDate()}日`;
      text += ` → ${endText}`;
    }
  }
  return text;
}

export function formatTimestamp(timestamp: number, includeTime = false): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const text = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  return includeTime ? `${text} ${pad2(date.getHours())}:${pad2(date.getMinutes())}` : text;
}

export function isDateOverdue(value: DateValue, done: boolean): boolean {
  if (done) return false;
  const key = dateKey(value.start);
  if (key === null) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return key < today.getTime();
}

export function formatNumber(value: unknown, property: DatabaseProperty): string {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);
  const format = property.numberFormat || "number";
  try {
    if (format === "percent") {
      return `${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(num)}%`;
    }
    if (format === "currency") {
      return new Intl.NumberFormat("zh-CN", {
        style: "currency",
        currency: "CNY",
        maximumFractionDigits: 2,
      }).format(num);
    }
    if (format === "comma") {
      return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 6 }).format(num);
    }
    return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 6 }).format(num);
  } catch {
    return String(num);
  }
}

export function cellText(row: DatabaseRow, property: DatabaseProperty): string {
  const value = getCell(row, property);
  if (isCellEmpty(value)) return "";
  switch (property.type) {
    case "select":
    case "status":
      return optionName(property, value);
    case "multi_select":
      return (value as string[])
        .map((id) => optionName(property, id))
        .filter(Boolean)
        .join(", ");
    case "date":
      return formatDateValue(value as DateValue);
    case "checkbox":
      return value ? "已勾选" : "未勾选";
    case "number":
      return formatNumber(value, property);
    case "created_time":
    case "last_edited_time":
      return formatTimestamp(value as number);
    default:
      return String(value ?? "");
  }
}

export function rowSearchText(row: DatabaseRow, db: DatabaseData): string {
  const values = db.properties.map((property) => cellText(row, property));
  values.push(row.content || "");
  return values.join(" ").toLocaleLowerCase();
}

export interface FilterOperatorMeta {
  value: FilterOperator;
  label: string;
}

const TEXT_OPERATORS: FilterOperatorMeta[] = [
  { value: "contains", label: "包含" },
  { value: "not_contains", label: "不包含" },
  { value: "is", label: "等于" },
  { value: "is_not", label: "不等于" },
  { value: "is_empty", label: "为空" },
  { value: "is_not_empty", label: "不为空" },
];

const NUMBER_OPERATORS: FilterOperatorMeta[] = [
  { value: "is", label: "=" },
  { value: "is_not", label: "≠" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "is_empty", label: "为空" },
  { value: "is_not_empty", label: "不为空" },
];

const SELECT_OPERATORS: FilterOperatorMeta[] = [
  { value: "is", label: "是" },
  { value: "is_not", label: "不是" },
  { value: "is_empty", label: "为空" },
  { value: "is_not_empty", label: "不为空" },
];

const MULTI_OPERATORS: FilterOperatorMeta[] = [
  { value: "contains", label: "包含" },
  { value: "not_contains", label: "不包含" },
  { value: "is_empty", label: "为空" },
  { value: "is_not_empty", label: "不为空" },
];

const DATE_OPERATORS: FilterOperatorMeta[] = [
  { value: "is", label: "是" },
  { value: "before", label: "早于" },
  { value: "after", label: "晚于" },
  { value: "on_or_before", label: "不晚于" },
  { value: "on_or_after", label: "不早于" },
  { value: "is_empty", label: "为空" },
  { value: "is_not_empty", label: "不为空" },
];

const CHECKBOX_OPERATORS: FilterOperatorMeta[] = [
  { value: "checked", label: "已勾选" },
  { value: "unchecked", label: "未勾选" },
];

export function filterOperators(type: PropertyType): FilterOperatorMeta[] {
  switch (type) {
    case "number":
      return NUMBER_OPERATORS;
    case "select":
    case "status":
      return SELECT_OPERATORS;
    case "multi_select":
      return MULTI_OPERATORS;
    case "date":
    case "created_time":
    case "last_edited_time":
      return DATE_OPERATORS;
    case "checkbox":
      return CHECKBOX_OPERATORS;
    default:
      return TEXT_OPERATORS;
  }
}

export function operatorNeedsValue(operator: FilterOperator): boolean {
  return !["is_empty", "is_not_empty", "checked", "unchecked"].includes(operator);
}

export function defaultFilter(property: DatabaseProperty): FilterRule {
  const operators = filterOperators(property.type);
  const operator =
    property.type === "checkbox" ? "checked" : operators[0]?.value || "contains";
  let value: FilterRule["value"] = "";
  if (property.type === "select" || property.type === "status") {
    value = property.options?.[0]?.id || "";
  } else if (property.type === "multi_select") {
    value = property.options?.[0]?.id || "";
  } else if (
    property.type === "date" ||
    property.type === "created_time" ||
    property.type === "last_edited_time"
  ) {
    value = todayInput();
  } else if (property.type === "number") {
    value = 0;
  }
  return {
    id: uid("filter"),
    propertyId: property.id,
    operator,
    value,
  };
}

export function filterValueForProperty(
  property: DatabaseProperty,
  rule: FilterRule,
): unknown {
  if (property.type === "number") {
    return typeof rule.value === "number" ? rule.value : Number(rule.value);
  }
  if (property.type === "checkbox") return rule.value;
  return rule.value;
}

function timeValueOfDate(value: DateValue): number | null {
  return dateKey(value.start);
}

export function matchesFilter(
  row: DatabaseRow,
  property: DatabaseProperty,
  rule: FilterRule,
): boolean {
  const raw = getCell(row, property);
  const empty = isCellEmpty(raw);
  if (rule.operator === "is_empty") return empty;
  if (rule.operator === "is_not_empty") return !empty;
  if (rule.operator === "checked") return property.type === "checkbox" && raw === true;
  if (rule.operator === "unchecked") return property.type === "checkbox" && raw !== true;

  const filterValue = filterValueForProperty(property, rule);

  if (
    property.type === "text" ||
    property.type === "title" ||
    property.type === "url" ||
    property.type === "email"
  ) {
    const text = String(raw ?? "").toLocaleLowerCase();
    const needle = String(filterValue ?? "").toLocaleLowerCase();
    switch (rule.operator) {
      case "contains":
        return text.includes(needle);
      case "not_contains":
        return !text.includes(needle);
      case "is":
        return text === needle;
      case "is_not":
        return text !== needle;
      default:
        return true;
    }
  }

  if (property.type === "number") {
    const number = Number(raw);
    const target = Number(filterValue);
    if (!Number.isFinite(number)) return false;
    switch (rule.operator) {
      case "is":
        return number === target;
      case "is_not":
        return number !== target;
      case "gt":
        return number > target;
      case "gte":
        return number >= target;
      case "lt":
        return number < target;
      case "lte":
        return number <= target;
      default:
        return true;
    }
  }

  if (property.type === "select" || property.type === "status") {
    if (rule.operator === "is") return raw === filterValue;
    if (rule.operator === "is_not") return raw !== filterValue;
    return true;
  }

  if (property.type === "multi_select") {
    const values = Array.isArray(raw) ? raw : [];
    if (rule.operator === "contains") return values.includes(filterValue as string);
    if (rule.operator === "not_contains") return !values.includes(filterValue as string);
    return true;
  }

  if (
    property.type === "date" ||
    property.type === "created_time" ||
    property.type === "last_edited_time"
  ) {
    let actual: number | null;
    if (property.type === "date") {
      actual = timeValueOfDate(raw as DateValue);
    } else if (typeof raw === "number") {
      const date = new Date(raw);
      actual = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    } else {
      actual = null;
    }
    const target = dateKey(String(filterValue ?? ""));
    if (actual === null || target === null) return false;
    switch (rule.operator) {
      case "is":
        return actual === target;
      case "before":
        return actual < target;
      case "after":
        return actual > target;
      case "on_or_before":
        return actual <= target;
      case "on_or_after":
        return actual >= target;
      default:
        return true;
    }
  }

  return true;
}

export function filteredRows(db: DatabaseData, view: ViewConfig): DatabaseRow[] {
  const search = view.search.trim().toLocaleLowerCase();
  let rows = db.rows.filter((row) => {
    if (search && !rowSearchText(row, db).includes(search)) return false;
    if (view.filters.length === 0) return true;
    const checks = view.filters.map((rule) => {
      const property = propertyById(db, rule.propertyId);
      if (!property) return true;
      return matchesFilter(row, property, rule);
    });
    return view.conjunction === "or" ? checks.some(Boolean) : checks.every(Boolean);
  });

  if (view.sorts.length > 0) {
    const collator = new Intl.Collator("zh-CN", { numeric: true, sensitivity: "base" });
    rows = rows.slice().sort((a, b) => {
      for (const sort of view.sorts) {
        const property = propertyById(db, sort.propertyId);
        if (!property) continue;
        const aEmpty = isCellEmpty(getCell(a, property));
        const bEmpty = isCellEmpty(getCell(b, property));
        if (aEmpty || bEmpty) {
          if (aEmpty && bEmpty) continue;
          // Empty values always sit at the bottom, regardless of direction.
          return aEmpty ? 1 : -1;
        }
        const result = compareRowValues(a, b, property, collator);
        if (result !== 0) return sort.direction === "desc" ? -result : result;
      }
      return 0;
    });
  }

  return rows;
}

function compareRowValues(
  a: DatabaseRow,
  b: DatabaseRow,
  property: DatabaseProperty,
  collator: Intl.Collator,
): number {
  const aValue = getCell(a, property);
  const bValue = getCell(b, property);

  if (property.type === "number") {
    return Number(aValue) - Number(bValue);
  }
  if (property.type === "checkbox") {
    return Number(Boolean(aValue)) - Number(Boolean(bValue));
  }
  if (property.type === "date") {
    return (timeValueOfDate(aValue as DateValue) || 0) - (timeValueOfDate(bValue as DateValue) || 0);
  }
  if (property.type === "created_time" || property.type === "last_edited_time") {
    return Number(aValue) - Number(bValue);
  }
  if (property.type === "select" || property.type === "status") {
    return collator.compare(optionName(property, aValue), optionName(property, bValue));
  }
  if (property.type === "multi_select") {
    const textA = (aValue as string[]).map((id) => optionName(property, id)).join(", ");
    const textB = (bValue as string[]).map((id) => optionName(property, id)).join(", ");
    return collator.compare(textA, textB);
  }
  return collator.compare(String(aValue ?? ""), String(bValue ?? ""));
}

export interface RowGroup {
  key: string;
  label: string;
  color?: string;
  rows: DatabaseRow[];
  propertyId: string;
}

export function groupRows(
  db: DatabaseData,
  view: ViewConfig,
  rows: DatabaseRow[],
): RowGroup[] | null {
  if (!view.groupBy) return null;
  const property = propertyById(db, view.groupBy);
  if (!property) return null;

  if (property.type === "select" || property.type === "status") {
    const groups: RowGroup[] = (property.options || []).map((option) => ({
      key: `opt:${option.id}`,
      label: option.name,
      color: option.color,
      rows: [],
      propertyId: property.id,
    }));
    const none: RowGroup = {
      key: "none",
      label: "无",
      color: "default",
      rows: [],
      propertyId: property.id,
    };
    for (const row of rows) {
      const value = getCell(row, property);
      const group = groups.find((item) => item.key === `opt:${value}`);
      if (group) group.rows.push(row);
      else none.rows.push(row);
    }
    if (none.rows.length) groups.push(none);
    return groups.filter((group) => group.rows.length > 0);
  }

  if (property.type === "checkbox") {
    return [
      {
        key: "checked",
        label: "已勾选",
        color: "green",
        rows: rows.filter((row) => getCell(row, property) === true),
        propertyId: property.id,
      },
      {
        key: "unchecked",
        label: "未勾选",
        color: "gray",
        rows: rows.filter((row) => getCell(row, property) !== true),
        propertyId: property.id,
      },
    ].filter((group) => group.rows.length > 0);
  }

  const map = new Map<string, RowGroup>();
  for (const row of rows) {
    const label = cellText(row, property) || "无";
    if (!map.has(label)) {
      map.set(label, {
        key: `text:${label}`,
        label,
        rows: [],
        propertyId: property.id,
      });
    }
    map.get(label)!.rows.push(row);
  }
  return Array.from(map.values());
}

export function calculationOptions(property: DatabaseProperty): string[] {
  if (property.type === "number") {
    return ["none", "count", "sum", "average", "median", "min", "max", "filled", "empty", "unique"];
  }
  if (property.type === "checkbox") {
    return ["none", "count", "checked", "unchecked", "percent_checked"];
  }
  if (
    property.type === "date" ||
    property.type === "created_time" ||
    property.type === "last_edited_time"
  ) {
    return ["none", "count", "earliest", "latest", "filled", "empty"];
  }
  return ["none", "count", "filled", "empty", "unique"];
}

export function calculate(
  db: DatabaseData,
  property: DatabaseProperty,
  rows: DatabaseRow[],
  type: string,
): string {
  if (!type || type === "none") return "";
  const values = rows.map((row) => getCell(row, property));
  const nonEmpty = values.filter((value) => !isCellEmpty(value));

  if (type === "count") return String(rows.length);
  if (type === "filled") return String(nonEmpty.length);
  if (type === "empty") return String(rows.length - nonEmpty.length);
  if (type === "unique") {
    const set = new Set(nonEmpty.map((value) => cellTextValue(property, value)));
    return String(set.size);
  }
  if (type === "checked") return String(values.filter((value) => value === true).length);
  if (type === "unchecked") return String(values.filter((value) => value !== true).length);
  if (type === "percent_checked") {
    if (rows.length === 0) return "0%";
    const done = values.filter((value) => value === true).length;
    return `${Math.round((done / rows.length) * 100)}%`;
  }

  if (property.type === "number") {
    const numbers = nonEmpty.map(Number).filter((value) => Number.isFinite(value));
    if (numbers.length === 0) return "";
    if (type === "sum") return formatNumber(numbers.reduce((a, b) => a + b, 0), property);
    if (type === "average") {
      return formatNumber(numbers.reduce((a, b) => a + b, 0) / numbers.length, property);
    }
    if (type === "median") {
      const sorted = numbers.slice().sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);
      const median =
        sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
      return formatNumber(median, property);
    }
    if (type === "min") return formatNumber(Math.min(...numbers), property);
    if (type === "max") return formatNumber(Math.max(...numbers), property);
  }

  if (
    property.type === "date" ||
    property.type === "created_time" ||
    property.type === "last_edited_time"
  ) {
    const times = nonEmpty
      .map((value) => {
        if (property.type === "date") return dateKey((value as DateValue).start);
        return typeof value === "number" ? dateKey(new Date(value).toISOString()) : null;
      })
      .filter((value): value is number => value !== null);
    if (times.length === 0) return "";
    if (type === "earliest") return formatTimestamp(Math.min(...times));
    if (type === "latest") return formatTimestamp(Math.max(...times));
  }

  return "";
}

function cellTextValue(property: DatabaseProperty, value: unknown): string {
  const fakeRow: DatabaseRow = {
    id: "calc",
    cells: { [property.id]: value as DatabaseRow["cells"][string] },
    createdAt: 0,
    updatedAt: 0,
  };
  return cellText(fakeRow, property);
}

export function calculationLabel(type: string): string {
  return CALCULATION_LABELS[type] || type;
}

export function csvForView(db: DatabaseData, view: ViewConfig, rows: DatabaseRow[]): string {
  const properties = visibleProperties(db, view);
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [properties.map((property) => escape(property.name)).join(",")];
  for (const row of rows) {
    lines.push(
      properties
        .map((property) => {
          let text = cellText(row, property);
          if (property.type === "checkbox") text = getCell(row, property) === true ? "是" : "否";
          return escape(text);
        })
        .join(","),
    );
  }
  return `\uFEFF${lines.join("\r\n")}`;
}

export function serializeDatabase(db: DatabaseData): string {
  return `${JSON.stringify(db, null, 2)}\n`;
}

function ensureUniqueId(id: unknown, fallbackPrefix: string, used: Set<string>): string {
  let next = typeof id === "string" && id.trim() ? id.trim() : uid(fallbackPrefix);
  while (used.has(next)) next = uid(fallbackPrefix);
  used.add(next);
  return next;
}

function normalizeChartConfig(
  raw: unknown,
  properties: DatabaseProperty[],
  viewType: ViewType,
): ChartConfig {
  const input = (raw && typeof raw === "object" ? raw : {}) as Partial<ChartConfig>;
  const kind: ChartKind = input.kind === "pie" ? "pie" : "line";
  const defaults = defaultChartConfig(properties, kind);
  const propertyIds = new Set(properties.map((property) => property.id));
  const xPropertyId =
    typeof input.xPropertyId === "string" && propertyIds.has(input.xPropertyId)
      ? input.xPropertyId
      : defaults.xPropertyId;
  const valueProperty =
    typeof input.valuePropertyId === "string"
      ? properties.find(
          (property) => property.id === input.valuePropertyId && property.type === "number",
        )
      : null;
  const groupProperty =
    typeof input.groupByPropertyId === "string"
      ? properties.find(
          (property) =>
            property.id === input.groupByPropertyId &&
            ["select", "status", "checkbox"].includes(property.type),
        )
      : null;
  const aggregations: ChartAggregation[] = [
    "sum",
    "average",
    "count",
    "min",
    "max",
    "median",
  ];
  const aggregation =
    input.aggregation && aggregations.includes(input.aggregation)
      ? input.aggregation
      : defaults.aggregation;
  const dateGrains: ChartDateGrain[] = ["day", "month", "year"];
  const dateGrain =
    input.dateGrain && dateGrains.includes(input.dateGrain) ? input.dateGrain : "month";

  return {
    kind,
    xPropertyId,
    valuePropertyId: valueProperty?.id || null,
    aggregation: valueProperty ? aggregation : "count",
    groupByPropertyId:
      viewType === "chart" && kind === "line" && groupProperty && groupProperty.id !== xPropertyId
        ? groupProperty.id
        : null,
    dateGrain,
    showLegend: input.showLegend !== false,
  };
}

export function normalizeDatabase(raw: unknown): DatabaseData {
  const input = (raw && typeof raw === "object" ? raw : {}) as Partial<DatabaseData>;
  const fallback = createDatabase(
    typeof input.title === "string" && input.title.trim() ? input.title.trim() : "未命名数据库",
  );
  const usedPropertyIds = new Set<string>();
  const properties: DatabaseProperty[] = [];

  const rawProperties = Array.isArray(input.properties) ? input.properties : [];
  for (const rawProperty of rawProperties) {
    if (!rawProperty || typeof rawProperty !== "object") continue;
    const property = rawProperty as Partial<DatabaseProperty>;
    const type = property.type;
    if (
      !type ||
      ![
        "title",
        "text",
        "number",
        "select",
        "multi_select",
        "status",
        "date",
        "checkbox",
        "url",
        "email",
        "created_time",
        "last_edited_time",
      ].includes(type)
    ) {
      continue;
    }
    if (type === "title" && properties.some((item) => item.type === "title")) continue;
    const id = ensureUniqueId(property.id, "prop", usedPropertyIds);
    const options: SelectOption[] = [];
    if (Array.isArray(property.options)) {
      const optionIds = new Set<string>();
      for (const rawOption of property.options) {
        if (!rawOption || typeof rawOption !== "object") continue;
        const name = String(rawOption.name || "").trim();
        if (!name) continue;
        const optionId = ensureUniqueId(rawOption.id, "opt", optionIds);
        const color =
          typeof rawOption.color === "string" && rawOption.color in COLOR_LABELS
            ? rawOption.color
            : SELECT_COLORS[options.length % SELECT_COLORS.length];
        options.push({ id: optionId, name, color });
      }
    }
    properties.push({
      id,
      name:
        typeof property.name === "string" && property.name.trim()
          ? property.name.trim()
          : type === "title"
            ? "名称"
            : "未命名属性",
      type,
      width:
        typeof property.width === "number" && property.width >= 80
          ? Math.min(600, property.width)
          : type === "title"
            ? 320
            : 170,
      ...(type === "select" || type === "multi_select" || type === "status" ? { options } : {}),
      ...(type === "number"
        ? {
            numberFormat: ["number", "comma", "percent", "currency"].includes(
              property.numberFormat || "",
            )
              ? property.numberFormat
              : "number",
          }
        : {}),
    });
  }

  if (!properties.some((property) => property.type === "title")) {
    properties.unshift({
      id: ensureUniqueId("title", "prop", usedPropertyIds),
      name: "名称",
      type: "title",
      width: 320,
    });
  }

  const rawRows = Array.isArray(input.rows) ? input.rows : [];
  const rows: DatabaseRow[] = [];
  const usedRowIds = new Set<string>();
  for (const rawRow of rawRows) {
    if (!rawRow || typeof rawRow !== "object") continue;
    const row = rawRow as Partial<DatabaseRow>;
    const createdAt =
      typeof row.createdAt === "number" && Number.isFinite(row.createdAt)
        ? row.createdAt
        : Date.now();
    rows.push({
      id: ensureUniqueId(row.id, "row", usedRowIds),
      icon: typeof row.icon === "string" ? row.icon : "",
      cells:
        row.cells && typeof row.cells === "object" && !Array.isArray(row.cells)
          ? { ...row.cells }
          : {},
      content: typeof row.content === "string" ? row.content : "",
      createdAt,
      updatedAt:
        typeof row.updatedAt === "number" && Number.isFinite(row.updatedAt)
          ? row.updatedAt
          : createdAt,
    });
  }

  const rawViews = Array.isArray(input.views) ? input.views : [];
  const views: ViewConfig[] = [];
  const usedViewIds = new Set<string>();
  for (const rawView of rawViews) {
    if (!rawView || typeof rawView !== "object") continue;
    const view = rawView as Partial<ViewConfig>;
    const propertiesIds = new Set(properties.map((property) => property.id));
    const filters = Array.isArray(view.filters)
      ? view.filters.filter(
          (rule) =>
            rule &&
            typeof rule === "object" &&
            propertiesIds.has(String(rule.propertyId)) &&
            typeof rule.operator === "string",
        )
      : [];
    const sorts = Array.isArray(view.sorts)
      ? view.sorts.filter(
          (sort) =>
            sort &&
            typeof sort === "object" &&
            propertiesIds.has(String(sort.propertyId)) &&
            (sort.direction === "asc" || sort.direction === "desc"),
        )
      : [];
    const hiddenProperties = Array.isArray(view.hiddenProperties)
      ? view.hiddenProperties.filter((id) => propertiesIds.has(id))
      : [];
    const calculations =
      view.calculations && typeof view.calculations === "object"
        ? { ...view.calculations }
        : {};
    const viewType: ViewType = view.type === "chart" ? "chart" : "table";
    views.push({
      id: ensureUniqueId(view.id, "view", usedViewIds),
      name:
        typeof view.name === "string" && view.name.trim()
          ? view.name.trim()
          : viewType === "chart"
            ? "图表"
            : "表格",
      type: viewType,
      filters: filters.map((rule) => ({
        id: typeof rule.id === "string" ? rule.id : uid("filter"),
        propertyId: rule.propertyId,
        operator: rule.operator,
        value: rule.value ?? "",
      })),
      conjunction: view.conjunction === "or" ? "or" : "and",
      sorts: sorts.map((sort) => ({
        id: typeof sort.id === "string" ? sort.id : uid("sort"),
        propertyId: sort.propertyId,
        direction: sort.direction,
      })),
      search: typeof view.search === "string" ? view.search : "",
      hiddenProperties,
      showCalculations: view.showCalculations !== false,
      calculations,
      groupBy:
        typeof view.groupBy === "string" && propertiesIds.has(view.groupBy)
          ? view.groupBy
          : null,
      collapsedGroups: Array.isArray(view.collapsedGroups) ? view.collapsedGroups : [],
      wrapText: view.wrapText === true,
      chart: normalizeChartConfig(view.chart, properties, viewType),
    });
  }

  if (views.length === 0) {
    const view = fallback.views[0];
    view.hiddenProperties = [];
    views.push(view);
  }

  const activeViewId = views.some((view) => view.id === input.activeViewId)
    ? (input.activeViewId as string)
    : views[0].id;

  return {
    schemaVersion: SCHEMA_VERSION,
    title:
      typeof input.title === "string" && input.title.trim() ? input.title.trim() : "未命名数据库",
    icon: typeof input.icon === "string" ? input.icon : "🗂️",
    description: typeof input.description === "string" ? input.description : "",
    properties,
    rows,
    views,
    activeViewId,
    createdAt:
      typeof input.createdAt === "number" && Number.isFinite(input.createdAt)
        ? input.createdAt
        : Date.now(),
    updatedAt:
      typeof input.updatedAt === "number" && Number.isFinite(input.updatedAt)
        ? input.updatedAt
        : Date.now(),
  };
}

export function parseDatabaseJson(text: string): DatabaseData {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  if (!cleaned) return createDatabase();
  return normalizeDatabase(JSON.parse(cleaned));
}

export function createRow(db: DatabaseData, title = ""): DatabaseRow {
  const row: DatabaseRow = {
    id: uid("row"),
    icon: "",
    cells: {},
    content: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const titleProp = titleProperty(db);
  if (title.trim()) row.cells[titleProp.id] = title.trim();
  return row;
}

export function duplicateRow(row: DatabaseRow): DatabaseRow {
  return deepClone({
    ...row,
    id: uid("row"),
    cells: { ...row.cells },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export function touchDatabase(db: DatabaseData): void {
  db.updatedAt = Date.now();
}
