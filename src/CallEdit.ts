import {readFileSync} from 'fs';
import path from 'path';
import * as vscode from 'vscode';
import RESTCall from './Call';
import RESTCall_Temporary from './Call-Temporary';
import {replaceRessources} from './helpers/WebViewHelpers';

export class CallEdit {
  constructor(
    call: RESTCall | RESTCall_Temporary,
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

  private webviewSendMessage = (message: any): void => {
    this.log.appendLine(`Sending to webview edit: ${JSON.stringify(message)}`);
    this.webview.webview.postMessage(message);
  };
  private webviewReceiveMessage = (message: any): void => {
    this.log.appendLine(`Receiving from webview edit: ${JSON.stringify(message)}`);
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
          this.log.appendLine(message.value);
          break;
        
        case 'update':
          this.call.updateFromJsonObject(message.value);
          this.webviewSendMessage({channel: 'transformed-url', value: this.call.transformVariableStrings(this.call.url)});
          this.call.saveAndUpdate();
          break;

        case 'run':
          this.call.updateFromJsonObject(message.value);
          this.call.saveAndUpdate();
          this.call.run();
          break;

        default: this.call.err(`Unknown channel on edit: ${message.channel}`); break;
    }
  };

  private getHTML = (context: vscode.ExtensionContext): string => {
    const html = context.asAbsolutePath(path.join('src', 'CallEdit.html'));
    return replaceRessources(readFileSync(html, 'utf8'), this.webview.webview, context);
  };
}