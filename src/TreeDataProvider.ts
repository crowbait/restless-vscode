import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs';
import path, {dirname} from 'path';
import * as vscode from 'vscode';
import RESTCall, {JSONCallObject} from './Call';
import Folder from './Folder';
import ListEntry, {IListEntryCore} from './ListEntry';

class TreeDataProvider implements vscode.TreeDataProvider<ListEntry>, vscode.TreeDragAndDropController<ListEntry> {
  constructor(
    context: vscode.ExtensionContext,
    log: vscode.OutputChannel
  ) {
    this.log = log;
    log.appendLine('TreeDataProvider created');

    this.context = context;
    this.filepath = path.join(vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '', '.vscode', 'restless.json');
    log.appendLine(`Loading from filepath: ${this.filepath}`);
    const view = vscode.window.createTreeView('restlessHttpRestClientView', {
			treeDataProvider: this,
			showCollapseAll: true,
			canSelectMany: false,
			dragAndDropController: this
		});
    context.subscriptions.push(view);
  }

  log: vscode.OutputChannel;
  context: vscode.ExtensionContext;
  filepath: string;
  currentList: Array<RESTCall | Folder> = [];
  lastUpdate: number = Date.now();

  dropMimeTypes = ['application/vnd.code.tree.restlessHttpRestClientView'];
	dragMimeTypes = [];
  private _onDidChangeTreeData: vscode.EventEmitter<ListEntry | undefined | void> = new vscode.EventEmitter<ListEntry | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<ListEntry | undefined | void> = this._onDidChangeTreeData.event;

  refresh = (): void => {
    this._onDidChangeTreeData.fire();
  };

  refreshFromFile = (): void => {
    if (Date.now() - this.lastUpdate > 500) { // only refresh if last update was at least half a second ago to not get into a loop with itself
      this.lastUpdate = Date.now();
      this.currentList = [];
      this.refresh();
    }
  };

  save = (): void => {
    mkdirSync(dirname(this.filepath), {recursive: true});
    writeFileSync(this.filepath, JSON.stringify(this.currentList.map((x) => x.getJsonObject()), null, 2), 'utf-8');
    this.lastUpdate = Date.now(); // only refresh if last update was at least half a second ago to not get into a loop with itself
  };
  saveAndUpdate = (): void => {
    this.save();
    this.refresh();
  };
  getTreeItem = (element: ListEntry): vscode.TreeItem => element;
  getChildren = (element?: ListEntry): Thenable<ListEntry[]> => {
    if (this.currentList.length === 0) {
      const stored = JSON.parse(existsSync(this.filepath) ? readFileSync(this.filepath, 'utf-8') : '[]') as IListEntryCore[];
      const transformed = stored.map((x) => x.contextValue === 'call' ? new RESTCall(this, x as JSONCallObject) : new Folder(this, x));
      transformed.sort(ListEntry.sorter);
      this.log.appendLine(`Read saved list: ${JSON.stringify(stored)}`);
      this.currentList = transformed;
    }
    if (element) {
      if (element.contextValue !== 'folder') return Promise.resolve([]);
      const ret = new Folder(this, element).getChildren();
      ret.sort(ListEntry.sorter);
      return Promise.resolve(ret);
    }
    return Promise.resolve(this.currentList.filter((x) => !x.folderPath));
  };

  addItemToList = async (contextValue: ListEntry['contextValue'], folder?: Folder): Promise<string | undefined> => {
    const name = await vscode.window.showInputBox({prompt: 'Enter name'});
    if (!name) return undefined;
    const data: IListEntryCore = {
      contextValue: contextValue,
      identifier: ListEntry.createIdentifier(name, this.currentList),
      label: name,
      folderPath: folder?.contextValue !== 'folder' ? undefined : folder ? `${folder.folderPath ?? ''}/${folder.identifier}` : undefined
    };
    const item = contextValue === 'call' ? new RESTCall(this, data as JSONCallObject) : new Folder(this, data);
    this.currentList = [...this.currentList, item];
    this.currentList.sort(ListEntry.sorter);
    this.saveAndUpdate();
    if (item.contextValue === 'call') item.edit();
    return name;
  };

  handleDrop = async (target: ListEntry | undefined, sources: vscode.DataTransfer): Promise<void> => {
    const source = sources.get('application/vnd.code.tree.restlessHttpRestClientView')?.value[0];
    (source.contextValue === 'call' ? new RESTCall(this, source) : new Folder(this, source)).reparent(target);
  };
  handleDrag = async (source: readonly ListEntry[], dataTransfer: vscode.DataTransfer): Promise<void> => {
    dataTransfer.set('application/vnd.code.tree.restlessHttpRestClientView', new vscode.DataTransferItem(source.map((x) => x.getCore())));
  };
};

export default TreeDataProvider;