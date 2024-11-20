import {readFileSync} from 'fs';
import * as vscode from 'vscode';

export const replaceRessources = (html: string, webview: vscode.Webview, context: vscode.ExtensionContext): string => html
    .replaceAll('{{vscode-elements}}', webview.asWebviewUri(vscode.Uri.file(context.asAbsolutePath('node_modules/@vscode-elements/elements/dist/bundled.js'))).toString())
    .replaceAll('{{vscode-codicon}}', webview.asWebviewUri(vscode.Uri.file(context.asAbsolutePath('node_modules/@vscode/codicons/dist/codicon.css'))).toString())
    .replaceAll('{{json-tree-js}}', webview.asWebviewUri(vscode.Uri.file(context.asAbsolutePath('src/helpers/jsontree.js'))).toString())
    .replaceAll('{{json-tree-css}}', webview.asWebviewUri(vscode.Uri.file(context.asAbsolutePath('src/helpers/jsontree.css'))).toString());

export const replaceHtmlParts = (html: string, context: vscode.ExtensionContext): string => html
    .replaceAll('replace_statusCodes', readFileSync(context.asAbsolutePath('src/helpers/statusCodes.jspart'), 'utf-8'));