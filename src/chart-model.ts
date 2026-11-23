import {
  formatNumber,
  getCell,
  parseDate,
  propertyById,
} from "./model";
import {
  CHART_AGGREGATION_LABELS,
  ChartAggregation,
  ChartConfig,
  ChartDateGrain,
  DatabaseData,
  DatabaseProperty,
  DatabaseRow,
  DateValue,
  NumberFormat,
  ViewConfig,
} from "./types";

export interface ChartSeriesDatum {
  name: string;
  values: Array<number | null>;
}

export interface ChartData {
  kind: ChartConfig["kind"];
  categories: string[];
  categoryKeys: string[];
  series: ChartSeriesDatum[];
  metricLabel: string;
  categoryLabel: string;
  groupLabel: string;
  aggregation: ChartAggregation;
  valueFormat: NumberFormat | null;
  valuePropertyName: string;
  rowCount: number;
  total: number;
  empty: boolean;
  message: string;
  showLegend: boolean;
  dateGrain: ChartDateGrain;
}

interface CategoryInfo {
  key: string;
  label: string;
  sortKey: number | string;
  firstSeen: number;
  count: number;
}

interface SeriesBucket {
  name: string;
  order: number;
  buckets: Map<string, number[]>;
}

const EMPTY_KEY = "__empty__";
const EMPTY_LABEL = "无";

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function dateFromTimestamp(timestamp: number): Date {
  return new Date(timestamp);
}

function categoryDateLabel(date: Date, grain: ChartDateGrain): string {
  const currentYear = new Date().getFullYear();
  if (grain === "year") return `${date.getFullYear()}年`;
  if (grain === "month") return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  return date.getFullYear() === currentYear
    ? `${date.getMonth() + 1}月${date.getDate()}日`
    : `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function categoryDateKey(date: Date, grain: ChartDateGrain): string {
  if (grain === "year") return `${date.getFullYear()}`;
  if (grain === "month") return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function dateStartOfGrain(date: Date, grain: ChartDateGrain): number {
  if (grain === "year") return new Date(date.getFullYear(), 0, 1).getTime();
  if (grain === "month") return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function cleanLabel(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 28 ? `${trimmed.slice(0, 27)}…` : trimmed;
}

function optionIndex(property: DatabaseProperty, value: unknown): number {
  const index = property.options?.findIndex((option) => option.id === value) ?? -1;
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

function optionLabel(property: DatabaseProperty, value: unknown): string {
  return property.options?.find((option) => option.id === value)?.name?.trim() || "无";
}

function xCategoriesForRow(
  row: DatabaseRow,
  property: DatabaseProperty,
  grain: ChartDateGrain,
): Array<{ key: string; label: string; sortKey: number | string }> {
  const value = getCell(row, property);
  if (property.type === "checkbox") {
    const checked = value === true;
    return [
      {
        key: checked ? "checked" : "unchecked",
        label: checked ? "已勾选" : "未勾选",
        sortKey: checked ? 1 : 0,
      },
    ];
  }
  if (property.type === "select" || property.type === "status") {
    if (typeof value !== "string" || !value) {
      return [{ key: EMPTY_KEY, label: EMPTY_LABEL, sortKey: Number.MAX_SAFE_INTEGER }];
    }
    return [
      {
        key: value,
        label: optionLabel(property, value),
        sortKey: optionIndex(property, value),
      },
    ];
  }
  if (property.type === "multi_select") {
    const ids = Array.isArray(value) ? value : [];
    if (ids.length === 0) {
      return [{ key: EMPTY_KEY, label: EMPTY_LABEL, sortKey: Number.MAX_SAFE_INTEGER }];
    }
    return ids.map((id) => ({
      key: id,
      label: optionLabel(property, id),
      sortKey: optionIndex(property, id),
    }));
  }
  if (
    property.type === "date" ||
    property.type === "created_time" ||
    property.type === "last_edited_time"
  ) {
    let date: Date | null = null;
    if (property.type === "date") {
      date = parseDate((value as DateValue)?.start);
    } else if (typeof value === "number") {
      date = dateFromTimestamp(value);
    }
    if (!date) {
      return [{ key: EMPTY_KEY, label: EMPTY_LABEL, sortKey: Number.MAX_SAFE_INTEGER }];
    }
    return [
      {
        key: categoryDateKey(date, grain),
        label: categoryDateLabel(date, grain),
        sortKey: dateStartOfGrain(date, grain),
      },
    ];
  }

  const text = String(value ?? "").trim();
  if (!text) {
    return [{ key: EMPTY_KEY, label: EMPTY_LABEL, sortKey: Number.MAX_SAFE_INTEGER }];
  }
  if (property.type === "number") {
    const numeric = Number(value);
    return [
      {
        key: `number:${text}`,
        label: cleanLabel(String(value)),
        sortKey: Number.isFinite(numeric) ? numeric : text.toLocaleLowerCase(),
      },
    ];
  }
  return [
    {
      key: `text:${text}`,
      label: cleanLabel(text),
      sortKey: text.toLocaleLowerCase(),
    },
  ];
}

function groupForRow(
  row: DatabaseRow,
  property: DatabaseProperty | null,
): { key: string; label: string; order: number } {
  if (!property) return { key: "__all__", label: "", order: 0 };
  const value = getCell(row, property);
  if (property.type === "checkbox") {
    const checked = value === true;
    return {
      key: checked ? "checked" : "unchecked",
      label: checked ? "已勾选" : "未勾选",
      order: checked ? 1 : 0,
    };
  }
  if (property.type === "select" || property.type === "status") {
    if (typeof value !== "string" || !value) {
      return { key: EMPTY_KEY, label: EMPTY_LABEL, order: Number.MAX_SAFE_INTEGER };
    }
    return {
      key: value,
      label: optionLabel(property, value),
      order: optionIndex(property, value),
    };
  }
  return { key: "__all__", label: "", order: 0 };
}

function aggregateValues(
  values: number[],
  aggregation: ChartAggregation,
  emptyAsZero: boolean,
): number | null {
  if (aggregation === "count") return values.length;
  if (values.length === 0) return emptyAsZero ? 0 : null;
  if (aggregation === "sum") return values.reduce((total, value) => total + value, 0);
  if (aggregation === "average") {
    return values.reduce((total, value) => total + value, 0) / values.length;
  }
  if (aggregation === "min") return Math.min(...values);
  if (aggregation === "max") return Math.max(...values);
  if (aggregation === "median") {
    const sorted = values.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];
  }
  return null;
}

function sortCategories(
  categories: CategoryInfo[],
  property: DatabaseProperty,
  valuesByKey: Map<string, number | null>,
  kind: ChartConfig["kind"],
): CategoryInfo[] {
  if (kind === "pie") {
    return categories.slice().sort((a, b) => {
      const valueDelta = (valuesByKey.get(b.key) || 0) - (valuesByKey.get(a.key) || 0);
      if (valueDelta !== 0) return valueDelta;
      if (typeof a.sortKey === "number" && typeof b.sortKey === "number") {
        return a.sortKey - b.sortKey;
      }
      return a.firstSeen - b.firstSeen;
    });
  }

  return categories.slice().sort((a, b) => {
    if (a.key === EMPTY_KEY) return 1;
    if (b.key === EMPTY_KEY) return -1;
    if (
      property.type === "date" ||
      property.type === "created_time" ||
      property.type === "last_edited_time" ||
      property.type === "number" ||
      property.type === "select" ||
      property.type === "status" ||
      property.type === "multi_select" ||
      property.type === "checkbox"
    ) {
      if (typeof a.sortKey === "number" && typeof b.sortKey === "number") {
        return a.sortKey - b.sortKey;
      }
      return String(a.sortKey).localeCompare(String(b.sortKey), "zh-CN");
    }
    // Text-like X axes are most useful when the busiest values come first.
    if (a.count !== b.count) return b.count - a.count;
    return a.label.localeCompare(b.label, "zh-CN");
  });
}

export function buildChartData(
  db: DatabaseData,
  view: ViewConfig,
  rows: DatabaseRow[],
): ChartData {
  const chart = view.chart;
  const xProperty = chart.xPropertyId ? propertyById(db, chart.xPropertyId) : undefined;
  const valueProperty =
    chart.valuePropertyId && chart.aggregation !== "count"
      ? propertyById(db, chart.valuePropertyId)
      : undefined;
  const numericValue = valueProperty?.type === "number" ? valueProperty : undefined;
  const groupProperty =
    chart.kind === "line" && chart.groupByPropertyId
      ? propertyById(db, chart.groupByPropertyId)
      : undefined;
  const categoryLabel = xProperty?.name || "分类";
  const metricLabel =
    chart.aggregation === "count"
      ? "记录数"
      : `${valueProperty?.name || "数值"} · ${CHART_AGGREGATION_LABELS[chart.aggregation]}`;

  const emptyBase: ChartData = {
    kind: chart.kind,
    categories: [],
    categoryKeys: [],
    series: [],
    metricLabel,
    categoryLabel,
    groupLabel: groupProperty?.name || "",
    aggregation: chart.aggregation,
    valueFormat: numericValue?.numberFormat || null,
    valuePropertyName: valueProperty?.name || "",
    rowCount: rows.length,
    total: 0,
    empty: true,
    message: "没有可显示的图表数据",
    showLegend: chart.showLegend,
    dateGrain: chart.dateGrain,
  };

  if (!xProperty) return { ...emptyBase, message: "请选择一个 X 轴属性" };
  if (rows.length === 0) return { ...emptyBase, message: "当前视图没有匹配的记录" };

  const categoryMap = new Map<string, CategoryInfo>();
  const seriesMap = new Map<string, SeriesBucket>();
  let firstSeen = 0;

  for (const row of rows) {
    const xValues = xCategoriesForRow(row, xProperty, chart.dateGrain);
    const group = groupForRow(row, groupProperty);
    let series = seriesMap.get(group.key);
    if (!series) {
      series = {
        name: group.label || metricLabel,
        order: group.order,
        buckets: new Map(),
      };
      seriesMap.set(group.key, series);
    }

    for (const xValue of xValues) {
      let category = categoryMap.get(xValue.key);
      if (!category) {
        category = {
          key: xValue.key,
          label: xValue.label,
          sortKey: xValue.sortKey,
          firstSeen: firstSeen++,
          count: 0,
        };
        categoryMap.set(xValue.key, category);
      }
      category.count += 1;

      if (chart.aggregation === "count") {
        const bucket = series.buckets.get(xValue.key) || [];
        bucket.push(1);
        series.buckets.set(xValue.key, bucket);
      } else {
        const raw = getCell(row, numericValue!);
        const value = typeof raw === "number" ? raw : Number(raw);
        if (Number.isFinite(value)) {
          const bucket = series.buckets.get(xValue.key) || [];
          bucket.push(value);
          series.buckets.set(xValue.key, bucket);
        }
      }
    }
  }

  let categories = Array.from(categoryMap.values());
  let seriesBuckets = Array.from(seriesMap.values()).sort((a, b) => a.order - b.order);
  const emptyAsZero = chart.kind === "pie";

  const valueForKey = (key: string): number | null => {
    const totals = seriesBuckets.map((series) =>
      aggregateValues(series.buckets.get(key) || [], chart.aggregation, emptyAsZero),
    );
    if (totals.every((value) => value === null)) return null;
    return totals.reduce((sum, value) => sum + (value || 0), 0);
  };

  const orderMap = new Map<string, number | null>();
  for (const category of categories) orderMap.set(category.key, valueForKey(category.key));
  categories = sortCategories(categories, xProperty, orderMap, chart.kind);

  if (chart.kind === "pie" && categories.length > 12) {
    const kept = categories.slice(0, 11);
    const rest = categories.slice(11);
    const otherKey = "__other__";
    const otherValues = seriesBuckets.map((series) =>
      rest.flatMap((category) => series.buckets.get(category.key) || []),
    );
    kept.push({
      key: otherKey,
      label: "其他",
      sortKey: Number.MAX_SAFE_INTEGER,
      firstSeen: Number.MAX_SAFE_INTEGER,
      count: rest.reduce((sum, category) => sum + category.count, 0),
    });
    seriesBuckets = seriesBuckets.map((series, index) => {
      const next = {
        ...series,
        buckets: new Map(series.buckets),
      };
      next.buckets.set(otherKey, otherValues[index]);
      return next;
    });
    categories = kept;
  } else if (
    chart.kind === "line" &&
    categories.length > 40 &&
    !["date", "created_time", "last_edited_time"].includes(xProperty.type)
  ) {
    categories = categories.slice(0, 40);
  }

  const categoryKeys = categories.map((category) => category.key);
  const series: ChartSeriesDatum[] = seriesBuckets.map((bucket) => ({
    name: bucket.name,
    values: categoryKeys.map((key) =>
      aggregateValues(bucket.buckets.get(key) || [], chart.aggregation, emptyAsZero),
    ),
  }));

  let total = 0;
  for (const datum of series) {
    for (const value of datum.values) {
      if (typeof value === "number" && Number.isFinite(value)) total += value;
    }
  }

  const hasData = series.some((datum) =>
    datum.values.some((value) => typeof value === "number" && Number.isFinite(value)),
  );
  const empty =
    categories.length === 0 ||
    !hasData ||
    (chart.kind === "pie" && total <= 0);
  return {
    ...emptyBase,
    categories: categories.map((category) => category.label),
    categoryKeys,
    series,
    rowCount: rows.length,
    total,
    empty,
    message: empty ? "当前配置下没有可用的数值" : "",
  };
}

export function formatChartValue(value: number, data: ChartData): string {
  if (!Number.isFinite(value)) return "—";
  if (data.valueFormat === null) {
    return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(value);
  }
  // formatNumber expects a property, but only reads its numberFormat here.
  return formatNumber(value, {
    id: "__chart_value__",
    name: data.valuePropertyName,
    type: "number",
    numberFormat: data.valueFormat,
  });
}
