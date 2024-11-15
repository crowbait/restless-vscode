import commonConst from './commonConst';
import ListEntry from './ListEntry';

class RESTCall extends ListEntry {
  constructor(
    ...parameters: ConstructorParameters<typeof ListEntry>
  ) {
    super(...parameters);
  }

  contextValue = 'call' as const;

  async delete(called?: boolean): Promise<string> {
    // TODO delete document
    if (!called) {
      await this.provider.context.workspaceState.update(
        commonConst.listKey,
        JSON.stringify(this.provider.currentList.filter((x) => x.identifier !== this.identifier).map((x) => x.getCore()))
      );
      this.provider.refresh();
    }
    return this.identifier;
  }
}

export default RESTCall;