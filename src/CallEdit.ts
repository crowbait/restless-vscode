import {readFileSync} from 'fs';
import path from 'path';
import * as vscode from 'vscode';
import RESTCall from './Call';
import {replaceRessources} from './helpers/WebViewHelpers';

export class CallEdit {
  constructor(
    call: RESTCall,
    destructor: () => void
  ) {
    this.call = call;
    this.destructor = destructor;
    this.webview = vscode.window.createWebviewPanel(
      `restless_${this.call.identifier}_edit`,
      this.call.label,
      vscode.ViewColumn.One,
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

  private webviewSendMessage = (message: any): void => {
    this.call.provider.log.appendLine(`Sending to webview edit: ${JSON.stringify(message)}`);
    this.webview.webview.postMessage(message);
  };
  private webviewReceiveMessage = (message: any): void => {
    this.call.provider.log.appendLine(`Receiving from webview edit: ${JSON.stringify(message)}`);
    switch (message.channel) {
      case 'event':
        switch (message.value) {
          case 'ready':
            this.webviewSendMessage({channel: 'call-data', value: this.call.getJsonObject()});
            this.webviewSendMessage({channel: 'transformed-url', value: this.call.transformVariableStrings(this.call.url)});
            break;
        }
        break;

        case 'err':
          this.call.err(message.value);
          break;

        case 'log':
          this.call.provider.log.appendLine(message.value);
          break;
        
        case 'update':
          this.call.updateFromJsonObject(message.value);
          this.webviewSendMessage({channel: 'transformed-url', value: this.call.transformVariableStrings(this.call.url)});
          this.call.provider.saveAndUpdate();
          break;

        case 'run':
          this.call.updateFromJsonObject(message.value);
          this.call.provider.saveAndUpdate();
          this.call.run();
          break;

        default: this.call.err(`Unknown channel on edit: ${message.channel}`); break;
    }
  };

  private getHTML = (): string => {
    const html = this.call.provider.context.asAbsolutePath(path.join('src', 'CallEdit.html'));
    return replaceRessources(readFileSync(html, 'utf8'), this.webview.webview, this.call.provider.context);
  };
}