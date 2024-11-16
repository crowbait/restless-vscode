import {ThemeIcon} from 'vscode';
import ListEntry from './ListEntry';

class RESTCall extends ListEntry {
  constructor(
    ...parameters: ConstructorParameters<typeof ListEntry>
  ) {
    super(...parameters);
  }

  contextValue = 'call' as const;
  iconPath = new ThemeIcon('run');

  /** Deletes itself from list only if called without arguments. Otherwise, returns it's ID for bundled call. */
  async delete(called?: boolean): Promise<string> {
    if (!called) {
      this.provider.currentList = this.provider.currentList.filter((x) => x.identifier !== this.identifier);
      this.provider.saveAndUpdate();
    }
    return this.identifier;
  }

  getJsonObject = (): {} => ({
    contextValue: this.contextValue,
    identifier: this.identifier,
    label: this.label,
    folderPath: this.folderPath
  });
}

export default RESTCall;