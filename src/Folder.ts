import {ThemeIcon} from 'vscode';
import RESTCall from './Call';
import ListEntry, {IListEntryCore} from './ListEntry';

class Folder extends ListEntry {
  constructor(
    ...parameters: ConstructorParameters<typeof ListEntry>
  ) {
    super(...parameters);
  }

  contextValue = 'folder' as const;
  iconPath = ThemeIcon.Folder;

  getChildren = (): Array<RESTCall | Folder> => {
    const children = this.provider.currentList
      .filter((x) => x.folderPath && x.folderPath.substring(x.folderPath.lastIndexOf('/') + 1) === this.identifier)
      .map((x) => x.contextValue === 'call' ? new RESTCall(this.provider, x) : new Folder(this.provider, x));
    children.sort((a, b) => a.label.localeCompare(b.label));
    return children;
  };

  delete = async (called?: boolean): Promise<string[]> => {
    const deleted: string[] = [this.identifier];
    const children = this.getChildren();
    if (!children.length) this.getChildren();
    for (let i = 0; i < children.length; i++) {
      const res = await children[i].delete(true);
      deleted.push(...(Array.isArray(res) ? res : [res]));
    }
    if (!called) {
      this.provider.currentList = this.provider.currentList.filter((x) => !deleted.includes(x.identifier));
      this.provider.saveAndUpdate();
    }
    return deleted;
  };

  getJsonObject = (): IListEntryCore => ({
    contextValue: this.contextValue,
    identifier: this.identifier,
    label: this.label,
    folderPath: this.folderPath
  });
}

export default Folder;