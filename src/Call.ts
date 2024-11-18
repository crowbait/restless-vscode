import * as vscode from 'vscode';
import {CallEdit} from './CallEdit';
import {CallRun} from './CallRun';
import ListEntry from './ListEntry';
import TreeDataProvider from './TreeDataProvider';

const defaults: {
  url: string
  method: 'HEAD' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'TRACE' | 'CONNECT' | 'OPTIONS'
  auth: string
  headers: Array<{header: string, value: string}>
  body: string
} = {
  url: '',
  method: 'GET',
  auth: '',
  headers: [{header: 'Content-Type', value: 'application/json'}],
  body: ''
};
export type JSONCallObject = {
  contextValue: 'call'
  identifier: string
  label: string
  folderPath?: string
} & typeof defaults;

class RESTCall extends ListEntry {
  constructor(
    provider: TreeDataProvider,
    json: string | JSONCallObject
  ) {
    super(provider, json);
    const item = typeof json === 'string' ? JSON.parse(json) as JSONCallObject : json;
    this.updateFromJsonObject(item);
    if (this.url) this.tooltip = `${this.method}: ${this.url}`;
  }

  contextValue = 'call' as const;
  iconPath = new vscode.ThemeIcon('globe');
  command = {title: 'Edit', command: 'restless-http-rest-client.editCall', arguments: [this]};
  editView: CallEdit | undefined;
  runView: CallRun | undefined;

  url = defaults.url;
  method: JSONCallObject['method'] = defaults.method;
  auth = defaults.auth;
  headers = defaults.headers;
  body = defaults.body;

  run = (): void => {
    console.log(`Running ${this.label}`);
    if (this.runView) {
      this.runView.webview.reveal();
      return;
    }
    this.runView = new CallRun(this, () => this.runView = undefined);
  };

  edit = (): void => {
    console.log(`Editing ${this.label}`);
    if (this.editView) {
      this.editView.webview.reveal();
      return;
    }
    this.editView = new CallEdit(this, () => this.editView = undefined);
  };

  /** Deletes itself from list only if called without arguments. Otherwise, returns it's ID for bundled call. */
  async delete(called?: boolean): Promise<string> {
    if (!called) {
      this.provider.currentList = this.provider.currentList.filter((x) => x.identifier !== this.identifier);
      this.provider.saveAndUpdate();
    }
    return this.identifier;
  }

  getJsonObject = (): JSONCallObject => ({
    contextValue: this.contextValue,
    identifier: this.identifier,
    label: this.label,
    folderPath: this.folderPath,

    url: this.url ?? defaults.url,
    method: this.method ?? defaults.method,
    auth: this.auth ?? defaults.auth,
    headers: !this.headers ? defaults.headers : this.headers.filter((x) => x.header && x.value),
    body: this.body ?? defaults.body
  });
  updateFromJsonObject = (json: Partial<JSONCallObject>): void => {
    this.url = json.url ?? defaults.url;
    this.method = json.method ?? defaults.method;
    this.auth = json.auth ?? defaults.auth;
    this.headers = json.headers ?? defaults.headers;
    this.body = json.body ?? defaults.body;
  };
}

export default RESTCall;