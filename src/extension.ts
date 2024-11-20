import * as vscode from 'vscode';
import packageJson from '../package.json';
import RESTCall from './Call';
import Folder from './Folder';
import ListEntry from './ListEntry';
import TreeDataProvider from './TreeDataProvider';

export function activate(context: vscode.ExtensionContext): void {
	const log = vscode.window.createOutputChannel('restless-http-rest-client');
	log.appendLine(`${packageJson.name} running v.${packageJson.version}`);

	const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
	if (!rootPath) return;

	const treeProvider = new TreeDataProvider(context, log);

	const getListEntry = (identifier: ListEntry['identifier']): RESTCall | Folder | undefined => treeProvider.currentList.find((x) => x.identifier === identifier);

	context.subscriptions.push(vscode.commands.registerCommand('restless-http-rest-client.addCall', (e?: Folder) => treeProvider.addItemToList('call', e)));
	context.subscriptions.push(vscode.commands.registerCommand('restless-http-rest-client.addFolder', (e?: Folder) => treeProvider.addItemToList('folder', e)));
	context.subscriptions.push(vscode.commands.registerCommand('restless-http-rest-client.renameEntry', (e) => {
		const element = getListEntry(e.identifier);
		if (element) element.rename();
	}));
	context.subscriptions.push(vscode.commands.registerCommand('restless-http-rest-client.deleteEntry', (e) => {
		const element = getListEntry(e.identifier);
		if (element) element.delete();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('restless-http-rest-client.runCall', (e) => {
		const call = getListEntry(e.identifier);
		if (call && call.contextValue === 'call') call.run();
	}));
	context.subscriptions.push(vscode.commands.registerCommand('restless-http-rest-client.editCall', (e) => {
		const call = getListEntry(e.identifier);
		if (call && call.contextValue === 'call') call.edit();
	}));

	context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => {
		treeProvider.refresh();
	}));
}

// This method is called when your extension is deactivated
export function deactivate(): void {}
