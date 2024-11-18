import * as vscode from 'vscode';
import RESTCall from './Call';

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
  }

  call: RESTCall;
  destructor: () => void;
  webview: vscode.WebviewPanel;
}