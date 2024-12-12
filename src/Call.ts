import {readFileSync} from 'fs';
import parseEnv from 'parse-dotenv';
import path from 'path';
import * as vscode from 'vscode';
import {CallEdit} from './CallEdit';
import {CallRun} from './CallRun';
import ListEntry from './ListEntry';
import TreeDataProvider from './TreeDataProvider';

export const callDefaults: {
  url: string
  method: 'HEAD' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'TRACE' | 'CONNECT' | 'OPTIONS' | 'SEARCH'
  auth: string
  headers: Array<{header: string, value: string}>
  body: string
  bustCache: boolean
} = {
  url: '',
  method: 'GET',
  auth: '',
  headers: [{header: 'Content-Type', value: 'application/json'}],
  body: '',
  bustCache: false
};
export type JSONCallObject = {
  contextValue: 'call'
  identifier: string
  label: string
  folderPath?: string
} & typeof callDefaults;

class RESTCall extends ListEntry {
  constructor(
    provider: TreeDataProvider,
    json: string | JSONCallObject
  ) {
    super(provider, json);
    const item = typeof json === 'string' ? JSON.parse(json) as JSONCallObject : json;
    this.updateFromJsonObject(item);
    if (this.url) this.tooltip = `${this.method}: ${this.url}`;
    this.setIcon();
  }

  contextValue = 'call' as const;
  iconPath: string | vscode.ThemeIcon = '';
  command = {title: 'Edit', command: 'restless-http-rest-client.editCall', arguments: [this]};
  editView: CallEdit | undefined;
  runView: CallRun | undefined;

  url = callDefaults.url;
  method: JSONCallObject['method'] = callDefaults.method;
  auth = callDefaults.auth;
  headers = callDefaults.headers;
  body = callDefaults.body;
  bustCache = callDefaults.bustCache;

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

  async duplicate(): Promise<void> {
    const newName = await vscode.window.showInputBox({prompt: 'Enter name', value: this.label});
    if (!newName) return undefined;
    const newItem = new RESTCall(this.provider, {
      ...this.getJsonObject(),
      label: newName,
      identifier: ListEntry.createIdentifier(newName, this.provider.currentList)
    });
    this.provider.currentList.push(newItem);
    this.provider.saveAndUpdate();
  }

  getJsonObject = (): JSONCallObject => ({
    contextValue: this.contextValue,
    identifier: this.identifier,
    label: this.label,
    folderPath: this.folderPath,

    url: this.url ?? callDefaults.url,
    method: this.method ?? callDefaults.method,
    auth: this.auth ?? callDefaults.auth,
    headers: !this.headers ? callDefaults.headers : this.headers.filter((x) => x.header && x.value),
    body: this.body ?? callDefaults.body,
    bustCache: this.bustCache ?? callDefaults.bustCache
  });
  updateFromJsonObject = (json: Partial<JSONCallObject>): void => {
    this.url = json.url ?? callDefaults.url;
    this.method = json.method ?? callDefaults.method;
    this.auth = json.auth ?? callDefaults.auth;
    this.headers = json.headers ?? callDefaults.headers;
    this.body = json.body ?? callDefaults.body;
    this.bustCache = json.bustCache ?? callDefaults.bustCache;
    this.setIcon();
  };
  saveAndUpdate = (): void => this.provider.saveAndUpdate();



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

  setIcon = (): void => {
    this.iconPath = this.provider.context.asAbsolutePath(`ressources/method_${this.method.toLowerCase()}.svg`);
  };
}

export default RESTCall;