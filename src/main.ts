import { Menu, Notice, Plugin, TFile, TFolder, WorkspaceLeaf } from "obsidian";
import { createDatabase, createSampleDatabase, serializeDatabase } from "./model";
import { FILE_EXTENSION, VIEW_TYPE } from "./types";
import { NotionTableView } from "./view";
import { promptText, sanitizeFilename } from "./ui/dom";

export default class NotionTablePlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerView(VIEW_TYPE, (leaf: WorkspaceLeaf) => new NotionTableView(leaf, this));
    this.registerExtensions([FILE_EXTENSION], VIEW_TYPE);

    this.addRibbonIcon("table-2", "新建 One Database", () => {
      void this.createNewDatabase();
    });

    this.addCommand({
      id: "create-database",
      name: "新建 One Database 表格",
      callback: () => void this.createNewDatabase(),
    });

    this.addCommand({
      id: "create-sample-database",
      name: "创建 One Database 示例表格",
      callback: () => void this.createSample(),
    });

    this.addCommand({
      id: "export-current-view-csv",
      name: "导出当前表格视图为 CSV",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(NotionTableView);
        if (!view) return false;
        if (checking) return true;
        view.exportCsv();
        return true;
      },
    });

    this.addCommand({
      id: "add-row-to-current-table",
      name: "在当前表格中添加一行",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(NotionTableView);
        if (!view) return false;
        if (checking) return true;
        view.addRowAndFocus();
        return true;
      },
    });

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu: Menu, file) => {
        if (file instanceof TFolder) {
          menu.addItem((item) => {
            item
              .setTitle("新建 One Database")
              .setIcon("table-2")
              .onClick(() => {
                void this.createNewDatabase(file);
              });
          });
        }
        if (file instanceof TFile && file.extension === FILE_EXTENSION) {
          menu.addItem((item) => {
            item
              .setTitle("导出为 CSV")
              .setIcon("download")
              .onClick(() => {
                void this.exportFileCsv(file);
              });
          });
        }
      }),
    );
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }

  private defaultFolder(folder?: TFolder): string {
    if (folder) return folder.path === "/" ? "" : folder.path;
    const active = this.app.workspace.getActiveFile();
    if (active?.parent) return active.parent.path === "/" ? "" : active.parent.path;
    return "";
  }

  private async uniquePath(folder: string, name: string): Promise<string> {
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

  async createNewDatabase(folder?: TFolder): Promise<void> {
    const title = await promptText(this.app, {
      title: "新建 One Database",
      label: "数据库名称",
      placeholder: "例如：项目任务",
      value: "",
      submitLabel: "创建数据库",
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
      new Notice(`已创建「${title}」`);
    } catch (error) {
      console.error(error);
      new Notice("创建数据库失败，请检查名称或文件夹权限。");
    }
  }

  async createSample(): Promise<void> {
    try {
      const path = await this.uniquePath("", "One Database 示例");
      const database = createSampleDatabase();
      const file = await this.app.vault.create(path, serializeDatabase(database));
      const leaf = this.app.workspace.getLeaf(true);
      await leaf.openFile(file);
      new Notice("已创建 One Database 示例表格");
    } catch (error) {
      console.error(error);
      new Notice("创建示例数据库失败。");
    }
  }

  private async exportFileCsv(file: TFile): Promise<void> {
    try {
      const leaf = this.app.workspace.getLeaf(true);
      await leaf.openFile(file);
      const view = leaf.view;
      if (view instanceof NotionTableView) view.exportCsv();
    } catch (error) {
      console.error(error);
      new Notice("导出 CSV 失败。");
    }
  }
}
