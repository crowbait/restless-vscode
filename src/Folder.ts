import RESTCall from './Call';
import commonConst from './commonConst';
import ListEntry from './ListEntry';

class Folder extends ListEntry {
  constructor(
    ...parameters: ConstructorParameters<typeof ListEntry>
  ) {
    super(...parameters);
  }

  contextValue = 'folder' as const;
  children: Array<RESTCall | Folder> = [];

  getChildren = (): Array<RESTCall | Folder> => {
    const children = this.provider.currentList
      .filter((x) => x.folderPath && x.folderPath.substring(x.folderPath.lastIndexOf('/') + 1) === this.identifier)
      .map((x) => x.contextValue === 'call' ? new RESTCall(this.provider, x) : new Folder(this.provider, x));
    children.sort((a, b) => a.label.localeCompare(b.label));
    this.children = children;
    return children;
  };

  delete = async (called?: boolean): Promise<string[]> => {
    const deleted: string[] = [this.identifier];
    if (!this.children.length) this.getChildren();
    for (let i = 0; i < this.children.length; i++) {
      const res = await this.children[i].delete(true);
      deleted.push(...(Array.isArray(res) ? res : [res]));
    }
    if (!called) {
      await this.provider.context.workspaceState.update(
        commonConst.listKey,
        JSON.stringify(
          this.provider.currentList
            .filter((x) => !deleted.includes(x.identifier))
            .map((x) => x.getCore())
          )
      );
      this.provider.refresh();
    }
    return deleted;
  };
}

export default Folder;