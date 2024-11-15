import * as vscode from 'vscode';
import commonConst from './commonConst';
import TreeDataProvider from './TreeDataProvider';

export interface IListEntryCore {
  contextValue: 'call' | 'folder'
  identifier: string
  label: string
  folderPath?: string
}

class ListEntry extends vscode.TreeItem {
  constructor(
    provider: TreeDataProvider,
    public readonly json: string | IListEntryCore
  ) {
    const item = typeof json === 'string' ? JSON.parse(json) as ListEntry : json;
    console.log("construct", item);
    super(item.label, item.contextValue === 'call' ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed);
    
    this.provider = provider;

    this.identifier = item.identifier;
    this.contextValue = item.contextValue;
    this.label = item.label;
    this.folderPath = item.folderPath;
    if (item.contextValue === 'call') this.tooltip = 'Call me baby';
  }

  provider: TreeDataProvider;

  contextValue: 'call' | 'folder';
  identifier: string;
  label: string;
  folderPath?: string;
  tooltip?: string | vscode.MarkdownString | undefined = undefined;

  static sorter = (a: ListEntry, b: ListEntry): number => (a.contextValue !== b.contextValue ? a.contextValue === 'folder' ? -1 : 1 : a.label.localeCompare(b.label));
  static createIdentifier = (name: string, arr: IListEntryCore[]): string => {
    let identifier = name + (Math.random() * (16000000 - 1000000) + 1000000).toString(16).substring(0, 6).toUpperCase();
    if (arr.findIndex((x) => x.identifier === identifier) !== -1) identifier = ListEntry.createIdentifier(name, arr);
    return identifier;
  };

  rename = async (): Promise<void> => {
    const name = await vscode.window.showInputBox({
      prompt: 'Enter name',
      value: this.label
    });
    if (!name) return;
    this.label = name;
    const read = JSON.parse(this.provider.context.workspaceState.get(commonConst.listKey) ?? '[]') as IListEntryCore[];
    const foundIndex = read.findIndex((x) => x.identifier === this.identifier);
    if (foundIndex === -1) throw new Error('Could not find rename target!');
    read[foundIndex] = this.getCore();
    await this.provider.context.workspaceState.update(commonConst.listKey, JSON.stringify(read));
    this.provider.refresh();
  };

  reparent = (newParent?: ListEntry): void => {
    console.log('reparent to', newParent, this)
    if (newParent !== undefined && newParent.contextValue !== 'folder') return;
    if (newParent?.identifier === this.identifier) return;
    if (newParent?.folderPath?.includes(this.identifier)) return;
    this.folderPath = newParent ? `${newParent.folderPath ?? ''}/${newParent.identifier}` : undefined;
    const newList = [...this.provider.currentList.filter((x) => x.identifier !== this.identifier), this].map((x) => x.getCore());
    this.provider.context.workspaceState.update(
      commonConst.listKey,
      JSON.stringify(newList)
    );
    console.log(newList)
    this.provider.refresh();
  };


  getCore = (): IListEntryCore => ({
    contextValue: this.contextValue,
    identifier: this.identifier,
    label: this.label,
    folderPath: this.folderPath
  });

  toString = (): string => JSON.stringify(this.getCore());
}

export default ListEntry;