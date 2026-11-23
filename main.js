var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => NotionTablePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");

// src/types.ts
var VIEW_TYPE = "one-database-view";
var FILE_EXTENSION = "odata";
var SCHEMA_VERSION = 1;
var PROPERTY_TYPE_META = [
  { type: "title", label: "\u540D\u79F0", description: "\u884C\u7684\u6807\u9898", icon: "type", glyph: "Aa" },
  { type: "text", label: "\u6587\u672C", description: "\u7EAF\u6587\u672C\u5185\u5BB9", icon: "align-left", glyph: "Ab" },
  { type: "number", label: "\u6570\u5B57", description: "\u6570\u5B57\u3001\u767E\u5206\u6BD4\u6216\u91D1\u989D", icon: "hash", glyph: "#" },
  { type: "select", label: "\u5355\u9009", description: "\u4ECE\u6807\u7B7E\u4E2D\u9009\u62E9\u4E00\u4E2A", icon: "chevron-down", glyph: "\u25CE" },
  { type: "multi_select", label: "\u591A\u9009", description: "\u9009\u62E9\u591A\u4E2A\u6807\u7B7E", icon: "tags", glyph: "\u2261" },
  { type: "status", label: "\u72B6\u6001", description: "\u5E26\u989C\u8272\u7684\u8FDB\u5EA6\u72B6\u6001", icon: "circle-dot", glyph: "\u25D4" },
  { type: "date", label: "\u65E5\u671F", description: "\u65E5\u671F\u6216\u65E5\u671F\u8303\u56F4", icon: "calendar-days", glyph: "\u25A6" },
  { type: "checkbox", label: "\u590D\u9009\u6846", description: "\u52FE\u9009\u6216\u53D6\u6D88\u52FE\u9009", icon: "square-check", glyph: "\u2611" },
  { type: "url", label: "\u7F51\u5740", description: "\u53EF\u70B9\u51FB\u7684\u94FE\u63A5", icon: "link", glyph: "\u2197" },
  { type: "email", label: "\u90AE\u7BB1", description: "\u7535\u5B50\u90AE\u4EF6\u5730\u5740", icon: "mail", glyph: "@" },
  { type: "created_time", label: "\u521B\u5EFA\u65F6\u95F4", description: "\u521B\u5EFA\u884C\u7684\u65E5\u671F", icon: "clock", glyph: "\u25F7" },
  {
    type: "last_edited_time",
    label: "\u6700\u540E\u7F16\u8F91\u65F6\u95F4",
    description: "\u6700\u540E\u4E00\u6B21\u4FEE\u6539\u884C\u7684\u65E5\u671F",
    icon: "history",
    glyph: "\u21BB"
  }
];
var PROPERTY_TYPE_BY_TYPE = Object.fromEntries(
  PROPERTY_TYPE_META.map((meta) => [meta.type, meta])
);
var COLOR_LABELS = {
  default: "\u9ED8\u8BA4",
  gray: "\u7070\u8272",
  brown: "\u68D5\u8272",
  orange: "\u6A59\u8272",
  yellow: "\u9EC4\u8272",
  green: "\u7EFF\u8272",
  blue: "\u84DD\u8272",
  purple: "\u7D2B\u8272",
  pink: "\u7C89\u8272",
  red: "\u7EA2\u8272"
};
var SELECT_COLORS = [
  "blue",
  "orange",
  "green",
  "purple",
  "pink",
  "yellow",
  "red",
  "brown",
  "gray",
  "default"
];
var CALCULATION_LABELS = {
  none: "\u65E0",
  count: "\u8BA1\u6570",
  filled: "\u5DF2\u586B\u5199",
  empty: "\u7A7A\u767D",
  unique: "\u552F\u4E00\u503C",
  sum: "\u6C42\u548C",
  average: "\u5E73\u5747\u503C",
  median: "\u4E2D\u4F4D\u6570",
  min: "\u6700\u5C0F\u503C",
  max: "\u6700\u5927\u503C",
  checked: "\u5DF2\u52FE\u9009",
  unchecked: "\u672A\u52FE\u9009",
  percent_checked: "\u5B8C\u6210\u7387",
  earliest: "\u6700\u65E9\u65E5\u671F",
  latest: "\u6700\u665A\u65E5\u671F"
};

// src/model.ts
var idCounter = 0;
function uid(prefix = "id") {
  idCounter = (idCounter + 1) % 1e6;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}
function createView(name = "\u8868\u683C") {
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
    wrapText: false
  };
}
function createDatabase(title = "\u672A\u547D\u540D\u6570\u636E\u5E93") {
  const now = Date.now();
  const titleProperty2 = {
    id: "title",
    name: "\u540D\u79F0",
    type: "title",
    width: 320
  };
  const view = createView("\u8868\u683C");
  view.calculations = { title: "count" };
  return {
    schemaVersion: SCHEMA_VERSION,
    title,
    icon: "\u{1F5C2}\uFE0F",
    description: "",
    properties: [titleProperty2],
    rows: [],
    views: [view],
    activeViewId: view.id,
    createdAt: now,
    updatedAt: now
  };
}
function option(name, color) {
  return { id: `opt_${name}_${Math.random().toString(36).slice(2, 7)}`, name, color };
}
function makeRow(title, cells, daysAgo, content = "") {
  const now = Date.now() - daysAgo * 864e5;
  return {
    id: uid("row"),
    icon: "",
    cells: { title, ...cells },
    content,
    createdAt: now,
    updatedAt: now
  };
}
function isoDay(offsetDays) {
  const date = /* @__PURE__ */ new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return toDateInput(date);
}
function createSampleDatabase(title = "\u4EFB\u52A1\u8FFD\u8E2A") {
  const db = createDatabase(title);
  db.icon = "\u{1F680}";
  db.description = "\u7528 Notion \u98CE\u683C\u7684\u8868\u683C\u7BA1\u7406\u9879\u76EE\u4EFB\u52A1\u3002\u5207\u6362\u89C6\u56FE\u67E5\u770B\u7B5B\u9009\u3001\u6392\u5E8F\u4E0E\u5206\u7EC4\uFF1B\u70B9\u51FB\u884C\u6807\u9898\u53EF\u6253\u5F00\u4EFB\u52A1\u8BE6\u60C5\u3002";
  db.properties[0].width = 280;
  const statusOptions = [
    option("\u672A\u5F00\u59CB", "gray"),
    option("\u8FDB\u884C\u4E2D", "blue"),
    option("\u5DF2\u5B8C\u6210", "green"),
    option("\u5DF2\u963B\u585E", "red")
  ];
  const ownerOptions = [
    option("\u6211", "blue"),
    option("\u6797\u590F", "purple"),
    option("\u9648\u9ED8", "orange"),
    option("\u5468\u7136", "pink")
  ];
  const priorityOptions = [
    option("\u9AD8", "red"),
    option("\u4E2D", "yellow"),
    option("\u4F4E", "gray")
  ];
  const tagOptions = [
    option("\u8BBE\u8BA1", "pink"),
    option("\u5F00\u53D1", "blue"),
    option("\u5185\u5BB9", "orange"),
    option("\u7814\u7A76", "purple"),
    option("\u534F\u4F5C", "green")
  ];
  db.properties.push(
    {
      id: "status",
      name: "\u72B6\u6001",
      type: "status",
      width: 120,
      options: statusOptions
    },
    {
      id: "owner",
      name: "\u8D1F\u8D23\u4EBA",
      type: "select",
      width: 110,
      options: ownerOptions
    },
    {
      id: "priority",
      name: "\u4F18\u5148\u7EA7",
      type: "select",
      width: 100,
      options: priorityOptions
    },
    {
      id: "due",
      name: "\u622A\u6B62\u65E5\u671F",
      type: "date",
      width: 180
    },
    {
      id: "effort",
      name: "\u5DE5\u65F6",
      type: "number",
      width: 80,
      numberFormat: "number"
    },
    {
      id: "tags",
      name: "\u6807\u7B7E",
      type: "multi_select",
      width: 160,
      options: tagOptions
    },
    {
      id: "done",
      name: "\u5B8C\u6210",
      type: "checkbox",
      width: 90
    },
    {
      id: "note",
      name: "\u5907\u6CE8",
      type: "text",
      width: 150
    }
  );
  const [\u672A\u5F00\u59CB, \u8FDB\u884C\u4E2D, \u5DF2\u5B8C\u6210, \u5DF2\u963B\u585E] = statusOptions;
  const [\u6211, \u6797\u590F, \u9648\u9ED8, \u5468\u7136] = ownerOptions;
  const [\u9AD8, \u4E2D, \u4F4E] = priorityOptions;
  const [\u8BBE\u8BA1, \u5F00\u53D1, \u5185\u5BB9, \u7814\u7A76, \u534F\u4F5C] = tagOptions;
  db.rows = [
    makeRow(
      "\u68B3\u7406\u4EA7\u54C1\u9700\u6C42\u4E0E\u8303\u56F4",
      {
        status: \u5DF2\u5B8C\u6210.id,
        owner: \u6211.id,
        priority: \u9AD8.id,
        due: { start: isoDay(-3) },
        effort: 6,
        tags: [\u7814\u7A76.id, \u534F\u4F5C.id],
        done: true,
        note: "\u5DF2\u548C\u56E2\u961F\u786E\u8BA4\u7B2C\u4E00\u7248\u8303\u56F4\u3002"
      },
      9,
      "## \u76EE\u6807\n\n\u786E\u5B9A\u7B2C\u4E00\u7248\u53EA\u505A\u8868\u683C\u89C6\u56FE\uFF0C\u5E76\u9501\u5B9A\u5C5E\u6027\u7C7B\u578B\u4E0E\u4EA4\u4E92\u8303\u56F4\u3002\n\n- [x] \u7ADE\u54C1\u4F53\u9A8C\n- [x] \u9700\u6C42\u6E05\u5355\n- [x] \u8303\u56F4\u8BC4\u5BA1"
    ),
    makeRow(
      "\u8BBE\u8BA1\u6570\u636E\u5E93\u8868\u683C\u89C6\u89C9\u89C4\u8303",
      {
        status: \u8FDB\u884C\u4E2D.id,
        owner: \u6797\u590F.id,
        priority: \u9AD8.id,
        due: { start: isoDay(0), end: isoDay(2) },
        effort: 12,
        tags: [\u8BBE\u8BA1.id, \u534F\u4F5C.id],
        done: false,
        note: "\u5BF9\u9F50 Notion \u7684\u7559\u767D\u3001\u8FB9\u6846\u548C\u6807\u7B7E\u8272\u3002"
      },
      6,
      "## \u8BBE\u8BA1\u8981\u70B9\n\n- \u884C\u9AD8 40px\uFF0C\u8868\u5934 36px\n- \u6807\u7B7E\u4F7F\u7528\u4F4E\u9971\u548C\u80CC\u666F\u8272\n- \u64CD\u4F5C\u6309\u94AE\u53EA\u5728\u60AC\u505C\u65F6\u51FA\u73B0\n\n\u53C2\u8003 Notion \u7684\u8868\u683C\u89C6\u56FE\uFF0C\u4F46\u4FDD\u7559 Obsidian \u7684\u4E3B\u9898\u914D\u8272\u3002"
    ),
    makeRow(
      "\u5B9E\u73B0\u5355\u5143\u683C\u5185\u8054\u7F16\u8F91",
      {
        status: \u8FDB\u884C\u4E2D.id,
        owner: \u9648\u9ED8.id,
        priority: \u9AD8.id,
        due: { start: isoDay(1) },
        effort: 16,
        tags: [\u5F00\u53D1.id],
        done: false,
        note: "\u6587\u672C\u3001\u6570\u5B57\u3001\u65E5\u671F\u3001\u72B6\u6001\u548C\u6807\u7B7E\u3002"
      },
      4,
      "\u9700\u8981\u652F\u6301\uFF1A\n\n1. \u5355\u51FB\u7F16\u8F91\uFF0CEnter \u4FDD\u5B58\uFF0CEsc \u53D6\u6D88\n2. \u6807\u7B7E\u5373\u65F6\u521B\u5EFA\n3. \u65E5\u671F\u8303\u56F4\n4. \u7A7A\u503C\u5360\u4F4D\u4E0E\u952E\u76D8\u7126\u70B9"
    ),
    makeRow(
      "\u5B8C\u5584\u7B5B\u9009\u4E0E\u6392\u5E8F\u9762\u677F",
      {
        status: \u672A\u5F00\u59CB.id,
        owner: \u9648\u9ED8.id,
        priority: \u4E2D.id,
        due: { start: isoDay(4) },
        effort: 10,
        tags: [\u5F00\u53D1.id],
        done: false,
        note: "\u652F\u6301 AND / OR \u4E0E\u591A\u6761\u4EF6\u6392\u5E8F\u3002"
      },
      2,
      ""
    ),
    makeRow(
      "\u64B0\u5199\u63D2\u4EF6\u4F7F\u7528\u8BF4\u660E",
      {
        status: \u672A\u5F00\u59CB.id,
        owner: \u5468\u7136.id,
        priority: \u4E2D.id,
        due: { start: isoDay(5) },
        effort: 4,
        tags: [\u5185\u5BB9.id],
        done: false,
        note: "\u914D\u4E00\u5F20\u529F\u80FD\u622A\u56FE\u3002"
      },
      2,
      "\u8BF4\u660E\u5982\u4F55\uFF1A\n\n- \u65B0\u5EFA\u6570\u636E\u5E93\n- \u6DFB\u52A0\u5C5E\u6027\u4E0E\u8BB0\u5F55\n- \u4F7F\u7528\u89C6\u56FE\n- \u5BFC\u51FA CSV"
    ),
    makeRow(
      "\u8BC4\u4F30\u884C\u8BE6\u60C5\u9875\u7684 Markdown \u7F16\u8F91",
      {
        status: \u5DF2\u963B\u585E.id,
        owner: \u6211.id,
        priority: \u4F4E.id,
        due: { start: isoDay(-1) },
        effort: 3,
        tags: [\u7814\u7A76.id, \u5F00\u53D1.id],
        done: false,
        note: "\u7B49\u5F85\u7F16\u8F91\u5668\u7EC4\u4EF6\u7684\u53EF\u884C\u65B9\u6848\u3002"
      },
      7,
      "\u963B\u585E\u539F\u56E0\uFF1A\u9700\u8981\u8BC4\u4F30\u5D4C\u5165\u5F0F Markdown \u7F16\u8F91\u5668\u662F\u5426\u4F1A\u4E0E Obsidian \u7684\u7F16\u8F91\u5386\u53F2\u51B2\u7A81\u3002\n\n\u5F53\u524D\u5148\u4F7F\u7528\u7EAF\u6587\u672C\u5907\u6CE8\u5B57\u6BB5\u3002"
    ),
    makeRow(
      "\u5236\u4F5C\u793A\u4F8B\u4EFB\u52A1\u6570\u636E",
      {
        status: \u5DF2\u5B8C\u6210.id,
        owner: \u6797\u590F.id,
        priority: \u4F4E.id,
        due: { start: isoDay(-5) },
        effort: 2,
        tags: [\u5185\u5BB9.id, \u534F\u4F5C.id],
        done: true,
        note: "\u8986\u76D6\u5168\u90E8\u5C5E\u6027\u7C7B\u578B\u3002"
      },
      8,
      ""
    ),
    makeRow(
      "\u6574\u7406\u53D1\u5E03\u524D\u68C0\u67E5\u6E05\u5355",
      {
        status: \u672A\u5F00\u59CB.id,
        owner: \u5468\u7136.id,
        priority: \u4E2D.id,
        due: { start: isoDay(7) },
        effort: 2,
        tags: [\u534F\u4F5C.id],
        done: false,
        note: "\u5B89\u88C5\u3001\u542F\u7528\u3001\u4E3B\u9898\u517C\u5BB9\u6027\u3002"
      },
      1,
      "- [ ] \u6DF1\u6D45\u8272\u4E3B\u9898\n- [ ] \u7A84\u7A97\u53E3\n- [ ] \u7A7A\u6570\u636E\u5E93\n- [ ] \u635F\u574F\u6570\u636E\u63D0\u793A"
    )
  ];
  const firstView = db.views[0];
  firstView.name = "\u5168\u90E8\u4EFB\u52A1";
  firstView.showCalculations = true;
  firstView.calculations = { title: "count", effort: "sum", done: "percent_checked" };
  const focusView = createView("\u6211\u8D1F\u8D23\u7684");
  focusView.filters = [
    {
      id: uid("filter"),
      propertyId: "owner",
      operator: "is",
      value: \u6211.id
    },
    {
      id: uid("filter"),
      propertyId: "done",
      operator: "unchecked",
      value: null
    }
  ];
  focusView.sorts = [{ id: uid("sort"), propertyId: "due", direction: "asc" }];
  focusView.calculations = { title: "count", effort: "sum" };
  focusView.showCalculations = true;
  const groupedView = createView("\u6309\u72B6\u6001\u5206\u7EC4");
  groupedView.groupBy = "status";
  groupedView.sorts = [{ id: uid("sort"), propertyId: "priority", direction: "asc" }];
  groupedView.showCalculations = true;
  groupedView.calculations = { title: "count" };
  db.views.push(focusView, groupedView);
  db.activeViewId = firstView.id;
  return db;
}
function activeView(db) {
  return db.views.find((view) => view.id === db.activeViewId) || db.views[0];
}
function titleProperty(db) {
  return db.properties.find((property) => property.type === "title") || db.properties[0];
}
function propertyById(db, id) {
  return db.properties.find((property) => property.id === id);
}
function visibleProperties(db, view) {
  return db.properties.filter((property) => !view.hiddenProperties.includes(property.id));
}
function isReadOnlyProperty(property) {
  return property.type === "created_time" || property.type === "last_edited_time";
}
function getRawCell(row, property) {
  if (property.type === "created_time") return row.createdAt;
  if (property.type === "last_edited_time") return row.updatedAt;
  return row.cells[property.id];
}
function getCell(row, property) {
  return getRawCell(row, property) ?? null;
}
function isCellEmpty(value) {
  if (value === null || value === void 0) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") {
    const date = value;
    return !date.start;
  }
  return false;
}
function setCell(row, property, value) {
  if (isReadOnlyProperty(property)) return;
  if (isCellEmpty(value)) {
    delete row.cells[property.id];
  } else {
    row.cells[property.id] = value;
  }
  row.updatedAt = Date.now();
}
function optionById(property, id) {
  if (typeof id !== "string") return void 0;
  return property.options?.find((option2) => option2.id === id);
}
function ensureOption(property, name) {
  const clean = name.trim();
  const existing = property.options?.find(
    (option2) => option2.name.toLocaleLowerCase() === clean.toLocaleLowerCase()
  );
  if (existing) return existing;
  if (!property.options) property.options = [];
  const created = {
    id: uid("opt"),
    name: clean,
    color: SELECT_COLORS[property.options.length % SELECT_COLORS.length]
  };
  property.options.push(created);
  return created;
}
function optionName(property, id) {
  return optionById(property, id)?.name ?? "";
}
function pad2(value) {
  return value < 10 ? `0${value}` : String(value);
}
function toDateInput(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
function todayInput() {
  return toDateInput(/* @__PURE__ */ new Date());
}
function parseDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function dateKey(value) {
  const date = parseDate(value);
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}
function formatDateValue(value) {
  const start = parseDate(value.start);
  if (!start) return "";
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  const startText = start.getFullYear() === currentYear ? `${start.getMonth() + 1}\u6708${start.getDate()}\u65E5` : `${start.getFullYear()}\u5E74${start.getMonth() + 1}\u6708${start.getDate()}\u65E5`;
  const withTime = value.includeTime || value.start.includes("T");
  let text = startText;
  if (withTime) {
    text += ` ${pad2(start.getHours())}:${pad2(start.getMinutes())}`;
  }
  if (value.end) {
    const end = parseDate(value.end);
    if (end) {
      const endText = end.getFullYear() === start.getFullYear() ? `${end.getMonth() + 1}\u6708${end.getDate()}\u65E5` : `${end.getFullYear()}\u5E74${end.getMonth() + 1}\u6708${end.getDate()}\u65E5`;
      text += ` \u2192 ${endText}`;
    }
  }
  return text;
}
function formatTimestamp(timestamp, includeTime = false) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const text = `${date.getFullYear()}\u5E74${date.getMonth() + 1}\u6708${date.getDate()}\u65E5`;
  return includeTime ? `${text} ${pad2(date.getHours())}:${pad2(date.getMinutes())}` : text;
}
function isDateOverdue(value, done) {
  if (done) return false;
  const key = dateKey(value.start);
  if (key === null) return false;
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  return key < today.getTime();
}
function formatNumber(value, property) {
  if (value === null || value === void 0 || value === "") return "";
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
        maximumFractionDigits: 2
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
function cellText(row, property) {
  const value = getCell(row, property);
  if (isCellEmpty(value)) return "";
  switch (property.type) {
    case "select":
    case "status":
      return optionName(property, value);
    case "multi_select":
      return value.map((id) => optionName(property, id)).filter(Boolean).join(", ");
    case "date":
      return formatDateValue(value);
    case "checkbox":
      return value ? "\u5DF2\u52FE\u9009" : "\u672A\u52FE\u9009";
    case "number":
      return formatNumber(value, property);
    case "created_time":
    case "last_edited_time":
      return formatTimestamp(value);
    default:
      return String(value ?? "");
  }
}
function rowSearchText(row, db) {
  const values = db.properties.map((property) => cellText(row, property));
  values.push(row.content || "");
  return values.join(" ").toLocaleLowerCase();
}
var TEXT_OPERATORS = [
  { value: "contains", label: "\u5305\u542B" },
  { value: "not_contains", label: "\u4E0D\u5305\u542B" },
  { value: "is", label: "\u7B49\u4E8E" },
  { value: "is_not", label: "\u4E0D\u7B49\u4E8E" },
  { value: "is_empty", label: "\u4E3A\u7A7A" },
  { value: "is_not_empty", label: "\u4E0D\u4E3A\u7A7A" }
];
var NUMBER_OPERATORS = [
  { value: "is", label: "=" },
  { value: "is_not", label: "\u2260" },
  { value: "gt", label: ">" },
  { value: "gte", label: "\u2265" },
  { value: "lt", label: "<" },
  { value: "lte", label: "\u2264" },
  { value: "is_empty", label: "\u4E3A\u7A7A" },
  { value: "is_not_empty", label: "\u4E0D\u4E3A\u7A7A" }
];
var SELECT_OPERATORS = [
  { value: "is", label: "\u662F" },
  { value: "is_not", label: "\u4E0D\u662F" },
  { value: "is_empty", label: "\u4E3A\u7A7A" },
  { value: "is_not_empty", label: "\u4E0D\u4E3A\u7A7A" }
];
var MULTI_OPERATORS = [
  { value: "contains", label: "\u5305\u542B" },
  { value: "not_contains", label: "\u4E0D\u5305\u542B" },
  { value: "is_empty", label: "\u4E3A\u7A7A" },
  { value: "is_not_empty", label: "\u4E0D\u4E3A\u7A7A" }
];
var DATE_OPERATORS = [
  { value: "is", label: "\u662F" },
  { value: "before", label: "\u65E9\u4E8E" },
  { value: "after", label: "\u665A\u4E8E" },
  { value: "on_or_before", label: "\u4E0D\u665A\u4E8E" },
  { value: "on_or_after", label: "\u4E0D\u65E9\u4E8E" },
  { value: "is_empty", label: "\u4E3A\u7A7A" },
  { value: "is_not_empty", label: "\u4E0D\u4E3A\u7A7A" }
];
var CHECKBOX_OPERATORS = [
  { value: "checked", label: "\u5DF2\u52FE\u9009" },
  { value: "unchecked", label: "\u672A\u52FE\u9009" }
];
function filterOperators(type) {
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
function operatorNeedsValue(operator) {
  return !["is_empty", "is_not_empty", "checked", "unchecked"].includes(operator);
}
function defaultFilter(property) {
  const operators = filterOperators(property.type);
  const operator = property.type === "checkbox" ? "checked" : operators[0]?.value || "contains";
  let value = "";
  if (property.type === "select" || property.type === "status") {
    value = property.options?.[0]?.id || "";
  } else if (property.type === "multi_select") {
    value = property.options?.[0]?.id || "";
  } else if (property.type === "date" || property.type === "created_time" || property.type === "last_edited_time") {
    value = todayInput();
  } else if (property.type === "number") {
    value = 0;
  }
  return {
    id: uid("filter"),
    propertyId: property.id,
    operator,
    value
  };
}
function filterValueForProperty(property, rule) {
  if (property.type === "number") {
    return typeof rule.value === "number" ? rule.value : Number(rule.value);
  }
  if (property.type === "checkbox") return rule.value;
  return rule.value;
}
function timeValueOfDate(value) {
  return dateKey(value.start);
}
function matchesFilter(row, property, rule) {
  const raw = getCell(row, property);
  const empty = isCellEmpty(raw);
  if (rule.operator === "is_empty") return empty;
  if (rule.operator === "is_not_empty") return !empty;
  if (rule.operator === "checked") return property.type === "checkbox" && raw === true;
  if (rule.operator === "unchecked") return property.type === "checkbox" && raw !== true;
  const filterValue = filterValueForProperty(property, rule);
  if (property.type === "text" || property.type === "title" || property.type === "url" || property.type === "email") {
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
    if (rule.operator === "contains") return values.includes(filterValue);
    if (rule.operator === "not_contains") return !values.includes(filterValue);
    return true;
  }
  if (property.type === "date" || property.type === "created_time" || property.type === "last_edited_time") {
    let actual;
    if (property.type === "date") {
      actual = timeValueOfDate(raw);
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
function filteredRows(db, view) {
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
function compareRowValues(a, b, property, collator) {
  const aValue = getCell(a, property);
  const bValue = getCell(b, property);
  if (property.type === "number") {
    return Number(aValue) - Number(bValue);
  }
  if (property.type === "checkbox") {
    return Number(Boolean(aValue)) - Number(Boolean(bValue));
  }
  if (property.type === "date") {
    return (timeValueOfDate(aValue) || 0) - (timeValueOfDate(bValue) || 0);
  }
  if (property.type === "created_time" || property.type === "last_edited_time") {
    return Number(aValue) - Number(bValue);
  }
  if (property.type === "select" || property.type === "status") {
    return collator.compare(optionName(property, aValue), optionName(property, bValue));
  }
  if (property.type === "multi_select") {
    const textA = aValue.map((id) => optionName(property, id)).join(", ");
    const textB = bValue.map((id) => optionName(property, id)).join(", ");
    return collator.compare(textA, textB);
  }
  return collator.compare(String(aValue ?? ""), String(bValue ?? ""));
}
function groupRows(db, view, rows) {
  if (!view.groupBy) return null;
  const property = propertyById(db, view.groupBy);
  if (!property) return null;
  if (property.type === "select" || property.type === "status") {
    const groups = (property.options || []).map((option2) => ({
      key: `opt:${option2.id}`,
      label: option2.name,
      color: option2.color,
      rows: [],
      propertyId: property.id
    }));
    const none = {
      key: "none",
      label: "\u65E0",
      color: "default",
      rows: [],
      propertyId: property.id
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
        label: "\u5DF2\u52FE\u9009",
        color: "green",
        rows: rows.filter((row) => getCell(row, property) === true),
        propertyId: property.id
      },
      {
        key: "unchecked",
        label: "\u672A\u52FE\u9009",
        color: "gray",
        rows: rows.filter((row) => getCell(row, property) !== true),
        propertyId: property.id
      }
    ].filter((group) => group.rows.length > 0);
  }
  const map = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const label = cellText(row, property) || "\u65E0";
    if (!map.has(label)) {
      map.set(label, {
        key: `text:${label}`,
        label,
        rows: [],
        propertyId: property.id
      });
    }
    map.get(label).rows.push(row);
  }
  return Array.from(map.values());
}
function calculationOptions(property) {
  if (property.type === "number") {
    return ["none", "count", "sum", "average", "median", "min", "max", "filled", "empty", "unique"];
  }
  if (property.type === "checkbox") {
    return ["none", "count", "checked", "unchecked", "percent_checked"];
  }
  if (property.type === "date" || property.type === "created_time" || property.type === "last_edited_time") {
    return ["none", "count", "earliest", "latest", "filled", "empty"];
  }
  return ["none", "count", "filled", "empty", "unique"];
}
function calculate(db, property, rows, type) {
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
    return `${Math.round(done / rows.length * 100)}%`;
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
      const median = sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
      return formatNumber(median, property);
    }
    if (type === "min") return formatNumber(Math.min(...numbers), property);
    if (type === "max") return formatNumber(Math.max(...numbers), property);
  }
  if (property.type === "date" || property.type === "created_time" || property.type === "last_edited_time") {
    const times = nonEmpty.map((value) => {
      if (property.type === "date") return dateKey(value.start);
      return typeof value === "number" ? dateKey(new Date(value).toISOString()) : null;
    }).filter((value) => value !== null);
    if (times.length === 0) return "";
    if (type === "earliest") return formatTimestamp(Math.min(...times));
    if (type === "latest") return formatTimestamp(Math.max(...times));
  }
  return "";
}
function cellTextValue(property, value) {
  const fakeRow = {
    id: "calc",
    cells: { [property.id]: value },
    createdAt: 0,
    updatedAt: 0
  };
  return cellText(fakeRow, property);
}
function calculationLabel(type) {
  return CALCULATION_LABELS[type] || type;
}
function csvForView(db, view, rows) {
  const properties = visibleProperties(db, view);
  const escape = (value) => `"${value.replace(/"/g, '""')}"`;
  const lines = [properties.map((property) => escape(property.name)).join(",")];
  for (const row of rows) {
    lines.push(
      properties.map((property) => {
        let text = cellText(row, property);
        if (property.type === "checkbox") text = getCell(row, property) === true ? "\u662F" : "\u5426";
        return escape(text);
      }).join(",")
    );
  }
  return `\uFEFF${lines.join("\r\n")}`;
}
function serializeDatabase(db) {
  return `${JSON.stringify(db, null, 2)}
`;
}
function ensureUniqueId(id, fallbackPrefix, used) {
  let next = typeof id === "string" && id.trim() ? id.trim() : uid(fallbackPrefix);
  while (used.has(next)) next = uid(fallbackPrefix);
  used.add(next);
  return next;
}
function normalizeDatabase(raw) {
  const input = raw && typeof raw === "object" ? raw : {};
  const fallback = createDatabase(
    typeof input.title === "string" && input.title.trim() ? input.title.trim() : "\u672A\u547D\u540D\u6570\u636E\u5E93"
  );
  const usedPropertyIds = /* @__PURE__ */ new Set();
  const properties = [];
  const rawProperties = Array.isArray(input.properties) ? input.properties : [];
  for (const rawProperty of rawProperties) {
    if (!rawProperty || typeof rawProperty !== "object") continue;
    const property = rawProperty;
    const type = property.type;
    if (!type || ![
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
      "last_edited_time"
    ].includes(type)) {
      continue;
    }
    if (type === "title" && properties.some((item) => item.type === "title")) continue;
    const id = ensureUniqueId(property.id, "prop", usedPropertyIds);
    const options = [];
    if (Array.isArray(property.options)) {
      const optionIds = /* @__PURE__ */ new Set();
      for (const rawOption of property.options) {
        if (!rawOption || typeof rawOption !== "object") continue;
        const name = String(rawOption.name || "").trim();
        if (!name) continue;
        const optionId = ensureUniqueId(rawOption.id, "opt", optionIds);
        const color = typeof rawOption.color === "string" && rawOption.color in COLOR_LABELS ? rawOption.color : SELECT_COLORS[options.length % SELECT_COLORS.length];
        options.push({ id: optionId, name, color });
      }
    }
    properties.push({
      id,
      name: typeof property.name === "string" && property.name.trim() ? property.name.trim() : type === "title" ? "\u540D\u79F0" : "\u672A\u547D\u540D\u5C5E\u6027",
      type,
      width: typeof property.width === "number" && property.width >= 80 ? Math.min(600, property.width) : type === "title" ? 320 : 170,
      ...type === "select" || type === "multi_select" || type === "status" ? { options } : {},
      ...type === "number" ? {
        numberFormat: ["number", "comma", "percent", "currency"].includes(
          property.numberFormat || ""
        ) ? property.numberFormat : "number"
      } : {}
    });
  }
  if (!properties.some((property) => property.type === "title")) {
    properties.unshift({
      id: ensureUniqueId("title", "prop", usedPropertyIds),
      name: "\u540D\u79F0",
      type: "title",
      width: 320
    });
  }
  const rawRows = Array.isArray(input.rows) ? input.rows : [];
  const rows = [];
  const usedRowIds = /* @__PURE__ */ new Set();
  for (const rawRow of rawRows) {
    if (!rawRow || typeof rawRow !== "object") continue;
    const row = rawRow;
    const createdAt = typeof row.createdAt === "number" && Number.isFinite(row.createdAt) ? row.createdAt : Date.now();
    rows.push({
      id: ensureUniqueId(row.id, "row", usedRowIds),
      icon: typeof row.icon === "string" ? row.icon : "",
      cells: row.cells && typeof row.cells === "object" && !Array.isArray(row.cells) ? { ...row.cells } : {},
      content: typeof row.content === "string" ? row.content : "",
      createdAt,
      updatedAt: typeof row.updatedAt === "number" && Number.isFinite(row.updatedAt) ? row.updatedAt : createdAt
    });
  }
  const rawViews = Array.isArray(input.views) ? input.views : [];
  const views = [];
  const usedViewIds = /* @__PURE__ */ new Set();
  for (const rawView of rawViews) {
    if (!rawView || typeof rawView !== "object") continue;
    const view = rawView;
    const propertiesIds = new Set(properties.map((property) => property.id));
    const filters = Array.isArray(view.filters) ? view.filters.filter(
      (rule) => rule && typeof rule === "object" && propertiesIds.has(String(rule.propertyId)) && typeof rule.operator === "string"
    ) : [];
    const sorts = Array.isArray(view.sorts) ? view.sorts.filter(
      (sort) => sort && typeof sort === "object" && propertiesIds.has(String(sort.propertyId)) && (sort.direction === "asc" || sort.direction === "desc")
    ) : [];
    const hiddenProperties = Array.isArray(view.hiddenProperties) ? view.hiddenProperties.filter((id) => propertiesIds.has(id)) : [];
    const calculations = view.calculations && typeof view.calculations === "object" ? { ...view.calculations } : {};
    views.push({
      id: ensureUniqueId(view.id, "view", usedViewIds),
      name: typeof view.name === "string" && view.name.trim() ? view.name.trim() : "\u8868\u683C",
      type: "table",
      filters: filters.map((rule) => ({
        id: typeof rule.id === "string" ? rule.id : uid("filter"),
        propertyId: rule.propertyId,
        operator: rule.operator,
        value: rule.value ?? ""
      })),
      conjunction: view.conjunction === "or" ? "or" : "and",
      sorts: sorts.map((sort) => ({
        id: typeof sort.id === "string" ? sort.id : uid("sort"),
        propertyId: sort.propertyId,
        direction: sort.direction
      })),
      search: typeof view.search === "string" ? view.search : "",
      hiddenProperties,
      showCalculations: view.showCalculations !== false,
      calculations,
      groupBy: typeof view.groupBy === "string" && propertiesIds.has(view.groupBy) ? view.groupBy : null,
      collapsedGroups: Array.isArray(view.collapsedGroups) ? view.collapsedGroups : [],
      wrapText: view.wrapText === true
    });
  }
  if (views.length === 0) {
    const view = fallback.views[0];
    view.hiddenProperties = [];
    views.push(view);
  }
  const activeViewId = views.some((view) => view.id === input.activeViewId) ? input.activeViewId : views[0].id;
  return {
    schemaVersion: SCHEMA_VERSION,
    title: typeof input.title === "string" && input.title.trim() ? input.title.trim() : "\u672A\u547D\u540D\u6570\u636E\u5E93",
    icon: typeof input.icon === "string" ? input.icon : "\u{1F5C2}\uFE0F",
    description: typeof input.description === "string" ? input.description : "",
    properties,
    rows,
    views,
    activeViewId,
    createdAt: typeof input.createdAt === "number" && Number.isFinite(input.createdAt) ? input.createdAt : Date.now(),
    updatedAt: typeof input.updatedAt === "number" && Number.isFinite(input.updatedAt) ? input.updatedAt : Date.now()
  };
}
function parseDatabaseJson(text) {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  if (!cleaned) return createDatabase();
  return normalizeDatabase(JSON.parse(cleaned));
}
function createRow(db, title = "") {
  const row = {
    id: uid("row"),
    icon: "",
    cells: {},
    content: "",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  const titleProp = titleProperty(db);
  if (title.trim()) row.cells[titleProp.id] = title.trim();
  return row;
}
function duplicateRow(row) {
  return deepClone({
    ...row,
    id: uid("row"),
    cells: { ...row.cells },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
}
function touchDatabase(db) {
  db.updatedAt = Date.now();
}

// src/view.ts
var import_obsidian4 = require("obsidian");

// src/ui/dom.ts
var import_obsidian = require("obsidian");
function h(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== void 0) element.textContent = text;
  return element;
}
function clear(element) {
  while (element.firstChild) element.removeChild(element.firstChild);
}
function iconEl(icon, className = "nt-icon") {
  const element = h("span", className);
  (0, import_obsidian.setIcon)(element, icon);
  return element;
}
function buttonEl(icon, label, className = "nt-toolbar-button") {
  const button = h("button", className);
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
  const iconSpan = iconEl(icon, "nt-button-icon");
  const labelSpan = h("span", "nt-button-label", label);
  button.append(iconSpan, labelSpan);
  return button;
}
function colorClass(color) {
  return `nt-color-${color || "default"}`;
}
var activePopover = null;
var Popover = class {
  constructor(anchor, options = {}) {
    this.closed = false;
    this.anchor = anchor;
    this.options = options;
    this.popoverEl = h("div", `nt-popover ${options.className || ""}`.trim());
    this.popoverEl.setAttribute("role", "dialog");
    this.contentEl = h("div", "nt-popover-content");
    this.popoverEl.append(this.contentEl);
    document.body.append(this.popoverEl);
    if (options.width) this.popoverEl.style.width = `${options.width}px`;
    this.onOutside = (event) => {
      const target = event.target;
      if (this.popoverEl.contains(target) || this.anchor.contains(target)) return;
      this.close();
    };
    this.onKeydown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      this.close();
    };
    this.onReposition = () => this.reposition();
    window.setTimeout(() => {
      document.addEventListener("mousedown", this.onOutside, true);
      document.addEventListener("keydown", this.onKeydown, true);
      window.addEventListener("resize", this.onReposition);
      document.addEventListener("scroll", this.onReposition, true);
    }, 0);
  }
  get element() {
    return this.popoverEl;
  }
  setContent(builder) {
    clear(this.contentEl);
    builder(this.contentEl);
    this.reposition();
  }
  reposition() {
    if (this.closed) return;
    const anchorRect = this.anchor.getBoundingClientRect();
    const popoverRect = this.popoverEl.getBoundingClientRect();
    const margin = 8;
    const gap = 6;
    const align = this.options.align || "start";
    let left = anchorRect.left;
    if (align === "end") left = anchorRect.right - popoverRect.width;
    if (align === "center") left = anchorRect.left + anchorRect.width / 2 - popoverRect.width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - popoverRect.width - margin));
    let top = anchorRect.bottom + gap;
    if (top + popoverRect.height > window.innerHeight - margin) {
      const above = anchorRect.top - popoverRect.height - gap;
      top = above >= margin ? above : Math.max(margin, window.innerHeight - popoverRect.height - margin);
    }
    this.popoverEl.style.left = `${Math.round(left)}px`;
    this.popoverEl.style.top = `${Math.round(top)}px`;
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    document.removeEventListener("mousedown", this.onOutside, true);
    document.removeEventListener("keydown", this.onKeydown, true);
    window.removeEventListener("resize", this.onReposition);
    document.removeEventListener("scroll", this.onReposition, true);
    this.popoverEl.remove();
    if (activePopover === this) activePopover = null;
  }
};
function openPopover(anchor, className, builder, options = {}) {
  if (activePopover) activePopover.close();
  const popover = new Popover(anchor, { ...options, className });
  activePopover = popover;
  builder(popover.contentEl, popover);
  popover.reposition();
  return popover;
}
function closeActivePopover() {
  activePopover?.close();
}
var PromptModal = class extends import_obsidian.Modal {
  constructor(app, options) {
    super(app);
    this.result = null;
    this.resolved = false;
    this.titleText = options.title;
    this.label = options.label || "";
    this.placeholder = options.placeholder || "";
    this.initial = options.value || "";
    this.submitLabel = options.submitLabel || "\u786E\u5B9A";
  }
  wait() {
    this.open();
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }
  onOpen() {
    this.modalEl.addClass("nt-modal");
    this.titleEl.setText(this.titleText);
    this.contentEl.empty();
    if (this.label) {
      this.contentEl.createDiv({ cls: "nt-field-label", text: this.label });
    }
    this.input = this.contentEl.createEl("input", {
      cls: "nt-text-input nt-prompt-input",
      type: "text",
      value: this.initial,
      attr: { placeholder: this.placeholder }
    });
    const actions = this.contentEl.createDiv({ cls: "nt-modal-actions" });
    const cancel = actions.createEl("button", { cls: "nt-button", text: "\u53D6\u6D88" });
    cancel.addEventListener("click", () => {
      this.result = null;
      this.close();
    });
    const submit = actions.createEl("button", {
      cls: "nt-button nt-button-primary",
      text: this.submitLabel
    });
    submit.addEventListener("click", () => this.submit());
    this.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.submit();
      }
    });
    window.setTimeout(() => {
      this.input.focus();
      this.input.select();
    }, 30);
  }
  submit() {
    this.result = this.input.value.trim() || null;
    this.close();
  }
  onClose() {
    this.contentEl.empty();
    if (!this.resolved) {
      this.resolved = true;
      this.resolvePromise?.(this.result);
    }
  }
};
function promptText(app, options) {
  return new PromptModal(app, options).wait();
}
function confirmAction(app, title, message, options = {}) {
  return new Promise((resolve) => {
    let answered = false;
    const modal = new class extends import_obsidian.Modal {
      onOpen() {
        this.modalEl.addClass("nt-modal");
        this.titleEl.setText(title);
        this.contentEl.empty();
        this.contentEl.createEl("p", { cls: "nt-modal-message", text: message });
        const actions = this.contentEl.createDiv({ cls: "nt-modal-actions" });
        const cancel = actions.createEl("button", { cls: "nt-button", text: "\u53D6\u6D88" });
        cancel.addEventListener("click", () => {
          answered = true;
          resolve(false);
          this.close();
        });
        const confirm = actions.createEl("button", {
          cls: `nt-button ${options.danger === false ? "nt-button-primary" : "nt-button-danger"}`,
          text: options.confirmLabel || "\u5220\u9664"
        });
        confirm.addEventListener("click", () => {
          answered = true;
          resolve(true);
          this.close();
        });
      }
      onClose() {
        this.contentEl.empty();
        if (!answered) {
          answered = true;
          resolve(false);
        }
      }
    }(app);
    modal.open();
  });
}
function notify(message, duration = 3e3) {
  new import_obsidian.Notice(message, duration);
}
function downloadTextFile(filename, content, mime = "text/csv") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2e3);
}
function sanitizeFilename(name) {
  const cleaned = name.replace(/[\\/:*?"<>|#^[\]]/g, " ").replace(/\s+/g, " ").trim().replace(/^\.+/, "");
  return cleaned || "\u672A\u547D\u540D\u6570\u636E\u5E93";
}

// src/ui/forms.ts
var import_obsidian2 = require("obsidian");
var NewPropertyModal = class extends import_obsidian2.Modal {
  constructor(app, existingNames = []) {
    super(app);
    this.resolved = false;
    this.result = null;
    this.selectedType = "text";
    this.formatSelect = null;
    this.existingNames = existingNames;
  }
  wait() {
    this.open();
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }
  onOpen() {
    this.modalEl.addClass("nt-modal", "nt-property-modal");
    this.titleEl.setText("\u65B0\u5EFA\u5C5E\u6027");
    this.contentEl.empty();
    const nameField = this.contentEl.createDiv({ cls: "nt-form-field" });
    nameField.createDiv({ cls: "nt-field-label", text: "\u5C5E\u6027\u540D\u79F0" });
    this.nameInput = nameField.createEl("input", {
      cls: "nt-text-input",
      type: "text",
      attr: { placeholder: "\u4F8B\u5982\uFF1A\u622A\u6B62\u65E5\u671F", maxlength: "60" }
    });
    const typeField = this.contentEl.createDiv({ cls: "nt-form-field" });
    typeField.createDiv({ cls: "nt-field-label", text: "\u5C5E\u6027\u7C7B\u578B" });
    this.typeGrid = typeField.createDiv({ cls: "nt-type-grid" });
    for (const meta of PROPERTY_TYPE_META) {
      if (meta.type === "title") continue;
      const button = this.typeGrid.createEl("button", {
        cls: "nt-type-option",
        attr: { type: "button" }
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
    numberField.createDiv({ cls: "nt-field-label", text: "\u6570\u5B57\u683C\u5F0F" });
    this.formatSelect = numberField.createEl("select", { cls: "nt-select" });
    this.formatSelect.createEl("option", { value: "number", text: "\u6570\u5B57" });
    this.formatSelect.createEl("option", { value: "comma", text: "\u5343\u5206\u4F4D" });
    this.formatSelect.createEl("option", { value: "percent", text: "\u767E\u5206\u6BD4" });
    this.formatSelect.createEl("option", { value: "currency", text: "\u4EBA\u6C11\u5E01" });
    numberField.addClass("is-hidden");
    const actions = this.contentEl.createDiv({ cls: "nt-modal-actions" });
    const cancel = actions.createEl("button", { cls: "nt-button", text: "\u53D6\u6D88" });
    cancel.addEventListener("click", () => this.close());
    const submit = actions.createEl("button", {
      cls: "nt-button nt-button-primary",
      text: "\u521B\u5EFA\u5C5E\u6027"
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
  updateTypeSelection() {
    const buttons = Array.from(this.typeGrid.querySelectorAll(".nt-type-option"));
    buttons.forEach((button, index) => {
      const meta = PROPERTY_TYPE_META.filter((item) => item.type !== "title")[index];
      button.toggleClass("is-selected", meta.type === this.selectedType);
      button.setAttribute("aria-pressed", String(meta.type === this.selectedType));
    });
  }
  updateFormatField() {
    const field = this.contentEl.querySelector(".nt-number-format-field");
    field?.toggleClass("is-hidden", this.selectedType !== "number");
  }
  submit() {
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
      numberFormat: this.formatSelect?.value || "number"
    };
    this.close();
  }
  onClose() {
    this.contentEl.empty();
    if (!this.resolved) {
      this.resolved = true;
      this.resolvePromise?.(this.result);
    }
  }
};
var HelpModal = class extends import_obsidian2.Modal {
  onOpen() {
    this.modalEl.addClass("nt-modal", "nt-help-modal");
    this.titleEl.setText("\u4F7F\u7528 One Database");
    this.contentEl.empty();
    const intro = this.contentEl.createEl("p", {
      cls: "nt-help-intro",
      text: "One Database \u662F\u4E00\u4E2A\u4EE5 Notion \u8868\u683C\u89C6\u56FE\u4E3A\u7075\u611F\u7684 Obsidian \u6570\u636E\u5E93\u63D2\u4EF6\u3002\u6BCF\u4E2A .odata \u6587\u4EF6\u90FD\u662F\u4E00\u4E2A\u6570\u636E\u5E93\uFF0C\u6570\u636E\u4EE5\u53EF\u8BFB\u7684 JSON \u4FDD\u5B58\u5728\u4ED3\u5E93\u5185\u3002"
    });
    intro.setAttr("style", "margin-top:0");
    const sections = [
      [
        "\u57FA\u672C\u64CD\u4F5C",
        [
          "\u70B9\u51FB\u5355\u5143\u683C\u5373\u53EF\u7F16\u8F91\uFF1BEnter \u4FDD\u5B58\uFF0CEsc \u53D6\u6D88\u3002",
          "\u70B9\u51FB\u8868\u5934\u53EF\u91CD\u547D\u540D\u3001\u79FB\u52A8\u3001\u9690\u85CF\u6216\u5220\u9664\u5C5E\u6027\uFF0C\u4E5F\u53EF\u4EE5\u62D6\u62FD\u8868\u5934\u53F3\u8FB9\u7F18\u8C03\u6574\u5217\u5BBD\u3002",
          "\u70B9\u51FB\u8868\u683C\u5E95\u90E8\u7684\u300C\uFF0B \u65B0\u5EFA\u4E00\u884C\u300D\u6DFB\u52A0\u8BB0\u5F55\uFF1B\u884C\u6807\u9898\u53F3\u4FA7\u7684\u6309\u94AE\u53EF\u6253\u5F00\u4EFB\u52A1\u8BE6\u60C5\u9875\u3002",
          "\u5DE6\u4FA7\u52FE\u9009\u6846\u652F\u6301\u591A\u9009\uFF0C\u9009\u4E2D\u540E\u53EF\u6279\u91CF\u5220\u9664\u3002"
        ]
      ],
      [
        "\u89C6\u56FE",
        [
          "\u4E00\u4E2A\u6570\u636E\u5E93\u53EF\u4EE5\u6709\u591A\u4E2A\u8868\u683C\u89C6\u56FE\u3002\u6BCF\u4E2A\u89C6\u56FE\u72EC\u7ACB\u4FDD\u5B58\u7B5B\u9009\u3001\u6392\u5E8F\u3001\u641C\u7D22\u3001\u5206\u7EC4\u3001\u9690\u85CF\u5C5E\u6027\u4E0E\u8BA1\u7B97\u65B9\u5F0F\u3002",
          "\u53CC\u51FB\u89C6\u56FE\u6807\u7B7E\u53EF\u91CD\u547D\u540D\uFF0C\u53F3\u952E\u53EF\u590D\u5236\u6216\u5220\u9664\u89C6\u56FE\u3002",
          "\u7B5B\u9009\u652F\u6301\u300C\u6EE1\u8DB3\u5168\u90E8 / \u4EFB\u4E00\u6761\u4EF6\u300D\uFF1B\u6392\u5E8F\u652F\u6301\u591A\u4E2A\u6761\u4EF6\u3002"
        ]
      ],
      [
        "\u6570\u636E\u4E0E\u5907\u4EFD",
        [
          "\u6570\u636E\u5E93\u662F\u7EAF\u6587\u672C .odata \u6587\u4EF6\uFF0C\u53EF\u4EE5\u76F4\u63A5\u88AB Git\u3001\u540C\u6B65\u76D8\u5907\u4EFD\u3002",
          "\u53F3\u952E\u6570\u636E\u5E93\u6587\u4EF6\u53EF\u5BFC\u51FA\u5F53\u524D\u89C6\u56FE\u4E3A CSV\u3002",
          "\u4E0D\u8981\u540C\u65F6\u6253\u5F00\u540C\u4E00\u4E2A\u6570\u636E\u5E93\u7684\u591A\u4E2A\u6807\u7B7E\u9875\u7F16\u8F91\uFF0C\u4EE5\u514D\u540E\u4FDD\u5B58\u7684\u7248\u672C\u8986\u76D6\u5148\u4FDD\u5B58\u7684\u7248\u672C\u3002"
        ]
      ]
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
      text: "\u5F00\u59CB\u4F7F\u7528"
    });
    close.addEventListener("click", () => this.close());
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/ui/row-page.ts
var import_obsidian3 = require("obsidian");
var RowPageModal = class extends import_obsidian3.Modal {
  constructor(app, db, row, options) {
    super(app);
    this.db = db;
    this.row = row;
    this.options = options;
    this.titleProp = titleProperty(db);
  }
  onOpen() {
    this.modalEl.addClass("nt-row-page-modal");
    this.titleEl.empty();
    this.contentEl.empty();
    this.contentEl.addClass("nt-row-page-content");
    const cover = this.contentEl.createDiv({ cls: "nt-row-page-cover" });
    const topbar = cover.createDiv({ cls: "nt-row-page-topbar" });
    const crumb = topbar.createDiv({ cls: "nt-row-page-crumb" });
    crumb.createSpan({ cls: "nt-row-page-crumb-icon", text: this.db.icon || "\u{1F5C2}\uFE0F" });
    crumb.createSpan({ text: this.db.title });
    const closeButton = topbar.createEl("button", {
      cls: "nt-icon-button",
      attr: { type: "button", "aria-label": "\u5173\u95ED" }
    });
    closeButton.append(iconEl("x", "nt-icon"));
    closeButton.addEventListener("click", () => this.close());
    const head = this.contentEl.createDiv({ cls: "nt-row-page-head" });
    const iconField = head.createDiv({ cls: "nt-row-page-icon-field" });
    const iconInput = iconField.createEl("input", {
      cls: "nt-row-page-icon-input",
      type: "text",
      value: this.row.icon || "",
      attr: { placeholder: "\uFF0B", maxlength: "4", "aria-label": "\u9875\u9762\u56FE\u6807" }
    });
    iconInput.addEventListener("input", () => {
      this.row.icon = iconInput.value.trim();
      this.row.updatedAt = Date.now();
      touchDatabase(this.db);
      this.options.onMutate();
    });
    this.titleInput = head.createEl("textarea", {
      cls: "nt-row-page-title",
      attr: { rows: "1", placeholder: "\u672A\u547D\u540D", "aria-label": "\u6807\u9898" }
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
      const trimmed = this.titleInput.value.trim();
      if (trimmed !== this.titleInput.value) {
        this.titleInput.value = trimmed;
        this.autoGrow(this.titleInput);
        setCell(this.row, this.titleProp, trimmed);
        this.options.onMutate();
      }
    });
    const meta = this.contentEl.createDiv({ cls: "nt-row-page-meta" });
    meta.createSpan({ text: `\u521B\u5EFA\u4E8E ${formatTimestamp(this.row.createdAt)}` });
    meta.createSpan({ cls: "nt-row-page-meta-sep", text: "\xB7" });
    meta.createSpan({ text: `\u6700\u540E\u7F16\u8F91 ${formatTimestamp(this.row.updatedAt)}` });
    const properties = this.contentEl.createDiv({ cls: "nt-row-page-properties" });
    for (const property of this.db.properties) {
      if (property.type === "title") continue;
      this.renderProperty(properties, property);
    }
    const contentSection = this.contentEl.createDiv({ cls: "nt-row-page-body" });
    contentSection.createDiv({ cls: "nt-row-page-section-title", text: "\u9875\u9762\u5185\u5BB9" });
    const textarea = contentSection.createEl("textarea", {
      cls: "nt-row-page-textarea",
      attr: {
        placeholder: "\u5199\u70B9\u4EC0\u4E48\u2026\uFF08\u7EAF\u6587\u672C\uFF0C\u968F\u6570\u636E\u5E93\u6587\u4EF6\u4E00\u8D77\u4FDD\u5B58\uFF09",
        rows: "8"
      }
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
      cls: "nt-button nt-button-danger-ghost"
    });
    deleteButton.append(iconEl("trash-2", "nt-button-icon"));
    deleteButton.createSpan({ text: "\u5220\u9664\u8FD9\u4E00\u884C" });
    deleteButton.addEventListener("click", async () => {
      const confirmed = await confirmAction(
        this.app,
        "\u5220\u9664\u8BB0\u5F55",
        `\u786E\u5B9A\u8981\u5220\u9664\u300C${this.titleText() || "\u672A\u547D\u540D"}\u300D\u5417\uFF1F\u6B64\u64CD\u4F5C\u65E0\u6CD5\u64A4\u9500\u3002`,
        { confirmLabel: "\u5220\u9664\u8BB0\u5F55" }
      );
      if (!confirmed) return;
      await this.options.onDelete(this.row);
      this.close();
    });
    const closeFooter = footer.createEl("button", {
      cls: "nt-button nt-button-primary",
      text: "\u5B8C\u6210"
    });
    closeFooter.addEventListener("click", () => this.close());
  }
  titleText() {
    return String(getCell(this.row, this.titleProp) ?? "");
  }
  renderProperty(container, property) {
    const row = container.createDiv({ cls: "nt-row-page-property" });
    const label = row.createDiv({ cls: "nt-row-page-property-label" });
    label.append(iconEl("chevron-right", "nt-property-collapse"));
    label.append(iconEl(this.propertyIcon(property), "nt-property-type-icon"));
    label.createSpan({ text: property.name });
    const value = row.createDiv({ cls: "nt-row-page-property-value" });
    if (isReadOnlyProperty(property)) {
      const text = property.type === "created_time" ? formatTimestamp(this.row.createdAt, true) : formatTimestamp(this.row.updatedAt, true);
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
  renderTextProperty(container, property) {
    const input = container.createEl("input", {
      cls: "nt-text-input nt-row-page-input",
      type: property.type === "email" ? "email" : "text",
      value: String(getCell(this.row, property) ?? ""),
      attr: { placeholder: "\u7A7A" }
    });
    if (property.type === "url") {
      const open = container.createEl("button", {
        cls: "nt-icon-button nt-inline-icon-button",
        attr: { type: "button", "aria-label": "\u6253\u5F00\u94FE\u63A5" }
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
  renderNumberProperty(container, property) {
    const input = container.createEl("input", {
      cls: "nt-text-input nt-row-page-input",
      type: "number",
      value: getCell(this.row, property) === null || getCell(this.row, property) === void 0 ? "" : String(getCell(this.row, property)),
      attr: { placeholder: "\u7A7A", step: "any" }
    });
    input.addEventListener("input", () => {
      const value = input.value.trim();
      setCell(this.row, property, value === "" ? null : Number(value));
      this.options.onMutate();
    });
  }
  renderSingleSelectProperty(container, property) {
    const wrap = container.createDiv({ cls: "nt-field-options" });
    for (const option2 of property.options || []) {
      const selected = getCell(this.row, property) === option2.id;
      const pill = wrap.createEl("button", {
        cls: `nt-option-chip nt-color-${option2.color}${selected ? " is-selected" : ""}`,
        attr: { type: "button" }
      });
      pill.createSpan({ cls: "nt-option-dot" });
      pill.createSpan({ text: option2.name });
      pill.addEventListener("click", () => {
        setCell(this.row, property, selected ? null : option2.id);
        this.options.onMutate();
        this.refreshProperties();
      });
    }
    if (!property.options?.length) {
      container.createSpan({ cls: "nt-muted", text: "\u5728\u8868\u683C\u4E2D\u70B9\u51FB\u5355\u5143\u683C\u5373\u53EF\u521B\u5EFA\u9009\u9879" });
    }
  }
  renderMultiSelectProperty(container, property) {
    const wrap = container.createDiv({ cls: "nt-field-options" });
    const selectedIds = Array.isArray(getCell(this.row, property)) ? getCell(this.row, property) : [];
    for (const option2 of property.options || []) {
      const selected = selectedIds.includes(option2.id);
      const pill = wrap.createEl("button", {
        cls: `nt-option-chip nt-color-${option2.color}${selected ? " is-selected" : ""}`,
        attr: { type: "button" }
      });
      pill.createSpan({ cls: "nt-option-dot" });
      pill.createSpan({ text: option2.name });
      pill.addEventListener("click", () => {
        const now = Array.isArray(getCell(this.row, property)) ? [...getCell(this.row, property)] : [];
        const index = now.indexOf(option2.id);
        if (index >= 0) now.splice(index, 1);
        else now.push(option2.id);
        setCell(this.row, property, now);
        this.options.onMutate();
        this.refreshProperties();
      });
    }
    if (!property.options?.length) {
      container.createSpan({ cls: "nt-muted", text: "\u5728\u8868\u683C\u4E2D\u70B9\u51FB\u5355\u5143\u683C\u5373\u53EF\u521B\u5EFA\u9009\u9879" });
    }
  }
  renderDateProperty(container, property) {
    const value = getCell(this.row, property) || null;
    const wrap = container.createDiv({ cls: "nt-date-range-fields" });
    const start = wrap.createEl("input", {
      cls: "nt-text-input nt-date-input",
      type: "date",
      value: value?.start ? value.start.slice(0, 10) : ""
    });
    const end = wrap.createEl("input", {
      cls: "nt-text-input nt-date-input",
      type: "date",
      value: value?.end ? value.end.slice(0, 10) : "",
      attr: { title: "\u7ED3\u675F\u65E5\u671F\uFF08\u53EF\u9009\uFF09" }
    });
    const update = () => {
      if (!start.value) {
        setCell(this.row, property, null);
      } else {
        const next = { start: start.value };
        if (end.value) next.end = end.value;
        setCell(this.row, property, next);
      }
      this.options.onMutate();
    };
    start.addEventListener("change", update);
    end.addEventListener("change", update);
    const clear2 = wrap.createEl("button", {
      cls: "nt-icon-button",
      attr: { type: "button", "aria-label": "\u6E05\u9664\u65E5\u671F" }
    });
    clear2.append(iconEl("x", "nt-icon"));
    clear2.addEventListener("click", () => {
      start.value = "";
      end.value = "";
      setCell(this.row, property, null);
      this.options.onMutate();
    });
    const today = wrap.createEl("button", {
      cls: "nt-button nt-button-quiet",
      text: "\u4ECA\u5929"
    });
    today.addEventListener("click", () => {
      start.value = toDateInput(/* @__PURE__ */ new Date());
      update();
    });
  }
  renderCheckboxProperty(container, property) {
    const checked = getCell(this.row, property) === true;
    const toggle = container.createEl("button", {
      cls: `nt-checkbox nt-row-page-checkbox${checked ? " is-checked" : ""}`,
      attr: {
        type: "button",
        role: "checkbox",
        "aria-checked": String(checked),
        "aria-label": property.name
      }
    });
    toggle.append(iconEl("check", "nt-check-icon"));
    toggle.createSpan({ text: checked ? "\u5DF2\u5B8C\u6210" : "\u672A\u5B8C\u6210" });
    toggle.addEventListener("click", () => {
      setCell(this.row, property, !checked);
      this.options.onMutate();
      this.refreshProperties();
    });
  }
  refreshProperties() {
    const scrollTop = this.contentEl.scrollTop;
    this.onOpen();
    this.contentEl.scrollTop = scrollTop;
  }
  propertyIcon(property) {
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
  autoGrow(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(180, Math.max(48, textarea.scrollHeight))}px`;
  }
  onClose() {
    this.contentEl.empty();
    this.options.onCloseRefresh();
  }
};

// src/view.ts
var EMOJI_CHOICES = [
  "\u{1F5C2}\uFE0F",
  "\u{1F680}",
  "\u{1F4CC}",
  "\u{1F4DA}",
  "\u{1F9ED}",
  "\u{1F3AF}",
  "\u{1F4A1}",
  "\u{1F9EA}",
  "\u{1F6E0}\uFE0F",
  "\u{1F4DD}",
  "\u{1F4CA}",
  "\u{1F5D3}\uFE0F",
  "\u2705",
  "\u{1F331}",
  "\u{1F525}",
  "\u2B50",
  "\u{1F9E9}",
  "\u{1F3A8}",
  "\u{1F4BC}",
  "\u{1F3E0}",
  "\u{1F340}",
  "\u2615",
  "\u{1F30A}",
  "\u{1FA90}"
];
var NotionTableView = class extends import_obsidian4.TextFileView {
  constructor(leaf, plugin) {
    super(leaf);
    this.db = null;
    this.loadError = "";
    this.lastSerialized = "";
    this.rootEl = null;
    this.tableHostEl = null;
    this.tableScrollEl = null;
    this.tableEl = null;
    this.tableCountEl = null;
    this.filterButton = null;
    this.sortButton = null;
    this.groupButton = null;
    this.propertyButton = null;
    this.titleInput = null;
    this.iconButton = null;
    this.activeEditor = null;
    this.currentRows = [];
    this.selectedRows = /* @__PURE__ */ new Set();
    this.searchTimer = null;
    this.saveTimer = null;
    this.dirty = false;
    this.propertiesPanelRefresh = null;
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE;
  }
  getDisplayText() {
    return this.db?.title || this.file?.basename || "One Database";
  }
  getIcon() {
    return "table-2";
  }
  canAcceptExtension(extension) {
    return extension === FILE_EXTENSION;
  }
  async onOpen() {
    await super.onOpen();
    this.contentEl.addClass("nt-view");
    this.contentEl.empty();
    this.renderLoading();
  }
  async onClose() {
    closeActivePopover();
    if (this.searchTimer !== null) window.clearTimeout(this.searchTimer);
    await this.flushToDisk();
    await super.onClose();
  }
  async onUnloadFile(file) {
    await this.flushToDisk();
    await super.onUnloadFile(file);
  }
  async save(clear2) {
    await super.save(clear2);
    this.dirty = false;
  }
  async flushToDisk() {
    if (!this.db || !this.file || !this.dirty) return;
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    const serialized = serializeDatabase(this.db);
    this.data = serialized;
    this.lastSerialized = serialized;
    try {
      await this.app.vault.modify(this.file, serialized);
      this.dirty = false;
    } catch (error) {
      console.error("One Database: could not flush database to disk", error);
    }
  }
  clear() {
    this.db = null;
    this.loadError = "";
    this.data = "";
    this.lastSerialized = "";
    this.dirty = false;
    this.selectedRows.clear();
    this.currentRows = [];
  }
  setViewData(data, _clear) {
    this.data = data;
    this.lastSerialized = data;
    this.dirty = false;
    try {
      this.db = parseDatabaseJson(data);
      this.loadError = "";
      this.renderAll();
    } catch (error) {
      console.error("One Database: could not parse database", error);
      this.db = null;
      this.loadError = error instanceof Error ? error.message : String(error);
      this.renderError();
    }
  }
  getViewData() {
    if (!this.db) return this.data || "";
    const serialized = serializeDatabase(this.db);
    this.lastSerialized = serialized;
    this.data = serialized;
    return serialized;
  }
  get activeView() {
    return this.db ? activeView(this.db) : null;
  }
  persist() {
    if (!this.db) return;
    this.dirty = true;
    touchDatabase(this.db);
    this.data = serializeDatabase(this.db);
    this.lastSerialized = this.data;
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      this.requestSave();
    }, 250);
    this.refreshTabTitle();
  }
  persistNow() {
    if (!this.db) return;
    this.dirty = true;
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.data = serializeDatabase(this.db);
    this.lastSerialized = this.data;
    this.requestSave();
    this.refreshTabTitle();
  }
  refreshTabTitle() {
    try {
      this.leaf.updateHeader?.();
    } catch {
    }
  }
  renderLoading() {
    const root = h("div", "nt-page nt-loading-page");
    const loading = root.createDiv({ cls: "nt-loading" });
    loading.createDiv({ cls: "nt-loading-spinner" });
    loading.createDiv({ cls: "nt-loading-text", text: "\u6B63\u5728\u6253\u5F00\u6570\u636E\u5E93\u2026" });
    this.contentEl.append(root);
    this.rootEl = root;
  }
  renderError() {
    closeActivePopover();
    this.contentEl.empty();
    this.contentEl.addClass("nt-view");
    const page = h("div", "nt-page nt-error-page");
    this.contentEl.append(page);
    const panel = page.createDiv({ cls: "nt-error-panel" });
    const icon = panel.createDiv({ cls: "nt-error-icon" });
    icon.append(iconEl("triangle-alert", "nt-icon"));
    panel.createEl("h2", { text: "\u65E0\u6CD5\u8BFB\u53D6\u8FD9\u4E2A\u6570\u636E\u5E93" });
    panel.createEl("p", {
      cls: "nt-error-message",
      text: this.loadError || "\u6587\u4EF6\u5185\u5BB9\u4E0D\u662F\u6709\u6548\u7684 One Database \u6570\u636E\u3002"
    });
    panel.createEl("p", {
      cls: "nt-muted",
      text: "\u4F60\u53EF\u4EE5\u4FEE\u6B63\u4E0B\u65B9\u5185\u5BB9\u540E\u91CD\u8BD5\u3002\u6570\u636E\u5E93\u6587\u4EF6\u662F\u7EAF\u6587\u672C JSON\uFF0C\u5EFA\u8BAE\u5148\u5907\u4EFD\u3002"
    });
    const textarea = panel.createEl("textarea", {
      cls: "nt-error-source",
      attr: { spellcheck: "false", "aria-label": "\u6570\u636E\u5E93\u6E90\u6587\u4EF6" }
    });
    textarea.value = this.data || "";
    const actions = panel.createDiv({ cls: "nt-error-actions" });
    const retry = actions.createEl("button", {
      cls: "nt-button nt-button-primary",
      text: "\u4FDD\u5B58\u5E76\u91CD\u8BD5"
    });
    retry.addEventListener("click", () => {
      try {
        const parsed = parseDatabaseJson(textarea.value);
        this.db = parsed;
        this.loadError = "";
        this.data = serializeDatabase(parsed);
        this.lastSerialized = this.data;
        this.requestSave();
        this.renderAll();
        notify("\u6570\u636E\u5E93\u5DF2\u4FEE\u590D\u5E76\u91CD\u65B0\u52A0\u8F7D");
      } catch (error) {
        this.loadError = error instanceof Error ? error.message : String(error);
        this.renderError();
      }
    });
    const reload = actions.createEl("button", {
      cls: "nt-button",
      text: "\u4ECE\u6587\u4EF6\u91CD\u65B0\u52A0\u8F7D"
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
      text: "\u4F7F\u7528\u5E2E\u52A9"
    });
    help.addEventListener("click", () => new HelpModal(this.app).open());
    this.rootEl = page;
  }
  renderAll() {
    closeActivePopover();
    this.closeEditor(false);
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
    const tableArea = h("div", "nt-table-area");
    page.append(tableArea);
    this.tableHostEl = tableArea;
    this.renderTable();
  }
  renderPageHeader(page) {
    const db = this.db;
    const headerWrap = page.createDiv({ cls: "nt-page-header-wrap" });
    const header = headerWrap.createDiv({ cls: "nt-page-header" });
    const topLine = header.createDiv({ cls: "nt-page-topline" });
    const typeLabel = topLine.createDiv({ cls: "nt-database-label" });
    typeLabel.append(iconEl("database", "nt-database-icon"));
    typeLabel.createSpan({ text: "\u8868\u683C\u6570\u636E\u5E93" });
    const actions = topLine.createDiv({ cls: "nt-page-actions" });
    const newButton = actions.createEl("button", {
      cls: "nt-new-button",
      attr: { type: "button", "aria-label": "\u65B0\u5EFA\u4E00\u884C" }
    });
    newButton.append(iconEl("plus", "nt-button-icon"));
    newButton.createSpan({ text: "\u65B0\u5EFA" });
    newButton.addEventListener("click", () => this.addRowAndFocus());
    const helpButton = actions.createEl("button", {
      cls: "nt-icon-button",
      attr: { type: "button", "aria-label": "\u4F7F\u7528\u5E2E\u52A9", title: "\u4F7F\u7528\u5E2E\u52A9" }
    });
    helpButton.append(iconEl("circle-help", "nt-icon"));
    helpButton.addEventListener("click", () => new HelpModal(this.app).open());
    const moreButton = actions.createEl("button", {
      cls: "nt-icon-button",
      attr: { type: "button", "aria-label": "\u66F4\u591A\u9009\u9879", title: "\u66F4\u591A\u9009\u9879" }
    });
    moreButton.append(iconEl("more-horizontal", "nt-icon"));
    moreButton.addEventListener("click", () => this.openPageMenu(moreButton));
    const titleRow = header.createDiv({ cls: "nt-title-row" });
    this.iconButton = titleRow.createEl("button", {
      cls: "nt-db-icon-button",
      attr: { type: "button", "aria-label": "\u66F4\u6539\u56FE\u6807", title: "\u66F4\u6539\u56FE\u6807" }
    });
    this.iconButton.setText(db.icon || "\u{1F5C2}\uFE0F");
    this.iconButton.addEventListener("click", () => this.openEmojiPicker(this.iconButton));
    this.titleInput = titleRow.createEl("textarea", {
      cls: "nt-title-input",
      attr: {
        rows: "1",
        placeholder: "\u672A\u547D\u540D\u6570\u636E\u5E93",
        spellcheck: "false",
        "aria-label": "\u6570\u636E\u5E93\u6807\u9898"
      }
    });
    this.titleInput.value = db.title;
    this.autoGrowTitle(this.titleInput);
    this.titleInput.addEventListener("input", () => {
      if (!this.db) return;
      this.db.title = this.titleInput.value;
      this.autoGrowTitle(this.titleInput);
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
        placeholder: "\u6DFB\u52A0\u63CF\u8FF0\u2026",
        "aria-label": "\u6570\u636E\u5E93\u63CF\u8FF0"
      }
    });
    description.value = db.description;
    description.addEventListener("input", () => {
      if (!this.db) return;
      this.db.description = description.value;
      this.persist();
    });
  }
  autoGrowTitle(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(150, Math.max(46, textarea.scrollHeight))}px`;
  }
  renderTabs(page) {
    const db = this.db;
    const tabsWrap = page.createDiv({ cls: "nt-tabs-wrap" });
    const tabs = tabsWrap.createDiv({ cls: "nt-view-tabs" });
    for (const view of db.views) {
      const active = view.id === db.activeViewId;
      const tab = tabs.createEl("button", {
        cls: `nt-view-tab${active ? " is-active" : ""}`,
        attr: { type: "button", "aria-pressed": String(active) }
      });
      tab.append(iconEl("table-2", "nt-view-tab-icon"));
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
      attr: { type: "button", "aria-label": "\u65B0\u5EFA\u89C6\u56FE", title: "\u65B0\u5EFA\u89C6\u56FE" }
    });
    addTab.append(iconEl("plus", "nt-icon"));
    addTab.addEventListener("click", () => this.openAddViewMenu(addTab));
  }
  switchView(viewId) {
    if (!this.db || viewId === this.db.activeViewId) return;
    this.db.activeViewId = viewId;
    this.selectedRows.clear();
    this.persist();
    this.renderAll();
  }
  renderToolbar(page) {
    const view = this.activeView;
    const toolbarWrap = page.createDiv({ cls: "nt-toolbar-wrap" });
    const toolbar = toolbarWrap.createDiv({ cls: "nt-toolbar" });
    const left = toolbar.createDiv({ cls: "nt-toolbar-left" });
    this.filterButton = this.createToolbarButton(left, "list-filter", "\u7B5B\u9009");
    this.filterButton.toggleClass("is-active", view.filters.length > 0);
    this.updateBadge(this.filterButton, view.filters.length);
    this.filterButton.addEventListener("click", () => this.openFilterPanel(this.filterButton));
    this.sortButton = this.createToolbarButton(left, "arrow-up-down", "\u6392\u5E8F");
    this.sortButton.toggleClass("is-active", view.sorts.length > 0);
    this.updateBadge(this.sortButton, view.sorts.length);
    this.sortButton.addEventListener("click", () => this.openSortPanel(this.sortButton));
    this.groupButton = this.createToolbarButton(left, "layers", "\u5206\u7EC4");
    this.groupButton.toggleClass("is-active", Boolean(view.groupBy));
    this.groupButton.addEventListener("click", () => this.openGroupPanel(this.groupButton));
    const right = toolbar.createDiv({ cls: "nt-toolbar-right" });
    const search = right.createDiv({ cls: "nt-search-box" });
    search.append(iconEl("search", "nt-search-icon"));
    const searchInput = search.createEl("input", {
      cls: "nt-search-input",
      type: "search",
      value: view.search,
      attr: { placeholder: "\u641C\u7D22\u2026", "aria-label": "\u641C\u7D22\u8BB0\u5F55" }
    });
    const clearSearch = search.createEl("button", {
      cls: `nt-search-clear${view.search ? "" : " is-hidden"}`,
      attr: { type: "button", "aria-label": "\u6E05\u9664\u641C\u7D22" }
    });
    clearSearch.append(iconEl("x", "nt-icon"));
    clearSearch.addEventListener("click", () => {
      searchInput.value = "";
      view.search = "";
      clearSearch.toggleClass("is-hidden", true);
      this.persist();
      this.renderTable();
    });
    searchInput.addEventListener("input", () => {
      view.search = searchInput.value;
      clearSearch.toggleClass("is-hidden", !view.search);
      this.persist();
      if (this.searchTimer !== null) window.clearTimeout(this.searchTimer);
      this.searchTimer = window.setTimeout(() => {
        this.searchTimer = null;
        this.renderTablePreserveScroll();
      }, 120);
    });
    const count = right.createDiv({ cls: "nt-toolbar-count" });
    this.tableCountEl = count;
    this.propertyButton = this.createToolbarButton(right, "sliders-horizontal", "\u5C5E\u6027");
    this.propertyButton.addEventListener("click", () => this.openPropertiesPanel(this.propertyButton));
    const moreButton = right.createEl("button", {
      cls: "nt-icon-button",
      attr: { type: "button", "aria-label": "\u89C6\u56FE\u9009\u9879", title: "\u89C6\u56FE\u9009\u9879" }
    });
    moreButton.append(iconEl("more-horizontal", "nt-icon"));
    moreButton.addEventListener("click", () => this.openViewOptionsMenu(moreButton));
  }
  createToolbarButton(parent, icon, label) {
    const button = buttonEl(icon, label, "nt-toolbar-button");
    parent.append(button);
    return button;
  }
  updateBadge(button, count) {
    button.querySelector(".nt-toolbar-badge")?.remove();
    if (count <= 0) return;
    const badge = h("span", "nt-toolbar-badge", String(count));
    button.append(badge);
  }
  renderTablePreserveScroll() {
    const top = this.tableScrollEl?.scrollTop ?? 0;
    const left = this.tableScrollEl?.scrollLeft ?? 0;
    this.renderTable();
    window.requestAnimationFrame(() => {
      if (this.tableScrollEl) {
        this.tableScrollEl.scrollTop = top;
        this.tableScrollEl.scrollLeft = left;
      }
    });
  }
  renderTable() {
    if (!this.db || !this.tableHostEl) return;
    const db = this.db;
    const view = this.activeView;
    const rows = filteredRows(db, view);
    this.currentRows = rows;
    for (const id of Array.from(this.selectedRows)) {
      if (!db.rows.some((row) => row.id === id)) this.selectedRows.delete(id);
    }
    const properties = visibleProperties(db, view);
    const tableHost = this.tableHostEl;
    tableHost.empty();
    tableHost.toggleClass("is-grouped", Boolean(view.groupBy));
    if (this.selectedRows.size > 0) this.renderBulkBar(tableHost);
    const scroll = tableHost.createDiv({ cls: "nt-table-scroll" });
    this.tableScrollEl = scroll;
    const table = scroll.createEl("table", {
      cls: `nt-table${view.wrapText ? " is-wrapped" : ""}`
    });
    this.tableEl = table;
    const gutterWidth = 56;
    const addColumnWidth = 44;
    const totalWidth = gutterWidth + addColumnWidth + properties.reduce((sum, property) => sum + (property.width || 170), 0);
    table.style.width = `${Math.max(680, totalWidth)}px`;
    const colgroup = table.createEl("colgroup");
    colgroup.createEl("col", { attr: { style: `width:${gutterWidth}px` } });
    for (const property of properties) {
      colgroup.createEl("col", {
        attr: { style: `width:${property.width || 170}px` }
      });
    }
    colgroup.createEl("col", { attr: { style: `width:${addColumnWidth}px` } });
    this.renderTableHead(table, properties, rows);
    const tbody = table.createEl("tbody");
    const groups = view.groupBy ? groupRows(db, view, rows) : null;
    if (groups && groups.length > 0) {
      for (const group of groups) {
        const collapsed = view.collapsedGroups.includes(group.key);
        const groupRow = tbody.createEl("tr", { cls: "nt-group-row" });
        const groupCell = groupRow.createEl("td", {
          attr: { colspan: String(properties.length + 2) }
        });
        const groupButton = groupCell.createDiv({ cls: "nt-group-header" });
        groupButton.append(
          iconEl(collapsed ? "chevron-right" : "chevron-down", "nt-group-chevron")
        );
        const pill = groupButton.createSpan({
          cls: `nt-pill ${group.color ? `nt-color-${group.color}` : "nt-color-default"}`
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
        if (!collapsed) {
          for (const row of group.rows) this.appendDataRow(tbody, row, properties);
        }
      }
    } else {
      for (const row of rows) this.appendDataRow(tbody, row, properties);
    }
    if (rows.length === 0) this.appendEmptyState(tbody, properties.length + 2);
    if (rows.length > 0) {
      const addRow = tbody.createEl("tr", { cls: "nt-add-row-row" });
      const cell = addRow.createEl("td", {
        attr: { colspan: String(properties.length + 2) }
      });
      const addButton = cell.createEl("button", {
        cls: "nt-add-row-button",
        attr: { type: "button" }
      });
      addButton.append(iconEl("plus", "nt-add-row-icon"));
      addButton.createSpan({ text: "\u65B0\u5EFA\u4E00\u884C" });
      addButton.addEventListener("click", () => this.addRowAndFocus());
    }
    if (view.showCalculations) this.renderCalculationFooter(table, properties, rows);
    this.updateTableCount(rows.length);
  }
  renderBulkBar(parent) {
    const bar = parent.createDiv({ cls: "nt-bulk-bar" });
    bar.createSpan({
      cls: "nt-bulk-count",
      text: `\u5DF2\u9009\u62E9 ${this.selectedRows.size} \u9879`
    });
    const actions = bar.createDiv({ cls: "nt-bulk-actions" });
    const remove = actions.createEl("button", {
      cls: "nt-button nt-button-danger",
      text: "\u5220\u9664"
    });
    remove.addEventListener("click", () => void this.deleteSelectedRows());
    const cancel = actions.createEl("button", {
      cls: "nt-button nt-button-quiet",
      text: "\u53D6\u6D88\u9009\u62E9"
    });
    cancel.addEventListener("click", () => {
      this.selectedRows.clear();
      this.renderTablePreserveScroll();
    });
  }
  renderTableHead(table, properties, rows) {
    const thead = table.createEl("thead");
    const tr = thead.createEl("tr");
    const gutter = tr.createEl("th", { cls: "nt-gutter-cell" });
    const selectAll = gutter.createEl("input", {
      cls: "nt-checkbox-input",
      type: "checkbox",
      attr: { "aria-label": "\u9009\u62E9\u5168\u90E8\u8BB0\u5F55" }
    });
    const selectedVisible = rows.filter((row) => this.selectedRows.has(row.id)).length;
    selectAll.checked = rows.length > 0 && selectedVisible === rows.length;
    selectAll.indeterminate = selectedVisible > 0 && selectedVisible < rows.length;
    selectAll.addEventListener("change", () => {
      if (selectAll.checked) {
        for (const row of rows) this.selectedRows.add(row.id);
      } else {
        for (const row of rows) this.selectedRows.delete(row.id);
      }
      this.renderTablePreserveScroll();
    });
    const view = this.activeView;
    for (const property of properties) {
      const th = tr.createEl("th", {
        cls: `nt-th nt-th-${property.type}`,
        attr: {
          "data-property-id": property.id,
          "aria-label": property.name
        }
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
            "nt-th-indicator is-sort"
          )
        );
      }
      inner.append(iconEl("chevron-down", "nt-th-chevron"));
      th.addEventListener("click", (event) => {
        if (event.target.closest(".nt-column-resize")) return;
        this.openPropertyMenu(th, property);
      });
      const resize = th.createDiv({
        cls: "nt-column-resize",
        attr: { "aria-hidden": "true" }
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
      attr: { type: "button", "aria-label": "\u65B0\u5EFA\u5C5E\u6027", title: "\u65B0\u5EFA\u5C5E\u6027" }
    });
    addButton.append(iconEl("plus", "nt-icon"));
    addButton.addEventListener("click", () => void this.createProperty());
  }
  renderCalculationFooter(table, properties, rows) {
    const db = this.db;
    const view = this.activeView;
    const tfoot = table.createEl("tfoot");
    const tr = tfoot.createEl("tr");
    const prefix = tr.createEl("td", { cls: "nt-calculation-prefix" });
    prefix.append(iconEl("sigma", "nt-calc-icon"));
    prefix.createSpan({ text: "\u8BA1\u7B97" });
    for (const property of properties) {
      const cell = tr.createEl("td", { cls: "nt-calculation-cell" });
      const configured = view.calculations[property.id] || "none";
      const value = calculate(db, property, rows, configured);
      const button = cell.createEl("button", {
        cls: `nt-calculation-button${configured !== "none" ? " is-active" : ""}`,
        attr: {
          type: "button",
          "aria-label": `${property.name} \u7684\u8BA1\u7B97`,
          title: configured === "none" ? "\u6DFB\u52A0\u8BA1\u7B97" : calculationLabel(configured)
        }
      });
      if (configured === "none") {
        button.append(iconEl("sigma", "nt-calc-placeholder-icon"));
        button.createSpan({ cls: "nt-calc-placeholder", text: "\u8BA1\u7B97" });
      } else {
        button.createSpan({ cls: "nt-calc-label", text: calculationLabel(configured) });
        button.createSpan({ cls: "nt-calc-value", text: value || "\u2014" });
      }
      button.addEventListener("click", () => this.openCalculationMenu(button, property));
    }
    tr.createEl("td", { cls: "nt-calculation-cell" });
  }
  appendDataRow(tbody, row, properties) {
    const tr = tbody.createEl("tr", {
      cls: `nt-data-row${this.selectedRows.has(row.id) ? " is-selected" : ""}`,
      attr: { "data-row-id": row.id }
    });
    tr.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      const anchor = event.target.closest("td") || tr.querySelector(".nt-cell");
      if (anchor) this.openRowMenu(anchor, row);
    });
    const gutter = tr.createEl("td", { cls: "nt-row-gutter" });
    const checkbox = gutter.createEl("input", {
      cls: "nt-checkbox-input",
      type: "checkbox",
      attr: { "aria-label": "\u9009\u62E9\u8BB0\u5F55" }
    });
    checkbox.checked = this.selectedRows.has(row.id);
    checkbox.addEventListener("click", (event) => event.stopPropagation());
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) this.selectedRows.add(row.id);
      else this.selectedRows.delete(row.id);
      this.renderTablePreserveScroll();
    });
    for (const property of properties) {
      const td = tr.createEl("td", {
        cls: `nt-cell nt-cell-${property.type}`,
        attr: {
          "data-row-id": row.id,
          "data-property-id": property.id,
          tabindex: "0"
        }
      });
      td.style.width = `${property.width || 170}px`;
      this.renderCellContent(td, row, property);
      if (!isReadOnlyProperty(property)) {
        td.addEventListener("click", (event) => {
          const target = event.target;
          if (target.closest("button, a, input, .nt-checkbox")) return;
          if (td.classList.contains("is-editing")) return;
          this.activateCell(td, row, property);
        });
        td.addEventListener("keydown", (event) => {
          if (event.target !== td) return;
          if (event.key === "Enter" || event.key === "F2") {
            event.preventDefault();
            this.activateCell(td, row, property);
          }
          if (event.key === " " && property.type === "checkbox") {
            event.preventDefault();
            this.toggleCellCheckbox(row, property);
          }
        });
      }
    }
    tr.createEl("td", { cls: "nt-add-column nt-add-column-cell" });
  }
  appendEmptyState(tbody, colspan) {
    const view = this.activeView;
    const row = tbody.createEl("tr", { cls: "nt-empty-row" });
    const cell = row.createEl("td", { attr: { colspan: String(colspan) } });
    const empty = cell.createDiv({ cls: "nt-empty-state" });
    const icon = empty.createDiv({ cls: "nt-empty-icon" });
    icon.append(iconEl("table-2", "nt-icon"));
    const hasFilter = view.filters.length > 0 || Boolean(view.search.trim());
    empty.createEl("strong", {
      text: hasFilter ? "\u6CA1\u6709\u5339\u914D\u7684\u8BB0\u5F55" : "\u8FD9\u5F20\u8868\u8FD8\u662F\u7A7A\u7684"
    });
    empty.createEl("p", {
      text: hasFilter ? "\u8BD5\u8BD5\u8C03\u6574\u7B5B\u9009\u6216\u641C\u7D22\u6761\u4EF6\uFF0C\u4E5F\u53EF\u4EE5\u76F4\u63A5\u6DFB\u52A0\u4E00\u6761\u65B0\u8BB0\u5F55\u3002" : "\u6DFB\u52A0\u7B2C\u4E00\u6761\u8BB0\u5F55\uFF0C\u5F00\u59CB\u7BA1\u7406\u4F60\u7684\u6570\u636E\u3002"
    });
    const actions = empty.createDiv({ cls: "nt-empty-actions" });
    if (hasFilter) {
      const clearButton = actions.createEl("button", {
        cls: "nt-button",
        text: "\u6E05\u9664\u7B5B\u9009"
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
      text: "\u65B0\u5EFA\u8BB0\u5F55"
    });
    addButton.addEventListener("click", () => this.addRowAndFocus());
  }
  updateTableCount(visibleCount) {
    if (!this.tableCountEl || !this.db || !this.activeView) return;
    const total = this.db.rows.length;
    this.tableCountEl.setText(
      visibleCount === total ? `${total} \u6761\u8BB0\u5F55` : `${visibleCount} / ${total} \u6761\u8BB0\u5F55`
    );
  }
  propertyIcon(property) {
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
  renderCellContent(td, row, property) {
    clear(td);
    td.removeClass("is-editing");
    const value = getCell(row, property);
    if (property.type === "title") {
      this.renderTitleCell(td, row, property, value);
      return;
    }
    if (property.type === "checkbox") {
      const checked = value === true;
      const box = h(
        "span",
        `nt-checkbox nt-cell-checkbox${checked ? " is-checked" : ""}`
      );
      box.append(iconEl("check", "nt-check-icon"));
      td.append(box);
      return;
    }
    if (isCellEmpty(value)) {
      td.append(h("span", "nt-empty-value"));
      return;
    }
    switch (property.type) {
      case "number": {
        td.append(h("span", "nt-number-value", formatNumber(value, property)));
        break;
      }
      case "select":
      case "status": {
        const option2 = optionById(property, value);
        if (!option2) {
          td.append(h("span", "nt-empty-value"));
          break;
        }
        const pill = h("span", `nt-pill ${colorClass(option2.color)}`);
        if (property.type === "status") pill.append(h("span", "nt-option-dot"));
        pill.append(h("span", "nt-pill-text", option2.name));
        td.append(pill);
        break;
      }
      case "multi_select": {
        const ids = Array.isArray(value) ? value : [];
        const wrap = h("div", "nt-tag-list");
        for (const id of ids) {
          const option2 = optionById(property, id);
          if (!option2) continue;
          wrap.append(h("span", `nt-tag ${colorClass(option2.color)}`, option2.name));
        }
        if (wrap.childElementCount === 0) wrap.append(h("span", "nt-empty-value"));
        td.append(wrap);
        break;
      }
      case "date": {
        const dateValue = value;
        const span = h(
          "span",
          `nt-date-value${isDateOverdue(dateValue, this.isRowDone(row)) ? " is-overdue" : ""}`
        );
        span.append(iconEl("calendar", "nt-cell-inline-icon"));
        span.append(h("span", "", formatDateValue(dateValue)));
        td.append(span);
        break;
      }
      case "url": {
        const url = String(value);
        const link = h("a", "nt-link-value");
        link.href = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(url) ? url : `https://${url}`;
        link.target = "_blank";
        link.rel = "noopener";
        link.append(iconEl("link", "nt-cell-inline-icon"));
        link.append(h("span", "", url.replace(/^https?:\/\//, "")));
        link.addEventListener("click", (event) => event.stopPropagation());
        td.append(link);
        break;
      }
      case "email": {
        const link = h("a", "nt-link-value");
        link.href = `mailto:${String(value)}`;
        link.append(iconEl("mail", "nt-cell-inline-icon"));
        link.append(h("span", "", String(value)));
        link.addEventListener("click", (event) => event.stopPropagation());
        td.append(link);
        break;
      }
      case "created_time":
      case "last_edited_time": {
        const span = h("span", "nt-readonly-value");
        span.append(
          iconEl(
            property.type === "created_time" ? "clock" : "history",
            "nt-cell-inline-icon"
          )
        );
        span.append(h("span", "", formatTimestamp(Number(value), true)));
        td.append(span);
        break;
      }
      default:
        td.append(h("span", "nt-text-value", String(value ?? "")));
    }
  }
  renderTitleCell(td, row, property, value) {
    const text = String(value ?? "");
    const wrap = h("div", "nt-title-cell");
    const emoji = h("span", "nt-row-emoji", row.icon || "");
    if (row.icon) wrap.append(emoji);
    const title = h(
      "span",
      `nt-cell-text${text ? "" : " is-placeholder"}`,
      text || "\u672A\u547D\u540D"
    );
    wrap.append(title);
    const actions = h("div", "nt-title-actions");
    const open = h("button", "nt-row-action");
    open.type = "button";
    open.title = "\u6253\u5F00\u8BB0\u5F55\u9875\u9762";
    open.setAttribute("aria-label", "\u6253\u5F00\u8BB0\u5F55\u9875\u9762");
    open.append(iconEl("maximize-2", "nt-icon"));
    open.addEventListener("click", (event) => {
      event.stopPropagation();
      this.openRowPage(row);
    });
    const menu = h("button", "nt-row-action");
    menu.type = "button";
    menu.title = "\u8BB0\u5F55\u9009\u9879";
    menu.setAttribute("aria-label", "\u8BB0\u5F55\u9009\u9879");
    menu.append(iconEl("more-horizontal", "nt-icon"));
    menu.addEventListener("click", (event) => {
      event.stopPropagation();
      this.openRowMenu(menu, row);
    });
    actions.append(open, menu);
    wrap.append(actions);
    if (row.icon) {
      emoji.addEventListener("click", (event) => {
        event.stopPropagation();
        this.openRowPage(row);
      });
    }
    td.append(wrap);
    td.addClass("nt-title-td");
    void property;
  }
  isRowDone(row) {
    if (!this.db) return false;
    const checkboxes = this.db.properties.filter(
      (property) => property.type === "checkbox" && /完成|done|complete|finish/i.test(property.name)
    );
    for (const property of checkboxes) {
      if (getCell(row, property) === true) return true;
    }
    const status = this.db.properties.find((property) => property.type === "status");
    if (status) {
      const name = optionById(status, getCell(row, status))?.name || "";
      return /已完成|完成|done|complete/i.test(name);
    }
    return false;
  }
  toggleCellCheckbox(row, property) {
    if (!this.db) return;
    setCell(row, property, getCell(row, property) !== true);
    this.persist();
    this.renderTablePreserveScroll();
  }
  activateCell(td, row, property) {
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
  beginTextEdit(td, row, property) {
    if (this.activeEditor) this.closeEditor(true);
    closeActivePopover();
    const initial = String(getCell(row, property) ?? "");
    clear(td);
    td.addClass("is-editing");
    const input = td.createEl("input", {
      cls: "nt-cell-input",
      type: property.type === "email" ? "email" : "text",
      value: initial,
      attr: {
        placeholder: property.type === "title" ? "\u672A\u547D\u540D" : "",
        "aria-label": property.name
      }
    });
    if (property.type === "number") input.inputMode = "decimal";
    const editor = {
      td,
      row,
      property,
      input,
      original: initial,
      done: false
    };
    this.activeEditor = editor;
    const finish = () => {
      if (editor.done) return;
      editor.done = true;
      this.activeEditor = null;
      const raw = input.value;
      let value = raw.trim() === "" ? null : raw.trim();
      if (property.type === "number" && value !== null) {
        const numeric = Number(String(value).replace(/,/g, ""));
        if (!Number.isFinite(numeric)) {
          notify("\u8BF7\u8F93\u5165\u6709\u6548\u6570\u5B57");
          td.empty();
          td.removeClass("is-editing");
          this.renderCellContent(td, row, property);
          return;
        }
        value = numeric;
      }
      if (property.type === "title") value = raw.trim();
      if (String(getCell(row, property) ?? "") !== String(value ?? "")) {
        setCell(row, property, value);
        this.persist();
      }
      this.renderTablePreserveScroll();
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
  closeEditor(commit) {
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
  startColumnResize(event, th, property) {
    if (!this.db) return;
    const startX = event.clientX;
    const startWidth = property.width || 170;
    const table = this.tableEl;
    const startTableWidth = table?.getBoundingClientRect().width || 0;
    th.addClass("is-resizing");
    document.body.addClass("nt-resizing-column");
    const move = (moveEvent) => {
      const width = Math.max(80, Math.min(600, startWidth + (moveEvent.clientX - startX)));
      property.width = Math.round(width);
      th.style.width = `${property.width}px`;
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
      this.renderTablePreserveScroll();
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  }
  findCell(rowId, propertyId) {
    if (!this.tableEl) return null;
    const cells = Array.from(this.tableEl.querySelectorAll("td.nt-cell"));
    return cells.find(
      (cell) => cell.dataset.rowId === rowId && cell.dataset.propertyId === propertyId
    ) || null;
  }
  addRowAndFocus() {
    if (!this.db) return;
    const row = createRow(this.db);
    this.db.rows.push(row);
    this.persist();
    this.renderTablePreserveScroll();
    window.requestAnimationFrame(() => {
      const title = titleProperty(this.db);
      const cell = this.findCell(row.id, title.id);
      if (cell) {
        cell.scrollIntoView({ block: "nearest", inline: "nearest" });
        this.beginTextEdit(cell, row, title);
      } else {
        notify("\u65B0\u8BB0\u5F55\u5DF2\u88AB\u5F53\u524D\u7B5B\u9009\u6761\u4EF6\u9690\u85CF");
      }
    });
  }
  async deleteSelectedRows() {
    if (!this.db || this.selectedRows.size === 0) return;
    const confirmed = await confirmAction(
      this.app,
      "\u5220\u9664\u8BB0\u5F55",
      `\u786E\u5B9A\u8981\u5220\u9664\u9009\u4E2D\u7684 ${this.selectedRows.size} \u6761\u8BB0\u5F55\u5417\uFF1F\u6B64\u64CD\u4F5C\u65E0\u6CD5\u64A4\u9500\u3002`,
      { confirmLabel: "\u5220\u9664\u8BB0\u5F55" }
    );
    if (!confirmed) return;
    const ids = new Set(this.selectedRows);
    this.db.rows = this.db.rows.filter((row) => !ids.has(row.id));
    this.selectedRows.clear();
    this.persist();
    this.renderTablePreserveScroll();
    this.updateTableCount(filteredRows(this.db, this.activeView).length);
  }
  exportCsv() {
    if (!this.db || !this.activeView) return;
    const view = this.activeView;
    const rows = filteredRows(this.db, view);
    const content = csvForView(this.db, view, rows);
    const filename = sanitizeFilename(`${this.db.title} - ${view.name}`) + ".csv";
    downloadTextFile(filename, content, "text/csv");
    notify(`\u5DF2\u5BFC\u51FA ${rows.length} \u6761\u8BB0\u5F55`);
  }
  openRowPage(row) {
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
        this.renderTablePreserveScroll();
      }
    });
    modal.open();
  }
  menuItem(parent, icon, label, action, options = {}) {
    const item = parent.createEl("button", {
      cls: `nt-menu-item${options.danger ? " is-danger" : ""}${options.disabled ? " is-disabled" : ""}`,
      attr: { type: "button" }
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
  openPageMenu(anchor) {
    if (!this.db) return;
    openPopover(anchor, "nt-menu-popover", (content, popover) => {
      content.createDiv({ cls: "nt-menu-heading", text: this.db.title });
      this.menuItem(content, "circle-help", "\u4F7F\u7528\u5E2E\u52A9", () => {
        popover.close();
        new HelpModal(this.app).open();
      });
      this.menuItem(content, "download", "\u5BFC\u51FA\u5F53\u524D\u89C6\u56FE\u4E3A CSV", () => {
        popover.close();
        this.exportCsv();
      });
      this.menuItem(content, "copy", "\u590D\u5236\u89C6\u56FE\u6807\u7B7E", () => {
        try {
          void navigator.clipboard?.writeText(`${this.db.title} / ${this.activeView.name}`).catch(() => void 0);
        } catch {
        }
        popover.close();
        notify("\u89C6\u56FE\u540D\u79F0\u5DF2\u590D\u5236");
      });
      content.createDiv({ cls: "nt-menu-divider" });
      this.menuItem(
        content,
        "trash-2",
        "\u5220\u9664\u6570\u636E\u5E93",
        () => {
          popover.close();
          void this.deleteDatabase();
        },
        { danger: true }
      );
    });
  }
  openViewOptionsMenu(anchor) {
    if (!this.db) return;
    const view = this.activeView;
    openPopover(anchor, "nt-menu-popover", (content, popover) => {
      content.createDiv({ cls: "nt-menu-heading", text: "\u89C6\u56FE\u9009\u9879" });
      this.menuItem(
        content,
        "sigma",
        "\u663E\u793A\u8BA1\u7B97",
        () => {
          view.showCalculations = !view.showCalculations;
          this.persist();
          popover.close();
          this.renderTablePreserveScroll();
        },
        { checked: view.showCalculations }
      );
      this.menuItem(
        content,
        "wrap-text",
        "\u81EA\u52A8\u6362\u884C",
        () => {
          view.wrapText = !view.wrapText;
          this.persist();
          popover.close();
          this.renderTablePreserveScroll();
        },
        { checked: view.wrapText }
      );
      this.menuItem(
        content,
        "layers",
        "\u6309\u5C5E\u6027\u5206\u7EC4",
        () => {
          popover.close();
          this.openGroupPanel(anchor);
        },
        { checked: Boolean(view.groupBy) }
      );
      content.createDiv({ cls: "nt-menu-divider" });
      this.menuItem(content, "download", "\u5BFC\u51FA\u5F53\u524D\u89C6\u56FE\u4E3A CSV", () => {
        popover.close();
        this.exportCsv();
      });
      this.menuItem(content, "eraser", "\u6E05\u7A7A\u5F53\u524D\u89C6\u56FE\u7684\u7B5B\u9009\u4E0E\u6392\u5E8F", () => {
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
        "\u5220\u9664\u5168\u90E8\u8BB0\u5F55",
        () => {
          popover.close();
          void this.deleteAllRows();
        },
        { danger: true }
      );
    }, { width: 250 });
  }
  async deleteDatabase() {
    if (!this.file) return;
    const confirmed = await confirmAction(
      this.app,
      "\u5220\u9664\u6570\u636E\u5E93",
      `\u786E\u5B9A\u8981\u5220\u9664\u300C${this.db?.title || this.file.basename}\u300D\u5417\uFF1F\u6570\u636E\u5E93\u6587\u4EF6\u4F1A\u88AB\u79FB\u5230\u56DE\u6536\u7AD9\u3002`,
      { confirmLabel: "\u5220\u9664\u6570\u636E\u5E93" }
    );
    if (!confirmed || !this.file) return;
    await this.app.fileManager.trashFile(this.file);
  }
  async deleteAllRows() {
    if (!this.db || this.db.rows.length === 0) return;
    const confirmed = await confirmAction(
      this.app,
      "\u5220\u9664\u5168\u90E8\u8BB0\u5F55",
      `\u786E\u5B9A\u8981\u5220\u9664\u5168\u90E8 ${this.db.rows.length} \u6761\u8BB0\u5F55\u5417\uFF1F\u5C5E\u6027\u548C\u89C6\u56FE\u4F1A\u4FDD\u7559\uFF0C\u6B64\u64CD\u4F5C\u65E0\u6CD5\u64A4\u9500\u3002`,
      { confirmLabel: "\u5220\u9664\u5168\u90E8\u8BB0\u5F55" }
    );
    if (!confirmed || !this.db) return;
    this.db.rows = [];
    this.selectedRows.clear();
    this.persist();
    this.renderTablePreserveScroll();
  }
  openEmojiPicker(anchor) {
    if (!this.db) return;
    openPopover(
      anchor,
      "nt-emoji-popover",
      (content, popover) => {
        const input = content.createEl("input", {
          cls: "nt-text-input nt-emoji-input",
          type: "text",
          value: this.db.icon,
          attr: { placeholder: "\u8F93\u5165\u4E00\u4E2A emoji", maxlength: "4" }
        });
        const grid = content.createDiv({ cls: "nt-emoji-grid" });
        for (const emoji of EMOJI_CHOICES) {
          const button = grid.createEl("button", {
            cls: "nt-emoji-choice",
            text: emoji,
            attr: { type: "button" }
          });
          button.addEventListener("click", () => {
            this.setDatabaseIcon(emoji);
            popover.close();
          });
        }
        const footer = content.createDiv({ cls: "nt-emoji-footer" });
        const remove = footer.createEl("button", {
          cls: "nt-button nt-button-quiet",
          text: "\u79FB\u9664\u56FE\u6807"
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
      { width: 304 }
    );
  }
  setDatabaseIcon(icon) {
    if (!this.db) return;
    this.db.icon = icon;
    if (this.iconButton) this.iconButton.setText(icon || "\u{1F5C2}\uFE0F");
    this.persist();
  }
  uniqueViewName(base) {
    if (!this.db) return base;
    let name = base;
    let index = 2;
    while (this.db.views.some((view) => view.name === name)) {
      name = `${base} ${index}`;
      index += 1;
    }
    return name;
  }
  openAddViewMenu(anchor) {
    if (!this.db) return;
    openPopover(anchor, "nt-menu-popover", (content, popover) => {
      content.createDiv({ cls: "nt-menu-heading", text: "\u6DFB\u52A0\u89C6\u56FE" });
      this.menuItem(content, "table-2", "\u8868\u683C\u89C6\u56FE", () => {
        const view = createView(this.uniqueViewName("\u8868\u683C"));
        this.db.views.push(view);
        this.db.activeViewId = view.id;
        this.selectedRows.clear();
        this.persist();
        popover.close();
        this.renderAll();
      });
      this.menuItem(content, "copy", "\u590D\u5236\u5F53\u524D\u89C6\u56FE", () => {
        popover.close();
        this.duplicateActiveView();
      });
      content.createDiv({ cls: "nt-menu-note", text: "\u672C\u63D2\u4EF6\u4E13\u6CE8\u4E8E\u8868\u683C\u89C6\u56FE\u3002" });
    }, { width: 230 });
  }
  duplicateActiveView() {
    if (!this.db || !this.activeView) return;
    const source = deepClone(this.activeView);
    source.id = uid("view");
    source.name = this.uniqueViewName(`${source.name} \u526F\u672C`);
    source.filters = source.filters.map((rule) => ({ ...rule, id: uid("filter") }));
    source.sorts = source.sorts.map((sort) => ({ ...sort, id: uid("sort") }));
    const sourceIndex = this.db.views.findIndex((view) => view.id === this.activeView.id);
    this.db.views.splice(sourceIndex + 1, 0, source);
    this.db.activeViewId = source.id;
    this.selectedRows.clear();
    this.persist();
    this.renderAll();
  }
  openViewMenu(anchor, view) {
    if (!this.db) return;
    openPopover(anchor, "nt-menu-popover", (content, popover) => {
      content.createDiv({ cls: "nt-menu-heading", text: view.name });
      this.menuItem(content, "pencil", "\u91CD\u547D\u540D\u89C6\u56FE", () => {
        popover.close();
        void this.renameView(view, anchor);
      });
      this.menuItem(content, "copy", "\u590D\u5236\u89C6\u56FE", () => {
        popover.close();
        this.duplicateView(view);
      });
      content.createDiv({ cls: "nt-menu-divider" });
      this.menuItem(
        content,
        "trash-2",
        "\u5220\u9664\u89C6\u56FE",
        () => {
          popover.close();
          void this.deleteView(view);
        },
        { danger: true, disabled: this.db.views.length <= 1 }
      );
      if (this.db.views.length <= 1) {
        content.createDiv({ cls: "nt-menu-note", text: "\u81F3\u5C11\u4FDD\u7559\u4E00\u4E2A\u89C6\u56FE\u3002" });
      }
    }, { width: 220 });
  }
  async renameView(view, _anchor) {
    const name = await promptText(this.app, {
      title: "\u91CD\u547D\u540D\u89C6\u56FE",
      label: "\u89C6\u56FE\u540D\u79F0",
      value: view.name,
      submitLabel: "\u4FDD\u5B58"
    });
    if (!name || !this.db) return;
    view.name = name;
    this.persist();
    this.renderAll();
  }
  duplicateView(view) {
    if (!this.db) return;
    const copy = deepClone(view);
    copy.id = uid("view");
    copy.name = this.uniqueViewName(`${view.name} \u526F\u672C`);
    copy.filters = copy.filters.map((rule) => ({ ...rule, id: uid("filter") }));
    copy.sorts = copy.sorts.map((sort) => ({ ...sort, id: uid("sort") }));
    const index = this.db.views.findIndex((item) => item.id === view.id);
    this.db.views.splice(index + 1, 0, copy);
    this.db.activeViewId = copy.id;
    this.selectedRows.clear();
    this.persist();
    this.renderAll();
  }
  async deleteView(view) {
    if (!this.db || this.db.views.length <= 1) return;
    const confirmed = await confirmAction(
      this.app,
      "\u5220\u9664\u89C6\u56FE",
      `\u786E\u5B9A\u8981\u5220\u9664\u89C6\u56FE\u300C${view.name}\u300D\u5417\uFF1F\u8FD9\u4E0D\u4F1A\u5220\u9664\u6570\u636E\u5E93\u4E2D\u7684\u8BB0\u5F55\u3002`,
      { confirmLabel: "\u5220\u9664\u89C6\u56FE" }
    );
    if (!confirmed || !this.db) return;
    this.db.views = this.db.views.filter((item) => item.id !== view.id);
    if (this.db.activeViewId === view.id) this.db.activeViewId = this.db.views[0].id;
    this.persist();
    this.renderAll();
  }
  openPropertiesPanel(anchor) {
    if (!this.db) return;
    openPopover(
      anchor,
      "nt-properties-popover",
      (content, popover) => {
        const build = () => {
          clear(content);
          const header = content.createDiv({ cls: "nt-popover-heading" });
          header.createSpan({ text: "\u5C5E\u6027" });
          header.createSpan({
            cls: "nt-popover-subtitle",
            text: `${this.db.properties.length} \u4E2A\u5C5E\u6027`
          });
          const list = content.createDiv({ cls: "nt-property-list" });
          const view = this.activeView;
          this.db.properties.forEach((property, index) => {
            const isTitle = property.type === "title";
            const hidden = view.hiddenProperties.includes(property.id);
            const row = list.createDiv({
              cls: `nt-property-row${hidden ? " is-hidden" : ""}`
            });
            const visibility = row.createEl("button", {
              cls: "nt-icon-button nt-property-visibility",
              attr: {
                type: "button",
                "aria-label": hidden ? "\u663E\u793A\u5C5E\u6027" : "\u9690\u85CF\u5C5E\u6027",
                title: isTitle ? "\u540D\u79F0\u5C5E\u6027\u4E0D\u80FD\u9690\u85CF" : hidden ? "\u663E\u793A\u5C5E\u6027" : "\u9690\u85CF\u5C5E\u6027"
              }
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
              attr: { type: "button", "aria-label": "\u4E0A\u79FB\u5C5E\u6027" }
            });
            up.append(iconEl("arrow-up", "nt-icon"));
            up.disabled = index === 0;
            up.addEventListener("click", () => this.moveProperty(index, -1));
            const down = controls.createEl("button", {
              cls: "nt-icon-button nt-mini-icon-button",
              attr: { type: "button", "aria-label": "\u4E0B\u79FB\u5C5E\u6027" }
            });
            down.append(iconEl("arrow-down", "nt-icon"));
            down.disabled = index === this.db.properties.length - 1;
            down.addEventListener("click", () => this.moveProperty(index, 1));
          });
          const footer = content.createDiv({ cls: "nt-popover-footer" });
          const add = footer.createEl("button", {
            cls: "nt-menu-item nt-menu-item-strong",
            attr: { type: "button" }
          });
          add.append(iconEl("plus", "nt-menu-icon"));
          add.createSpan({ text: "\u65B0\u5EFA\u5C5E\u6027" });
          add.addEventListener("click", () => {
            popover.close();
            void this.createProperty();
          });
        };
        build();
        this.propertiesPanelRefresh = build;
      },
      { width: 340, align: "end" }
    );
  }
  moveProperty(index, delta) {
    if (!this.db) return;
    const target = index + delta;
    if (target < 0 || target >= this.db.properties.length) return;
    const [property] = this.db.properties.splice(index, 1);
    this.db.properties.splice(target, 0, property);
    this.persist();
    this.renderTablePreserveScroll();
    if (document.querySelector(".nt-properties-popover")) this.propertiesPanelRefresh?.();
  }
  async createProperty() {
    if (!this.db) return;
    closeActivePopover();
    const result = await new NewPropertyModal(
      this.app,
      this.db.properties.map((property2) => property2.name)
    ).wait();
    if (!result || !this.db) return;
    const width = result.type === "number" ? 110 : result.type === "checkbox" ? 90 : result.type === "date" ? 150 : result.type === "multi_select" ? 200 : 170;
    const property = {
      id: uid("prop"),
      name: result.name,
      type: result.type,
      width,
      ...result.type === "select" || result.type === "multi_select" || result.type === "status" ? { options: [] } : {},
      ...result.type === "number" ? { numberFormat: result.numberFormat } : {}
    };
    this.db.properties.push(property);
    this.persist();
    this.renderTablePreserveScroll();
    notify(`\u5DF2\u6DFB\u52A0\u5C5E\u6027\u300C${property.name}\u300D`);
  }
  openCalculationMenu(anchor, property) {
    if (!this.db) return;
    const view = this.activeView;
    openPopover(anchor, "nt-menu-popover", (content, popover) => {
      content.createDiv({ cls: "nt-menu-heading", text: `${property.name} \xB7 \u8BA1\u7B97` });
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
          { checked: (view.calculations[property.id] || "none") === type }
        );
      }
    }, { width: 220, align: "end" });
  }
  openRowMenu(anchor, row) {
    if (!this.db) return;
    openPopover(anchor, "nt-menu-popover", (content, popover) => {
      content.createDiv({
        cls: "nt-menu-heading",
        text: String(getCell(row, titleProperty(this.db)) || "\u672A\u547D\u540D")
      });
      this.menuItem(content, "maximize-2", "\u6253\u5F00\u8BB0\u5F55\u9875\u9762", () => {
        popover.close();
        this.openRowPage(row);
      });
      this.menuItem(content, "copy", "\u590D\u5236\u8BB0\u5F55", () => {
        popover.close();
        this.duplicateRowAt(row);
      });
      content.createDiv({ cls: "nt-menu-divider" });
      this.menuItem(content, "arrow-up-to-line", "\u5728\u4E0A\u65B9\u63D2\u5165\u8BB0\u5F55", () => {
        popover.close();
        this.insertRowRelative(row, -1);
      });
      this.menuItem(content, "arrow-down-to-line", "\u5728\u4E0B\u65B9\u63D2\u5165\u8BB0\u5F55", () => {
        popover.close();
        this.insertRowRelative(row, 1);
      });
      content.createDiv({ cls: "nt-menu-divider" });
      this.menuItem(
        content,
        "trash-2",
        "\u5220\u9664\u8BB0\u5F55",
        () => {
          popover.close();
          void this.deleteRow(row);
        },
        { danger: true }
      );
    }, { width: 240 });
  }
  duplicateRowAt(row) {
    if (!this.db) return;
    const copy = duplicateRow(row);
    const index = this.db.rows.findIndex((item) => item.id === row.id);
    this.db.rows.splice(index + 1, 0, copy);
    this.persist();
    this.renderTablePreserveScroll();
  }
  insertRowRelative(row, delta) {
    if (!this.db) return;
    const newRow = createRow(this.db);
    const index = this.db.rows.findIndex((item) => item.id === row.id);
    this.db.rows.splice(delta < 0 ? index : index + 1, 0, newRow);
    this.persist();
    this.renderTablePreserveScroll();
    window.requestAnimationFrame(() => {
      const title = titleProperty(this.db);
      const cell = this.findCell(newRow.id, title.id);
      if (cell) this.beginTextEdit(cell, newRow, title);
    });
  }
  async deleteRow(row) {
    if (!this.db) return;
    const confirmed = await confirmAction(
      this.app,
      "\u5220\u9664\u8BB0\u5F55",
      `\u786E\u5B9A\u8981\u5220\u9664\u300C${String(getCell(row, titleProperty(this.db)) || "\u672A\u547D\u540D")}\u300D\u5417\uFF1F\u6B64\u64CD\u4F5C\u65E0\u6CD5\u64A4\u9500\u3002`,
      { confirmLabel: "\u5220\u9664\u8BB0\u5F55" }
    );
    if (!confirmed || !this.db) return;
    this.db.rows = this.db.rows.filter((item) => item.id !== row.id);
    this.selectedRows.delete(row.id);
    this.persist();
    this.renderTablePreserveScroll();
  }
  openPropertyMenu(anchor, property) {
    if (!this.db) return;
    const index = this.db.properties.findIndex((item) => item.id === property.id);
    const isTitle = property.type === "title";
    openPopover(anchor, "nt-menu-popover", (content, popover) => {
      content.createDiv({
        cls: "nt-menu-heading",
        text: property.name
      });
      const detail = content.createDiv({ cls: "nt-menu-property-type" });
      detail.append(iconEl(this.propertyIcon(property), "nt-menu-icon"));
      detail.createSpan({ text: property.type === "title" ? "\u6807\u9898\u5C5E\u6027" : this.typeLabel(property.type) });
      this.menuItem(content, "pencil", "\u91CD\u547D\u540D\u5C5E\u6027", () => {
        popover.close();
        void this.renameProperty(property);
      });
      this.menuItem(
        content,
        "arrow-left",
        "\u5411\u5DE6\u79FB\u52A8",
        () => {
          popover.close();
          this.moveProperty(index, -1);
        },
        { disabled: index === 0 }
      );
      this.menuItem(
        content,
        "arrow-right",
        "\u5411\u53F3\u79FB\u52A8",
        () => {
          popover.close();
          this.moveProperty(index, 1);
        },
        { disabled: index === this.db.properties.length - 1 }
      );
      content.createDiv({ cls: "nt-menu-divider" });
      this.menuItem(content, "arrow-up-narrow-wide", "\u5347\u5E8F\u6392\u5E8F", () => {
        popover.close();
        this.sortByProperty(property, "asc");
      });
      this.menuItem(content, "arrow-down-wide-narrow", "\u964D\u5E8F\u6392\u5E8F", () => {
        popover.close();
        this.sortByProperty(property, "desc");
      });
      this.menuItem(content, "list-filter", "\u6DFB\u52A0\u7B5B\u9009", () => {
        popover.close();
        this.addFilterForProperty(property);
      });
      if (!isTitle) {
        this.menuItem(content, "eye-off", "\u9690\u85CF\u5C5E\u6027", () => {
          popover.close();
          const view = this.activeView;
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
        "\u5220\u9664\u5C5E\u6027",
        () => {
          popover.close();
          void this.deleteProperty(property);
        },
        { danger: true, disabled: isTitle }
      );
      if (isTitle) {
        content.createDiv({ cls: "nt-menu-note", text: "\u540D\u79F0\u5C5E\u6027\u4E0D\u80FD\u5220\u9664\u6216\u9690\u85CF\u3002" });
      }
    }, { width: 245 });
  }
  typeLabel(type) {
    switch (type) {
      case "text":
        return "\u6587\u672C";
      case "number":
        return "\u6570\u5B57";
      case "select":
        return "\u5355\u9009";
      case "multi_select":
        return "\u591A\u9009";
      case "status":
        return "\u72B6\u6001";
      case "date":
        return "\u65E5\u671F";
      case "checkbox":
        return "\u590D\u9009\u6846";
      case "url":
        return "\u7F51\u5740";
      case "email":
        return "\u90AE\u7BB1";
      case "created_time":
        return "\u521B\u5EFA\u65F6\u95F4";
      case "last_edited_time":
        return "\u6700\u540E\u7F16\u8F91\u65F6\u95F4";
      default:
        return "\u6807\u9898";
    }
  }
  async renameProperty(property) {
    const name = await promptText(this.app, {
      title: "\u91CD\u547D\u540D\u5C5E\u6027",
      label: "\u5C5E\u6027\u540D\u79F0",
      value: property.name,
      submitLabel: "\u4FDD\u5B58"
    });
    if (!name || !this.db) return;
    property.name = name;
    this.persist();
    this.renderTablePreserveScroll();
  }
  sortByProperty(property, direction) {
    if (!this.db || !this.activeView) return;
    const view = this.activeView;
    view.sorts = view.sorts.filter((sort) => sort.propertyId !== property.id);
    view.sorts.unshift({
      id: uid("sort"),
      propertyId: property.id,
      direction
    });
    this.persist();
    this.renderTablePreserveScroll();
    if (this.sortButton) {
      this.sortButton.addClass("is-active");
      this.updateBadge(this.sortButton, view.sorts.length);
    }
  }
  addFilterForProperty(property) {
    if (!this.db || !this.activeView) return;
    const view = this.activeView;
    view.filters.push(defaultFilter(property));
    this.persist();
    this.renderTablePreserveScroll();
    if (this.filterButton) {
      this.filterButton.addClass("is-active");
      this.updateBadge(this.filterButton, view.filters.length);
      window.setTimeout(() => this.openFilterPanel(this.filterButton), 20);
    }
  }
  async deleteProperty(property) {
    if (!this.db || property.type === "title") return;
    const confirmed = await confirmAction(
      this.app,
      "\u5220\u9664\u5C5E\u6027",
      `\u786E\u5B9A\u8981\u5220\u9664\u5C5E\u6027\u300C${property.name}\u300D\u5417\uFF1F\u8BE5\u5217\u4E2D\u7684\u6240\u6709\u6570\u636E\u90FD\u4F1A\u88AB\u5220\u9664\u3002`,
      { confirmLabel: "\u5220\u9664\u5C5E\u6027" }
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
    }
    this.persist();
    this.renderTablePreserveScroll();
  }
  refreshFilterBadge() {
    if (!this.filterButton || !this.activeView) return;
    this.filterButton.toggleClass("is-active", this.activeView.filters.length > 0);
    this.updateBadge(this.filterButton, this.activeView.filters.length);
  }
  refreshSortBadge() {
    if (!this.sortButton || !this.activeView) return;
    this.sortButton.toggleClass("is-active", this.activeView.sorts.length > 0);
    this.updateBadge(this.sortButton, this.activeView.sorts.length);
  }
  refreshGroupBadge() {
    if (!this.groupButton || !this.activeView) return;
    this.groupButton.toggleClass("is-active", Boolean(this.activeView.groupBy));
  }
  applyFilterChange() {
    this.persist();
    this.refreshFilterBadge();
    this.renderTablePreserveScroll();
  }
  applySortChange() {
    this.persist();
    this.refreshSortBadge();
    this.renderTablePreserveScroll();
  }
  openFilterPanel(anchor) {
    if (!this.db) return;
    const view = this.activeView;
    openPopover(
      anchor,
      "nt-filter-popover",
      (content) => {
        const render = () => {
          clear(content);
          const header = content.createDiv({ cls: "nt-popover-heading" });
          header.createSpan({ text: "\u7B5B\u9009" });
          const subtitle = header.createSpan({ cls: "nt-popover-subtitle" });
          if (view.filters.length > 1) {
            const toggle = subtitle.createDiv({ cls: "nt-conjunction-toggle" });
            const and = toggle.createEl("button", {
              cls: view.conjunction === "and" ? "is-active" : "",
              text: "\u5168\u90E8",
              attr: { type: "button" }
            });
            const or = toggle.createEl("button", {
              cls: view.conjunction === "or" ? "is-active" : "",
              text: "\u4EFB\u4E00",
              attr: { type: "button" }
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
            subtitle.setText("\u6EE1\u8DB3\u4EE5\u4E0B\u6761\u4EF6");
          }
          if (view.filters.length === 0) {
            const empty = content.createDiv({ cls: "nt-popover-empty" });
            empty.append(iconEl("list-filter", "nt-empty-popover-icon"));
            empty.createDiv({ text: "\u8FD8\u6CA1\u6709\u7B5B\u9009\u6761\u4EF6" });
            empty.createEl("p", {
              text: "\u7B5B\u9009\u53EA\u4F5C\u7528\u4E8E\u5F53\u524D\u89C6\u56FE\uFF0C\u4E0D\u4F1A\u4FEE\u6539\u6570\u636E\u5E93\u4E2D\u7684\u8BB0\u5F55\u3002"
            });
          }
          const list = content.createDiv({ cls: "nt-filter-list" });
          view.filters.forEach((rule) => {
            const property = propertyById(this.db, rule.propertyId);
            if (!property) return;
            const row = list.createDiv({ cls: "nt-filter-row" });
            const propertySelect = row.createEl("select", { cls: "nt-select nt-filter-property" });
            for (const item of this.db.properties) {
              propertySelect.createEl("option", {
                value: item.id,
                text: item.name
              });
            }
            propertySelect.value = property.id;
            propertySelect.addEventListener("change", () => {
              const next = propertyById(this.db, propertySelect.value);
              if (!next) return;
              const defaults = defaultFilter(next);
              rule.propertyId = next.id;
              rule.operator = defaults.operator;
              rule.value = defaults.value;
              this.applyFilterChange();
              render();
            });
            const operatorSelect = row.createEl("select", {
              cls: "nt-select nt-filter-operator"
            });
            for (const operator of filterOperators(property.type)) {
              operatorSelect.createEl("option", {
                value: operator.value,
                text: operator.label
              });
            }
            operatorSelect.value = rule.operator;
            operatorSelect.addEventListener("change", () => {
              rule.operator = operatorSelect.value;
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
              attr: { type: "button", "aria-label": "\u5220\u9664\u7B5B\u9009\u6761\u4EF6", title: "\u5220\u9664\u7B5B\u9009\u6761\u4EF6" }
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
            attr: { type: "button" }
          });
          add.append(iconEl("plus", "nt-menu-icon"));
          add.createSpan({ text: "\u6DFB\u52A0\u7B5B\u9009\u6761\u4EF6" });
          add.addEventListener("click", () => {
            const first = this.db.properties[0];
            if (first) view.filters.push(defaultFilter(first));
            this.applyFilterChange();
            render();
          });
          if (view.filters.length > 0) {
            const clearAll = footer.createEl("button", {
              cls: "nt-text-button",
              text: "\u6E05\u9664\u5168\u90E8"
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
      { width: 580 }
    );
  }
  appendFilterValueEditor(row, property, rule, onChange) {
    if (property.type === "checkbox") return;
    if (property.type === "select" || property.type === "status") {
      const select = row.createEl("select", { cls: "nt-select nt-filter-value" });
      select.createEl("option", { value: "", text: "\u9009\u62E9\u9009\u9879\u2026" });
      for (const option2 of property.options || []) {
        select.createEl("option", { value: option2.id, text: option2.name });
      }
      select.value = String(rule.value ?? "");
      select.addEventListener("change", () => {
        rule.value = select.value;
        onChange();
      });
      if (!property.options?.length) {
        select.disabled = true;
        select.title = "\u8BF7\u5148\u5728\u8868\u683C\u4E2D\u4E3A\u8FD9\u4E2A\u5C5E\u6027\u521B\u5EFA\u9009\u9879";
      }
      return;
    }
    if (property.type === "multi_select") {
      const select = row.createEl("select", { cls: "nt-select nt-filter-value" });
      select.createEl("option", { value: "", text: "\u9009\u62E9\u6807\u7B7E\u2026" });
      for (const option2 of property.options || []) {
        select.createEl("option", { value: option2.id, text: option2.name });
      }
      select.value = String(rule.value ?? "");
      select.addEventListener("change", () => {
        rule.value = select.value;
        onChange();
      });
      return;
    }
    if (property.type === "date" || property.type === "created_time" || property.type === "last_edited_time") {
      const input2 = row.createEl("input", {
        cls: "nt-text-input nt-filter-value",
        type: "date",
        value: String(rule.value ?? "")
      });
      input2.addEventListener("change", () => {
        rule.value = input2.value;
        onChange();
      });
      return;
    }
    if (property.type === "number") {
      const input2 = row.createEl("input", {
        cls: "nt-text-input nt-filter-value",
        type: "number",
        value: String(rule.value ?? ""),
        attr: { step: "any", placeholder: "\u6570\u503C" }
      });
      input2.addEventListener("input", () => {
        rule.value = input2.value === "" ? null : Number(input2.value);
        onChange();
      });
      return;
    }
    const input = row.createEl("input", {
      cls: "nt-text-input nt-filter-value",
      type: "text",
      value: String(rule.value ?? ""),
      attr: { placeholder: "\u8F93\u5165\u5185\u5BB9" }
    });
    input.addEventListener("input", () => {
      rule.value = input.value;
      onChange();
    });
  }
  openSortPanel(anchor) {
    if (!this.db) return;
    const view = this.activeView;
    openPopover(
      anchor,
      "nt-sort-popover",
      (content) => {
        const render = () => {
          clear(content);
          const header = content.createDiv({ cls: "nt-popover-heading" });
          header.createSpan({ text: "\u6392\u5E8F" });
          header.createSpan({
            cls: "nt-popover-subtitle",
            text: view.sorts.length ? "\u6309\u987A\u5E8F\u5E94\u7528" : "\u9009\u62E9\u6392\u5E8F\u5C5E\u6027"
          });
          if (view.sorts.length === 0) {
            const empty = content.createDiv({ cls: "nt-popover-empty" });
            empty.append(iconEl("arrow-up-down", "nt-empty-popover-icon"));
            empty.createDiv({ text: "\u8FD8\u6CA1\u6709\u6392\u5E8F\u6761\u4EF6" });
            empty.createEl("p", { text: "\u6DFB\u52A0\u6761\u4EF6\u540E\uFF0C\u8868\u683C\u4F1A\u6309\u987A\u5E8F\u6BD4\u8F83\u6BCF\u4E00\u5217\u3002" });
          }
          const list = content.createDiv({ cls: "nt-sort-list" });
          view.sorts.forEach((sort, index) => {
            const property = propertyById(this.db, sort.propertyId);
            if (!property) return;
            const row = list.createDiv({ cls: "nt-sort-row" });
            row.createSpan({ cls: "nt-sort-index", text: String(index + 1) });
            const select = row.createEl("select", { cls: "nt-select nt-sort-property" });
            for (const item of this.db.properties) {
              select.createEl("option", { value: item.id, text: item.name });
            }
            select.value = property.id;
            select.addEventListener("change", () => {
              sort.propertyId = select.value;
              const next = propertyById(this.db, select.value);
              if (next && next.type === "checkbox") {
              }
              this.applySortChange();
              render();
            });
            const direction = row.createEl("button", {
              cls: "nt-direction-button",
              attr: { type: "button", "aria-label": "\u5207\u6362\u6392\u5E8F\u65B9\u5411" }
            });
            direction.append(
              iconEl(sort.direction === "asc" ? "arrow-up" : "arrow-down", "nt-icon")
            );
            direction.createSpan({
              text: sort.direction === "asc" ? "\u5347\u5E8F" : "\u964D\u5E8F"
            });
            direction.addEventListener("click", () => {
              sort.direction = sort.direction === "asc" ? "desc" : "asc";
              this.applySortChange();
              render();
            });
            const remove = row.createEl("button", {
              cls: "nt-icon-button nt-sort-remove",
              attr: { type: "button", "aria-label": "\u5220\u9664\u6392\u5E8F\u6761\u4EF6", title: "\u5220\u9664\u6392\u5E8F\u6761\u4EF6" }
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
            attr: { type: "button" }
          });
          add.append(iconEl("plus", "nt-menu-icon"));
          add.createSpan({ text: "\u6DFB\u52A0\u6392\u5E8F\u6761\u4EF6" });
          add.addEventListener("click", () => {
            const used = new Set(view.sorts.map((sort) => sort.propertyId));
            const candidate = this.db.properties.find((property) => !used.has(property.id)) || this.db.properties[0];
            if (!candidate) return;
            view.sorts.push({
              id: uid("sort"),
              propertyId: candidate.id,
              direction: "asc"
            });
            this.applySortChange();
            render();
          });
          if (view.sorts.length > 0) {
            const clearAll = footer.createEl("button", {
              cls: "nt-text-button",
              text: "\u6E05\u9664\u5168\u90E8"
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
      { width: 480 }
    );
  }
  openGroupPanel(anchor) {
    if (!this.db) return;
    const view = this.activeView;
    const candidates = this.db.properties.filter(
      (property) => property.type === "select" || property.type === "status" || property.type === "checkbox"
    );
    openPopover(anchor, "nt-menu-popover", (content, popover) => {
      content.createDiv({ cls: "nt-menu-heading", text: "\u5206\u7EC4" });
      this.menuItem(
        content,
        "ban",
        "\u4E0D\u5206\u7EC4",
        () => {
          view.groupBy = null;
          view.collapsedGroups = [];
          this.persist();
          popover.close();
          this.refreshGroupBadge();
          this.renderTablePreserveScroll();
        },
        { checked: !view.groupBy }
      );
      if (candidates.length === 0) {
        content.createDiv({
          cls: "nt-menu-note",
          text: "\u5148\u6DFB\u52A0\u300C\u5355\u9009\u300D\u300C\u72B6\u6001\u300D\u6216\u300C\u590D\u9009\u6846\u300D\u5C5E\u6027\uFF0C\u624D\u80FD\u6309\u5C5E\u6027\u5206\u7EC4\u3002"
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
          { checked: view.groupBy === property.id }
        );
      }
    }, { width: 230 });
  }
  openOptionPicker(anchor, row, property) {
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
          attr: { placeholder: "\u641C\u7D22\u6216\u521B\u5EFA\u9009\u9879\u2026", "aria-label": "\u641C\u7D22\u9009\u9879" }
        });
        const list = content.createDiv({ cls: "nt-option-list" });
        const clearButton = content.createEl("button", {
          cls: "nt-option-clear",
          text: isMulti ? "\u6E05\u9664\u5168\u90E8" : "\u6E05\u9664\u9009\u62E9"
        });
        clearButton.addEventListener("click", () => {
          setCell(row, property, isMulti ? [] : null);
          this.persist();
          this.refreshCell(anchor, row, property);
          if (!isMulti) {
            popover.close();
            this.renderTablePreserveScroll();
          } else {
            renderList();
            search.focus();
          }
        });
        const toggleOption = (optionId) => {
          if (isMulti) {
            const current = Array.isArray(getCell(row, property)) ? [...getCell(row, property)] : [];
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
            this.renderTablePreserveScroll();
          }
        };
        const createAndToggle = (name) => {
          if (!name.trim()) return;
          const option2 = ensureOption(property, name);
          this.persist();
          toggleOption(option2.id);
        };
        const renderList = () => {
          const query = search.value.trim().toLocaleLowerCase();
          clear(list);
          const options = (property.options || []).filter(
            (option2) => option2.name.toLocaleLowerCase().includes(query)
          );
          const selectedValue = getCell(row, property);
          const selectedIds = Array.isArray(selectedValue) ? selectedValue : [];
          if (options.length === 0 && !query) {
            const empty = list.createDiv({ cls: "nt-option-empty" });
            empty.createSpan({ text: "\u8FD8\u6CA1\u6709\u9009\u9879" });
            empty.createEl("p", { text: "\u5728\u4E0A\u65B9\u8F93\u5165\u540D\u79F0\u5373\u53EF\u521B\u5EFA\u7B2C\u4E00\u4E2A\u9009\u9879\u3002" });
          }
          for (const option2 of options) {
            const selected = isMulti ? selectedIds.includes(option2.id) : selectedValue === option2.id;
            const optionRow = list.createDiv({
              cls: `nt-option-row${selected ? " is-selected" : ""}`
            });
            const main = optionRow.createEl("button", {
              cls: "nt-option-main",
              attr: { type: "button" }
            });
            const pill = main.createSpan({ cls: `nt-pill ${colorClass(option2.color)}` });
            if (property.type === "status") pill.createSpan({ cls: "nt-option-dot" });
            pill.createSpan({ cls: "nt-pill-text", text: option2.name });
            main.addEventListener("click", (event) => {
              event.stopPropagation();
              toggleOption(option2.id);
            });
            if (selected) main.append(iconEl("check", "nt-option-check"));
            const remove = optionRow.createEl("button", {
              cls: "nt-icon-button nt-option-delete",
              attr: { type: "button", "aria-label": `\u5220\u9664\u9009\u9879 ${option2.name}`, title: "\u5220\u9664\u9009\u9879" }
            });
            remove.append(iconEl("x", "nt-icon"));
            remove.addEventListener("click", (event) => {
              event.stopPropagation();
              void this.deleteSelectOption(property, option2);
            });
          }
          const exact = (property.options || []).some(
            (option2) => option2.name.toLocaleLowerCase() === query
          );
          if (query && !exact) {
            const create = list.createEl("button", {
              cls: "nt-option-create",
              attr: { type: "button" }
            });
            create.append(iconEl("plus", "nt-icon"));
            create.createSpan({ text: `\u521B\u5EFA \u201C${search.value.trim()}\u201D` });
            create.addEventListener("click", () => createAndToggle(search.value));
          }
          if (!property.options?.length && !query) {
          }
          const footer = content.createDiv({ cls: "nt-option-footer" });
          footer.createSpan({
            text: property.type === "status" ? "\u72B6\u6001\u9009\u9879" : "\u6309 Enter \u5FEB\u901F\u521B\u5EFA"
          });
        };
        search.addEventListener("input", renderList);
        search.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          const query = search.value.trim();
          if (!query) return;
          const exact = (property.options || []).find(
            (option2) => option2.name.toLocaleLowerCase() === query.toLocaleLowerCase()
          );
          createAndToggle(exact ? exact.name : query);
          search.value = "";
          renderList();
        });
        renderList();
        window.setTimeout(() => search.focus(), 30);
      },
      { width: 290 }
    );
  }
  async deleteSelectOption(property, option2) {
    if (!this.db) return;
    const confirmed = await confirmAction(
      this.app,
      "\u5220\u9664\u9009\u9879",
      `\u786E\u5B9A\u8981\u5220\u9664\u9009\u9879\u300C${option2.name}\u300D\u5417\uFF1F\u4F7F\u7528\u8BE5\u9009\u9879\u7684\u8BB0\u5F55\u4F1A\u88AB\u6E05\u7A7A\u8FD9\u4E2A\u503C\u3002`,
      { confirmLabel: "\u5220\u9664\u9009\u9879" }
    );
    if (!confirmed || !this.db) return;
    property.options = (property.options || []).filter((item) => item.id !== option2.id);
    for (const row of this.db.rows) {
      const value = getCell(row, property);
      if (property.type === "multi_select" && Array.isArray(value)) {
        const next = value.filter((id) => id !== option2.id);
        if (next.length !== value.length) setCell(row, property, next);
      } else if (value === option2.id) {
        setCell(row, property, null);
      }
    }
    this.persist();
    closeActivePopover();
    this.renderTablePreserveScroll();
  }
  refreshCell(anchor, row, property) {
    if (anchor.classList.contains("nt-cell")) {
      this.renderCellContent(anchor, row, property);
    } else if (anchor.classList.contains("nt-title-cell")) {
      const td = anchor.closest("td.nt-cell");
      if (td) this.renderCellContent(td, row, property);
    }
  }
  openDatePicker(anchor, row, property) {
    if (!this.db) return;
    openPopover(
      anchor,
      "nt-date-popover",
      (content, popover) => {
        const original = getCell(row, property) || null;
        const value = original ? { ...original } : { start: "" };
        let includeEnd = Boolean(original?.end);
        let includeTime = Boolean(original?.includeTime || original?.start?.includes("T"));
        const header = content.createDiv({ cls: "nt-popover-heading" });
        header.createSpan({ text: "\u65E5\u671F" });
        const body = content.createDiv({ cls: "nt-date-body" });
        const render = () => {
          clear(body);
          const startLabel = body.createDiv({ cls: "nt-date-field-label", text: "\u5F00\u59CB" });
          void startLabel;
          const start = body.createEl("input", {
            cls: "nt-text-input nt-date-input",
            type: includeTime ? "datetime-local" : "date",
            value: includeTime ? value.start || `${todayInput()}T09:00` : value.start.slice(0, 10)
          });
          start.addEventListener("change", () => {
            value.start = start.value;
            if (start.value) value.includeTime = includeTime;
            commit();
          });
          const endRow = body.createDiv({ cls: "nt-date-end-row" });
          if (includeEnd) {
            endRow.createDiv({ cls: "nt-date-field-label", text: "\u7ED3\u675F" });
            const end = endRow.createEl("input", {
              cls: "nt-text-input nt-date-input",
              type: includeTime ? "datetime-local" : "date",
              value: value.end || ""
            });
            end.addEventListener("change", () => {
              value.end = end.value;
              commit();
            });
            const removeEnd = endRow.createEl("button", {
              cls: "nt-icon-button",
              attr: { type: "button", "aria-label": "\u79FB\u9664\u7ED3\u675F\u65E5\u671F" }
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
              text: "\uFF0B \u6DFB\u52A0\u7ED3\u675F\u65E5\u671F"
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
            cls: "nt-checkbox-input"
          });
          timeCheck.checked = includeTime;
          timeLabel.createSpan({ text: "\u5305\u542B\u65F6\u95F4" });
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
            ["\u4ECA\u5929", 0],
            ["\u660E\u5929", 1],
            ["\u4E0B\u5468", 7]
          ]) {
            const button = quick.createEl("button", {
              cls: "nt-chip-button",
              text: label,
              attr: { type: "button" }
            });
            button.addEventListener("click", () => {
              const date = /* @__PURE__ */ new Date();
              date.setDate(date.getDate() + days);
              value.start = includeTime ? `${toDateInput(date)}T09:00` : toDateInput(date);
              value.includeTime = includeTime;
              commit();
              render();
            });
          }
          const footer = body.createDiv({ cls: "nt-date-footer" });
          const clearButton = footer.createEl("button", {
            cls: "nt-text-button",
            text: "\u6E05\u9664\u65E5\u671F"
          });
          clearButton.addEventListener("click", () => {
            setCell(row, property, null);
            this.persist();
            this.refreshCell(anchor, row, property);
            popover.close();
            this.renderTablePreserveScroll();
          });
          const done = footer.createEl("button", {
            cls: "nt-button nt-button-primary",
            text: "\u5B8C\u6210"
          });
          done.addEventListener("click", () => {
            popover.close();
            this.renderTablePreserveScroll();
          });
        };
        const commit = () => {
          if (!value.start) {
            setCell(row, property, null);
          } else {
            const next = { start: value.start };
            if (includeEnd && value.end) next.end = value.end;
            if (includeTime) next.includeTime = true;
            setCell(row, property, next);
          }
          this.persist();
          this.refreshCell(anchor, row, property);
        };
        render();
      },
      { width: 330 }
    );
  }
};

// src/main.ts
var NotionTablePlugin = class extends import_obsidian5.Plugin {
  async onload() {
    this.registerView(VIEW_TYPE, (leaf) => new NotionTableView(leaf, this));
    this.registerExtensions([FILE_EXTENSION], VIEW_TYPE);
    this.addRibbonIcon("table-2", "\u65B0\u5EFA One Database", () => {
      void this.createNewDatabase();
    });
    this.addCommand({
      id: "create-database",
      name: "\u65B0\u5EFA One Database \u8868\u683C",
      callback: () => void this.createNewDatabase()
    });
    this.addCommand({
      id: "create-sample-database",
      name: "\u521B\u5EFA One Database \u793A\u4F8B\u8868\u683C",
      callback: () => void this.createSample()
    });
    this.addCommand({
      id: "export-current-view-csv",
      name: "\u5BFC\u51FA\u5F53\u524D\u8868\u683C\u89C6\u56FE\u4E3A CSV",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(NotionTableView);
        if (!view) return false;
        if (checking) return true;
        view.exportCsv();
        return true;
      }
    });
    this.addCommand({
      id: "add-row-to-current-table",
      name: "\u5728\u5F53\u524D\u8868\u683C\u4E2D\u6DFB\u52A0\u4E00\u884C",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(NotionTableView);
        if (!view) return false;
        if (checking) return true;
        view.addRowAndFocus();
        return true;
      }
    });
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (file instanceof import_obsidian5.TFolder) {
          menu.addItem((item) => {
            item.setTitle("\u65B0\u5EFA One Database").setIcon("table-2").onClick(() => {
              void this.createNewDatabase(file);
            });
          });
        }
        if (file instanceof import_obsidian5.TFile && file.extension === FILE_EXTENSION) {
          menu.addItem((item) => {
            item.setTitle("\u5BFC\u51FA\u4E3A CSV").setIcon("download").onClick(() => {
              void this.exportFileCsv(file);
            });
          });
        }
      })
    );
  }
  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }
  defaultFolder(folder) {
    if (folder) return folder.path === "/" ? "" : folder.path;
    const active = this.app.workspace.getActiveFile();
    if (active?.parent) return active.parent.path === "/" ? "" : active.parent.path;
    return "";
  }
  async uniquePath(folder, name) {
    const safeName = sanitizeFilename(name);
    const base = folder ? `${folder}/${safeName}` : safeName;
    let path = `${base}.${FILE_EXTENSION}`;
    let index = 2;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = `${base} ${index}.${FILE_EXTENSION}`;
      index += 1;
    }
    return path;
  }
  async createNewDatabase(folder) {
    const title = await promptText(this.app, {
      title: "\u65B0\u5EFA One Database",
      label: "\u6570\u636E\u5E93\u540D\u79F0",
      placeholder: "\u4F8B\u5982\uFF1A\u9879\u76EE\u4EFB\u52A1",
      value: "",
      submitLabel: "\u521B\u5EFA\u6570\u636E\u5E93"
    });
    if (!title) return;
    try {
      const folderPath = this.defaultFolder(folder);
      const path = await this.uniquePath(folderPath, title);
      const database = createDatabase(title);
      database.title = title;
      const file = await this.app.vault.create(path, serializeDatabase(database));
      const leaf = this.app.workspace.getLeaf(true);
      await leaf.openFile(file);
      new import_obsidian5.Notice(`\u5DF2\u521B\u5EFA\u300C${title}\u300D`);
    } catch (error) {
      console.error(error);
      new import_obsidian5.Notice("\u521B\u5EFA\u6570\u636E\u5E93\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u540D\u79F0\u6216\u6587\u4EF6\u5939\u6743\u9650\u3002");
    }
  }
  async createSample() {
    try {
      const path = await this.uniquePath("", "One Database \u793A\u4F8B");
      const database = createSampleDatabase();
      const file = await this.app.vault.create(path, serializeDatabase(database));
      const leaf = this.app.workspace.getLeaf(true);
      await leaf.openFile(file);
      new import_obsidian5.Notice("\u5DF2\u521B\u5EFA One Database \u793A\u4F8B\u8868\u683C");
    } catch (error) {
      console.error(error);
      new import_obsidian5.Notice("\u521B\u5EFA\u793A\u4F8B\u6570\u636E\u5E93\u5931\u8D25\u3002");
    }
  }
  async exportFileCsv(file) {
    try {
      const leaf = this.app.workspace.getLeaf(true);
      await leaf.openFile(file);
      const view = leaf.view;
      if (view instanceof NotionTableView) view.exportCsv();
    } catch (error) {
      console.error(error);
      new import_obsidian5.Notice("\u5BFC\u51FA CSV \u5931\u8D25\u3002");
    }
  }
};
