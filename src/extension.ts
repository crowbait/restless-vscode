import * as vscode from 'vscode';
import packageJson from '../package.json';
import RESTCall from './Call';
import Folder from './Folder';
import ListEntry from './ListEntry';
import TreeDataProvider from './TreeDataProvider';

export function activate(context: vscode.ExtensionContext): void {
	console.log(`${packageJson.name} running v.${packageJson.version}`);

	// console.log('Resetting all', context.workspaceState.update(commonConst.listKey, undefined));

	const treeProvider = new TreeDataProvider(context);

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
}

// This method is called when your extension is deactivated
export function deactivate(): void {}
