import {readFileSync} from 'fs';
import parseEnv from 'parse-dotenv';
import path from 'path';
import * as vscode from 'vscode';
import {CallEdit} from './CallEdit';
import {CallRun} from './CallRun';
import ListEntry from './ListEntry';
import TreeDataProvider from './TreeDataProvider';

const defaults: {
  url: string
  method: 'HEAD' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'TRACE' | 'CONNECT' | 'OPTIONS' | 'SEARCH'
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
    this.provider.log.appendLine(`Running ${this.label}`);
    if (this.runView) {
      this.runView.webview.reveal();
      this.runView.run();
      return;
    }
    this.runView = new CallRun(this, () => this.runView = undefined);
  };

  edit = (): void => {
    this.provider.log.appendLine(`Editing ${this.label}`);
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



  err = (msg: string): void => {
    this.provider.log.appendLine(msg);
    vscode.window.showErrorMessage(msg);
  };

  transformVariableStrings = (str: string): string => {
    const matches = /{{([^\s]+)\s"([^"]+)"(?:\s"([^"]+)")?}}/g.exec(str);
    const source = matches && matches[1];
    const arg1 = matches && matches[2];
    const arg2 = matches && matches[3];

    if (matches && source) {
      switch (source) {
        case 'file':
          if (!arg1) {
            this.err('File variable requires an argument');
            return str;
          }
          const filePath = path.join(vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '', arg1);
          str = str.replaceAll(matches[0], readFileSync(filePath, 'utf8'));
          break;

        case 'env':
          if (!arg1) {
            this.err('Env variable requires an argument');
            return str;
          }
          str = str.replaceAll(matches[0], process.env[arg1] || '');
          break;

        case '.env':
          if (!arg1 || !arg2) {
            this.err('.env variable requires 2 arguments');
            return str;
          }
          const dotenvPath = path.join(vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '', arg1);
          const parsed = parseEnv(dotenvPath);
          str = str.replaceAll(matches[0], parsed[arg2] || '');
          break;
      }
      return this.transformVariableStrings(str);
    } else return str;
  };

  constructAuthHeader = (str: string): string => {
    const matches = /{{([^\s]*)\s([^"\s]+)(?:\s"([^"]+|(?:{{.*?}}))")?(?:\s"([^"]+|(?:{{.*}}))")?}}/g.exec(str);
    if (matches && matches[1] === 'auth') {
      switch (matches[2]) {
        case 'basic':
          str = str.replaceAll(matches[0], `Basic ${Buffer.from(this.transformVariableStrings(matches[3]) + ':' + this.transformVariableStrings(matches[4])).toString('base64')}`);
          break;
        case 'bearer':
          str = str.replaceAll(matches[0], `Bearer ${this.transformVariableStrings(matches[3])}`);
          break;
      }
      return str;
    }
    return this.transformVariableStrings(str);
  };
}

export default RESTCall;