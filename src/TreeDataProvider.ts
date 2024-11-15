import * as vscode from 'vscode';
import RESTCall from './Call';
import Folder from './Folder';
import ListEntry, {IListEntryCore} from './ListEntry';
import commonConst from './commonConst';

class TreeDataProvider implements vscode.TreeDataProvider<ListEntry>, vscode.TreeDragAndDropController<ListEntry> {
  constructor(
    context: vscode.ExtensionContext
  ) {
    this.context = context;
    const view = vscode.window.createTreeView('restlessHttpRestClientView', {
			treeDataProvider: this,
			showCollapseAll: true,
			canSelectMany: false,
			dragAndDropController: this
		});
    context.subscriptions.push(view);
  }

  context: vscode.ExtensionContext;
  currentList: Array<RESTCall | Folder> = [];

  dropMimeTypes = ['application/vnd.code.tree.restlessHttpRestClientView'];
	dragMimeTypes = [];
  private _onDidChangeTreeData: vscode.EventEmitter<ListEntry | undefined | void> = new vscode.EventEmitter<ListEntry | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<ListEntry | undefined | void> = this._onDidChangeTreeData.event;

  refresh = (): void => {
    this._onDidChangeTreeData.fire();
  };

  getTreeItem = (element: ListEntry): vscode.TreeItem => element;

  getChildren = (element?: ListEntry): Thenable<ListEntry[]> => {
    if (element) {
      if (element.contextValue !== 'folder') return Promise.resolve([]);
      const ret = new Folder(this, element).getChildren();
      ret.sort(ListEntry.sorter);
      return Promise.resolve(ret);
    }
    const stored = JSON.parse(this.context.workspaceState.get(commonConst.listKey) ?? '[]') as IListEntryCore[];
    console.info('Read:', stored);
    let ret: typeof this.currentList = stored.map((x) => x.contextValue === 'call' ? new RESTCall(this, x) : new Folder(this, x));
    this.currentList = ret;
    ret = ret.filter((x) => !x.folderPath);
    ret.sort(ListEntry.sorter);
    return Promise.resolve(ret);
  };

  addItemToList = async (contextValue: ListEntry['contextValue'], folder?: Folder): Promise<void> => {
    const name = await vscode.window.showInputBox({prompt: 'Enter name'});
    if (!name) return undefined as any;
    const read = JSON.parse(this.context.workspaceState.get(commonConst.listKey) ?? '[]') as IListEntryCore[];
    const data: IListEntryCore = {
      contextValue: contextValue,
      identifier: ListEntry.createIdentifier(name, read),
      label: name,
      folderPath: folder ? `${folder.folderPath ?? ''}/${folder.identifier}` : undefined
    };
    const item = contextValue === 'call' ? new RESTCall(this, data) : new Folder(this, data);
    await this.context.workspaceState.update(commonConst.listKey, JSON.stringify([...read, item.getCore()]));
    this.refresh();
  };

  handleDrop = async (target: ListEntry | undefined, sources: vscode.DataTransfer): Promise<void> => {
    (new ListEntry(this, sources.get('application/vnd.code.tree.restlessHttpRestClientView')?.value[0])).reparent(target);
  }
  handleDrag = async (source: readonly ListEntry[], dataTransfer: vscode.DataTransfer): Promise<void> => {
    dataTransfer.set('application/vnd.code.tree.restlessHttpRestClientView', new vscode.DataTransferItem(source.map((x) => x.getCore())));
  }
};

export default TreeDataProvider;