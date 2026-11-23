export const VIEW_TYPE = "one-database-view";
export const FILE_EXTENSION = "odata";
export const SCHEMA_VERSION = 2;

export type ColorName =
  | "default"
  | "gray"
  | "brown"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "red";

export type PropertyType =
  | "title"
  | "text"
  | "number"
  | "select"
  | "multi_select"
  | "status"
  | "date"
  | "checkbox"
  | "url"
  | "email"
  | "created_time"
  | "last_edited_time";

export type NumberFormat = "number" | "comma" | "percent" | "currency";

export interface SelectOption {
  id: string;
  name: string;
  color: ColorName;
}

export interface DatabaseProperty {
  id: string;
  name: string;
  type: PropertyType;
  width?: number;
  options?: SelectOption[];
  numberFormat?: NumberFormat;
}

export interface DateValue {
  start: string;
  end?: string;
  includeTime?: boolean;
}

export type CellValue = string | number | boolean | string[] | DateValue | null;

export interface DatabaseRow {
  id: string;
  icon?: string;
  cells: Record<string, CellValue>;
  content?: string;
  createdAt: number;
  updatedAt: number;
}

export type FilterOperator =
  | "contains"
  | "not_contains"
  | "is"
  | "is_not"
  | "is_empty"
  | "is_not_empty"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "before"
  | "after"
  | "on_or_before"
  | "on_or_after"
  | "checked"
  | "unchecked";

export interface FilterRule {
  id: string;
  propertyId: string;
  operator: FilterOperator;
  value: string | number | boolean | null;
}

export interface SortRule {
  id: string;
  propertyId: string;
  direction: "asc" | "desc";
}

export type ViewType = "table" | "chart";
export type ChartKind = "line" | "pie";
export type ChartAggregation = "sum" | "average" | "count" | "min" | "max" | "median";
export type ChartDateGrain = "day" | "month" | "year";

export interface ChartConfig {
  kind: ChartKind;
  xPropertyId: string | null;
  valuePropertyId: string | null;
  aggregation: ChartAggregation;
  groupByPropertyId: string | null;
  dateGrain: ChartDateGrain;
  showLegend: boolean;
}

export interface ViewConfig {
  id: string;
  name: string;
  type: ViewType;
  filters: FilterRule[];
  conjunction: "and" | "or";
  sorts: SortRule[];
  search: string;
  hiddenProperties: string[];
  showCalculations: boolean;
  calculations: Record<string, string>;
  groupBy: string | null;
  collapsedGroups: string[];
  wrapText: boolean;
  chart: ChartConfig;
}

export interface DatabaseData {
  schemaVersion: number;
  title: string;
  icon: string;
  description: string;
  properties: DatabaseProperty[];
  rows: DatabaseRow[];
  views: ViewConfig[];
  activeViewId: string;
  createdAt: number;
  updatedAt: number;
}

export interface PropertyTypeMeta {
  type: PropertyType;
  label: string;
  description: string;
  icon: string;
  glyph: string;
}

export const PROPERTY_TYPE_META: PropertyTypeMeta[] = [
  { type: "title", label: "名称", description: "行的标题", icon: "type", glyph: "Aa" },
  { type: "text", label: "文本", description: "纯文本内容", icon: "align-left", glyph: "Ab" },
  { type: "number", label: "数字", description: "数字、百分比或金额", icon: "hash", glyph: "#" },
  { type: "select", label: "单选", description: "从标签中选择一个", icon: "chevron-down", glyph: "◎" },
  { type: "multi_select", label: "多选", description: "选择多个标签", icon: "tags", glyph: "≡" },
  { type: "status", label: "状态", description: "带颜色的进度状态", icon: "circle-dot", glyph: "◔" },
  { type: "date", label: "日期", description: "日期或日期范围", icon: "calendar-days", glyph: "▦" },
  { type: "checkbox", label: "复选框", description: "勾选或取消勾选", icon: "square-check", glyph: "☑" },
  { type: "url", label: "网址", description: "可点击的链接", icon: "link", glyph: "↗" },
  { type: "email", label: "邮箱", description: "电子邮件地址", icon: "mail", glyph: "@" },
  { type: "created_time", label: "创建时间", description: "创建行的日期", icon: "clock", glyph: "◷" },
  {
    type: "last_edited_time",
    label: "最后编辑时间",
    description: "最后一次修改行的日期",
    icon: "history",
    glyph: "↻",
  },
];

export const PROPERTY_TYPE_BY_TYPE: Record<PropertyType, PropertyTypeMeta> = Object.fromEntries(
  PROPERTY_TYPE_META.map((meta) => [meta.type, meta]),
) as Record<PropertyType, PropertyTypeMeta>;

export const NOTION_COLORS: ColorName[] = [
  "default",
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
];

export const COLOR_LABELS: Record<ColorName, string> = {
  default: "默认",
  gray: "灰色",
  brown: "棕色",
  orange: "橙色",
  yellow: "黄色",
  green: "绿色",
  blue: "蓝色",
  purple: "紫色",
  pink: "粉色",
  red: "红色",
};

export const SELECT_COLORS: ColorName[] = [
  "blue",
  "orange",
  "green",
  "purple",
  "pink",
  "yellow",
  "red",
  "brown",
  "gray",
  "default",
];

export const CALCULATION_LABELS: Record<string, string> = {
  none: "无",
  count: "计数",
  filled: "已填写",
  empty: "空白",
  unique: "唯一值",
  sum: "求和",
  average: "平均值",
  median: "中位数",
  min: "最小值",
  max: "最大值",
  checked: "已勾选",
  unchecked: "未勾选",
  percent_checked: "完成率",
  earliest: "最早日期",
  latest: "最晚日期",
};

export const CHART_KIND_LABELS: Record<ChartKind, string> = {
  line: "折线图",
  pie: "饼图",
};

export const CHART_AGGREGATION_LABELS: Record<ChartAggregation, string> = {
  sum: "求和",
  average: "平均值",
  count: "计数",
  min: "最小值",
  max: "最大值",
  median: "中位数",
};

export const CHART_DATE_GRAIN_LABELS: Record<ChartDateGrain, string> = {
  day: "按天",
  month: "按月",
  year: "按年",
};
