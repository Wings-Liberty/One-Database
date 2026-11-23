import * as echarts from "echarts/core";
import { LineChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { ChartData, formatChartValue } from "../chart-model";

echarts.use([
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);

export const CHART_COLORS = [
  "#2383e2",
  "#d9730d",
  "#448361",
  "#c14c8a",
  "#9065b0",
  "#cb912f",
  "#d44c47",
  "#337ea9",
  "#9f6b53",
  "#6b6a67",
];

export type ChartInstance = ReturnType<typeof echarts.init>;

interface ThemePalette {
  text: string;
  muted: string;
  border: string;
  tooltipBg: string;
  tooltipBorder: string;
  bg: string;
}

function readThemePalette(container: HTMLElement): ThemePalette {
  const style = getComputedStyle(container);
  const read = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    text: read("--nt-text", "#37352f"),
    muted: read("--nt-text-secondary", "#787774"),
    border: read("--nt-border", "#e9e9e7"),
    bg: read("--nt-bg", "#ffffff"),
    tooltipBg: read("--nt-bg", "#ffffff"),
    tooltipBorder: read("--nt-border-strong", "#d9d9d6"),
  };
}

function readFontFamily(container: HTMLElement): string {
  return getComputedStyle(container).fontFamily || "sans-serif";
}

function truncateAxisLabel(value: string): string {
  return value.length > 16 ? `${value.slice(0, 15)}…` : value;
}

export function createChart(
  container: HTMLElement,
  data: ChartData,
  dark: boolean,
): ChartInstance {
  const existing = echarts.getInstanceByDom(container);
  existing?.dispose();

  const chart = echarts.init(container, undefined, {
    renderer: "canvas",
  });
  const palette = readThemePalette(container);
  const fontFamily = readFontFamily(container);
  const colors = dark
    ? ["#5a9fdc", "#e29a5b", "#73b38c", "#d783b2", "#b397d3", "#d6b565", "#e58c88", "#6ba9c6"]
    : CHART_COLORS;

  const baseTooltip = {
    backgroundColor: palette.tooltipBg,
    borderColor: palette.tooltipBorder,
    borderWidth: 1,
    padding: [8, 10],
    textStyle: {
      color: palette.text,
      fontSize: 12,
      fontFamily,
    },
    extraCssText: "box-shadow: 0 8px 24px rgba(15,15,15,.14); border-radius: 6px;",
  };

  let option: Record<string, unknown>;

  if (data.kind === "pie") {
    const pieValues = data.series[0]?.values || [];
    const total = pieValues.reduce((sum, value) => sum + (value || 0), 0);
    const showLegend = data.showLegend && data.categories.length > 1;
    option = {
      color: colors,
      animationDuration: 350,
      animationEasing: "cubicOut",
      tooltip: {
        ...baseTooltip,
        trigger: "item",
        formatter: (params: any) => {
          const value = Number(params.value) || 0;
          const percent = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
          return `<div style="font-weight:600;margin-bottom:3px">${params.marker}${params.name}</div><div style="color:${palette.muted}">${formatChartValue(value, data)} · ${percent}%</div>`;
        },
      },
      legend: showLegend
        ? {
            type: "scroll",
            orient: "vertical",
            right: 18,
            top: "middle",
            itemWidth: 9,
            itemHeight: 9,
            itemGap: 11,
            icon: "circle",
            textStyle: { color: palette.muted, fontSize: 11.5, fontFamily },
            pageTextStyle: { color: palette.muted, fontFamily },
            pageIconColor: palette.muted,
            pageIconInactiveColor: palette.border,
          }
        : { show: false },
      series: [
        {
          type: "pie",
          radius: ["0%", showLegend ? "65%" : "68%"],
          center: showLegend ? ["38%", "50%"] : ["50%", "50%"],
          avoidLabelOverlap: true,
          minAngle: 2,
          itemStyle: {
            borderColor: palette.bg,
            borderWidth: 2,
            borderRadius: 2,
          },
          label: {
            show: true,
            color: palette.text,
            fontSize: 11,
            fontFamily,
            lineHeight: 15,
            formatter: (params: any) =>
              params.percent >= 5 ? `${params.name}\n${params.percent}%` : "",
          },
          labelLine: {
            length: 7,
            length2: 6,
            lineStyle: { color: palette.border },
          },
          emphasis: {
            scale: true,
            scaleSize: 5,
            label: { fontWeight: 600 },
          },
          data: data.categories.map((name, index) => ({
            name,
            value: pieValues[index] || 0,
            itemStyle: { color: colors[index % colors.length] },
          })),
        },
      ],
    };
  } else {
    const showLegend = data.showLegend && data.series.length > 1;
    option = {
      color: colors,
      animationDuration: 320,
      animationEasing: "cubicOut",
      tooltip: {
        ...baseTooltip,
        trigger: "axis",
        axisPointer: {
          type: "line",
          lineStyle: { color: palette.border, width: 1 },
        },
        valueFormatter: (value: number) => formatChartValue(value, data),
      },
      legend: showLegend
        ? {
            type: "scroll",
            top: 4,
            left: 4,
            itemWidth: 12,
            itemHeight: 3,
            itemGap: 14,
            icon: "roundRect",
            textStyle: { color: palette.muted, fontSize: 11.5, fontFamily },
            pageTextStyle: { color: palette.muted, fontFamily },
            pageIconColor: palette.muted,
            pageIconInactiveColor: palette.border,
          }
        : { show: false },
      grid: {
        left: 8,
        right: 44,
        top: showLegend ? 44 : 20,
        bottom: 10,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: data.categories,
        boundaryGap: false,
        axisLine: { lineStyle: { color: palette.border } },
        axisTick: { show: false },
        axisLabel: {
          color: palette.muted,
          fontSize: 10.5,
          fontFamily,
          hideOverlap: true,
          margin: 12,
          formatter: (value: string) => truncateAxisLabel(value),
        },
      },
      yAxis: {
        type: "value",
        splitNumber: 4,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: palette.muted,
          fontSize: 10.5,
          fontFamily,
          formatter: (value: number) => formatChartValue(value, data),
        },
        splitLine: {
          lineStyle: { color: palette.border, type: "dashed", opacity: 0.8 },
        },
      },
      series: data.series.map((series, index) => ({
        name: series.name,
        type: "line",
        data: series.values,
        smooth: 0.22,
        symbol: "circle",
        symbolSize: 5,
        showSymbol: series.values.filter((value) => value !== null).length <= 24,
        connectNulls: false,
        lineStyle: {
          width: 2,
          color: colors[index % colors.length],
        },
        itemStyle: {
          color: colors[index % colors.length],
          borderColor: palette.bg,
          borderWidth: 1.5,
        },
        emphasis: { focus: "series" },
        animationDuration: 350,
      })),
    };
  }

  chart.setOption(option, { notMerge: true });
  return chart;
}

export function disposeChart(chart: ChartInstance | null): void {
  chart?.dispose();
}

export function isDarkTheme(): boolean {
  return document.body.classList.contains("theme-dark");
}
