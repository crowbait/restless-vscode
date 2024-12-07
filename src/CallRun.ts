import {readFileSync} from 'fs';
import path from 'path';
import * as vscode from 'vscode';
import RESTCall from './Call';
import RESTCall_Temporary from './Call-Temporary';
import {replaceHtmlParts, replaceRessources} from './helpers/WebViewHelpers';

export class CallRun {
  constructor(
    call: RESTCall | RESTCall_Temporary,
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
    this.webview.webview.onDidReceiveMessage(this.webviewReceiveMessage);
    if (call.identifier === 'call_temporary') {
      this.webview.webview.html = this.getHTML((call as RESTCall_Temporary).context);
      this.log = (call as RESTCall_Temporary).log;
    } else {
      this.webview.webview.html = this.getHTML((call as RESTCall).provider.context);
      this.log = (call as RESTCall).provider.log;
    }
  }

  call: RESTCall | RESTCall_Temporary;
  log: vscode.OutputChannel;
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
    this.log.appendLine(`Sending to webview run: ${JSON.stringify(message)}`);
    this.webview.webview.postMessage(message);
  };
  private webviewReceiveMessage = (message: any): void => {
    this.log.appendLine(`Receiving from webview edit: ${JSON.stringify(message)}`);
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
          this.log.appendLine(message.value);
          break;

        default: this.call.err(`Unknown channel on run: ${message.channel}`); break;
    }
  };

  private getHTML = (context: vscode.ExtensionContext): string => {
    let html = readFileSync(context.asAbsolutePath(path.join('src', 'CallRun.html')), 'utf-8');
    html = replaceRessources(html, this.webview.webview, context);
    html = replaceHtmlParts(html, context);
    return html;
  };
}