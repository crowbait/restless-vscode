import * as vscode from 'vscode';
import RESTCall from './Call';
import Folder from './Folder';
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
    const newIdentifier = ListEntry.createIdentifier(name, this.provider.currentList);

    const foundIndex = this.provider.currentList.findIndex((x) => x.identifier === this.identifier);
    if (foundIndex === -1) throw new Error('Could not find rename target!');

    if (this.contextValue === 'folder') {
      this.provider.currentList.forEach((x, i) => {
        if (x.folderPath) this.provider.currentList[i].folderPath = x.folderPath.replaceAll(this.identifier, newIdentifier);
      });
    }

    this.label = name;
    this.identifier = newIdentifier;

    this.provider.currentList[foundIndex] = this as unknown as RESTCall | Folder;
    this.provider.saveAndUpdate();
  };

  reparent = (newParent?: ListEntry): void => {
    if (newParent !== undefined && newParent.contextValue !== 'folder') return;
    if (newParent?.identifier === this.identifier) return;
    if (newParent?.folderPath?.includes(this.identifier)) return;
    this.folderPath = newParent ? `${newParent.folderPath ?? ''}/${newParent.identifier}` : undefined;
    this.provider.currentList = [...this.provider.currentList.filter((x) => x.identifier !== this.identifier), (this as unknown as RESTCall | Folder)];
    this.provider.saveAndUpdate();
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