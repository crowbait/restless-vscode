import {readFileSync} from 'fs';
import path from 'path';
import * as vscode from 'vscode';
import RESTCall from './Call';
import {replaceHtmlParts, replaceRessources} from './helpers/WebViewHelpers';

export class CallRun {
  constructor(
    call: RESTCall,
    destructor: () => void
  ) {
    this.call = call;
    this.destructor = destructor;
    this.webview = vscode.window.createWebviewPanel(
      `restless_${this.call.identifier}_run`,
      `Run: ${this.call.label}`,
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    this.webview.onDidDispose(this.destructor);
    this.webview.webview.html = this.getHTML();
    this.webview.webview.onDidReceiveMessage(this.webviewReceiveMessage);
  }

  call: RESTCall;
  destructor: () => void;
  webview: vscode.WebviewPanel;

  run = (): void => {
    const data = this.call.getJsonObject();
    data.auth = this.call.constructAuthHeader(data.auth);
    data.body = this.call.transformVariableStrings(data.body);
    data.headers = data.headers.map((x) => ({header: x.header, value: this.call.transformVariableStrings(x.value)}));
    data.url = this.call.transformVariableStrings(data.url);
    this.webviewSendMessage({channel: 'call-data', value: data});
  };

  private webviewSendMessage = (message: any): void => {
    this.call.provider.log.appendLine(`Sending to webview run: ${JSON.stringify(message)}`);
    this.webview.webview.postMessage(message);
  };
  private webviewReceiveMessage = (message: any): void => {
    this.call.provider.log.appendLine(`Receiving from webview edit: ${JSON.stringify(message)}`);
    switch (message.channel) {
      case 'event':
        switch (message.value) {
          case 'ready':
            this.run();
            break;
        }
        break;

        case 'err':
          this.call.err(message.value);
          break;

        case 'log':
          this.call.provider.log.appendLine(message.value);
          break;

        default: this.call.err(`Unknown channel on run: ${message.channel}`); break;
    }
  };

  private getHTML = (): string => {
    let html = readFileSync(this.call.provider.context.asAbsolutePath(path.join('src', 'CallRun.html')), 'utf-8');
    html = replaceRessources(html, this.webview.webview, this.call.provider.context);
    html = replaceHtmlParts(html, this.call.provider.context);
    return html;
  };
}