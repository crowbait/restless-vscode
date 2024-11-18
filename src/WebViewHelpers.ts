import * as vscode from 'vscode';

export const replaceRessources = (html: string, webview: vscode.Webview, context: vscode.ExtensionContext): string => html
    .replaceAll('{{vscode-elements}}', webview.asWebviewUri(vscode.Uri.file(context.asAbsolutePath('node_modules/@vscode-elements/elements/dist/bundled.js'))).toString())
    .replaceAll('{{vscode-codicon}}', webview.asWebviewUri(vscode.Uri.file(context.asAbsolutePath('node_modules/@vscode/codicons/dist/codicon.css'))).toString());