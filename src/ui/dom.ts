import { App, Modal, Notice, setIcon } from "obsidian";

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function clear(element: HTMLElement): void {
  while (element.firstChild) element.removeChild(element.firstChild);
}

export function iconEl(icon: string, className = "nt-icon"): HTMLElement {
  const element = h("span", className);
  setIcon(element, icon);
  return element;
}

export function buttonEl(
  icon: string,
  label: string,
  className = "nt-toolbar-button",
): HTMLButtonElement {
  const button = h("button", className);
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
  const iconSpan = iconEl(icon, "nt-button-icon");
  const labelSpan = h("span", "nt-button-label", label);
  button.append(iconSpan, labelSpan);
  return button;
}

export function setButtonLabel(button: HTMLButtonElement, label: string): void {
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
  const labelElement = button.querySelector<HTMLElement>(".nt-button-label");
  if (labelElement) labelElement.textContent = label;
}

export function colorClass(color: string | undefined): string {
  return `nt-color-${color || "default"}`;
}

export function truncate(text: string, length = 80): string {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

let activePopover: Popover | null = null;

export interface PopoverOptions {
  align?: "start" | "end" | "center";
  width?: number;
  className?: string;
}

/**
 * A lightweight Notion-style popover that is anchored to an element and
 * automatically keeps itself inside the window.
 */
export class Popover {
  readonly anchor: HTMLElement;
  readonly contentEl: HTMLElement;
  private readonly popoverEl: HTMLElement;
  private readonly options: PopoverOptions;
  private closed = false;
  private readonly onOutside;
  private readonly onKeydown;
  private readonly onReposition;

  constructor(anchor: HTMLElement, options: PopoverOptions = {}) {
    this.anchor = anchor;
    this.options = options;
    this.popoverEl = h("div", `nt-popover ${options.className || ""}`.trim());
    this.popoverEl.setAttribute("role", "dialog");
    this.contentEl = h("div", "nt-popover-content");
    this.popoverEl.append(this.contentEl);
    document.body.append(this.popoverEl);
    if (options.width) this.popoverEl.style.width = `${options.width}px`;

    this.onOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (this.popoverEl.contains(target) || this.anchor.contains(target)) return;
      this.close();
    };
    this.onKeydown = (event: KeyboardEvent) => {
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

  get element(): HTMLElement {
    return this.popoverEl;
  }

  setContent(builder: (content: HTMLElement) => void): void {
    clear(this.contentEl);
    builder(this.contentEl);
    this.reposition();
  }

  reposition(): void {
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

  close(): void {
    if (this.closed) return;
    this.closed = true;
    document.removeEventListener("mousedown", this.onOutside, true);
    document.removeEventListener("keydown", this.onKeydown, true);
    window.removeEventListener("resize", this.onReposition);
    document.removeEventListener("scroll", this.onReposition, true);
    this.popoverEl.remove();
    if (activePopover === this) activePopover = null;
  }
}

export function openPopover(
  anchor: HTMLElement,
  className: string,
  builder: (content: HTMLElement, popover: Popover) => void,
  options: PopoverOptions = {},
): Popover {
  if (activePopover) activePopover.close();
  const popover = new Popover(anchor, { ...options, className });
  activePopover = popover;
  builder(popover.contentEl, popover);
  popover.reposition();
  return popover;
}

export function closeActivePopover(): void {
  activePopover?.close();
}

export class PromptModal extends Modal {
  private result: string | null = null;
  private resolved = false;
  private resolvePromise: (value: string | null) => void;
  private readonly titleText: string;
  private readonly label: string;
  private readonly placeholder: string;
  private readonly initial: string;
  private readonly submitLabel: string;
  private input: HTMLInputElement;

  constructor(
    app: App,
    options: {
      title: string;
      label?: string;
      placeholder?: string;
      value?: string;
      submitLabel?: string;
    },
  ) {
    super(app);
    this.titleText = options.title;
    this.label = options.label || "";
    this.placeholder = options.placeholder || "";
    this.initial = options.value || "";
    this.submitLabel = options.submitLabel || "确定";
  }

  wait(): Promise<string | null> {
    this.open();
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  onOpen(): void {
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
      attr: { placeholder: this.placeholder },
    });
    const actions = this.contentEl.createDiv({ cls: "nt-modal-actions" });
    const cancel = actions.createEl("button", { cls: "nt-button", text: "取消" });
    cancel.addEventListener("click", () => {
      this.result = null;
      this.close();
    });
    const submit = actions.createEl("button", {
      cls: "nt-button nt-button-primary",
      text: this.submitLabel,
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

  private submit(): void {
    this.result = this.input.value.trim() || null;
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

export function promptText(
  app: App,
  options: {
    title: string;
    label?: string;
    placeholder?: string;
    value?: string;
    submitLabel?: string;
  },
): Promise<string | null> {
  return new PromptModal(app, options).wait();
}

export function confirmAction(
  app: App,
  title: string,
  message: string,
  options: { confirmLabel?: string; danger?: boolean } = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    let answered = false;
    const modal = new (class extends Modal {
      onOpen(): void {
        this.modalEl.addClass("nt-modal");
        this.titleEl.setText(title);
        this.contentEl.empty();
        this.contentEl.createEl("p", { cls: "nt-modal-message", text: message });
        const actions = this.contentEl.createDiv({ cls: "nt-modal-actions" });
        const cancel = actions.createEl("button", { cls: "nt-button", text: "取消" });
        cancel.addEventListener("click", () => {
          answered = true;
          resolve(false);
          this.close();
        });
        const confirm = actions.createEl("button", {
          cls: `nt-button ${options.danger === false ? "nt-button-primary" : "nt-button-danger"}`,
          text: options.confirmLabel || "删除",
        });
        confirm.addEventListener("click", () => {
          answered = true;
          resolve(true);
          this.close();
        });
      }

      onClose(): void {
        this.contentEl.empty();
        if (!answered) {
          answered = true;
          resolve(false);
        }
      }
    })(app);
    modal.open();
  });
}

export function notify(message: string, duration = 3000): void {
  new Notice(message, duration);
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv"): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|#^[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");
  return cleaned || "未命名数据库";
}

export function debounce<T extends (...args: any[]) => void>(
  function_: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timer: number | null = null;
  return (...args: Parameters<T>) => {
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      function_(...args);
    }, wait);
  };
}
