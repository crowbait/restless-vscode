import * as vscode from 'vscode';
import packageJson from '../package.json';
import RESTCall, {JSONCallObject} from './Call';
import RESTCall_Temporary, {tempCallVscodeStateKey} from './Call-Temporary';
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
  context.globalState.setKeysForSync([tempCallVscodeStateKey]);
	let tempCall: RESTCall_Temporary | undefined = undefined;

	const getListEntry = (identifier: ListEntry['identifier']): RESTCall | Folder | undefined => treeProvider.currentList.find((x) => x.identifier === identifier);

	context.subscriptions.push(vscode.commands.registerCommand('restless-http-rest-client.addCall', async (e?: Folder) => {
		let ret: string | undefined = undefined;
		ret = await treeProvider.addItemToList('call', e);
		return ret;
	}));
	context.subscriptions.push(vscode.commands.registerCommand('restless-http-rest-client.addFolder', async (e?: Folder) => {
		let ret: string | undefined = undefined;
		ret = await treeProvider.addItemToList('folder', e);
		return ret;
	}));
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
	context.subscriptions.push(vscode.commands.registerCommand('restless-http-rest-client.duplicateCall', (e) => {
		const call = getListEntry(e.identifier);
		if (call && call.contextValue === 'call') call.duplicate();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('restless-http-rest-client.refresh', () => treeProvider.refreshFromFile()));
	context.subscriptions.push(vscode.commands.registerCommand('restless-http-rest-client.openTemporary', () => {
		const openCall = (call: RESTCall_Temporary): void => call.edit();
		if (tempCall) {
			openCall(tempCall);
		} else {
			const readCall = context.globalState.get<JSONCallObject>(tempCallVscodeStateKey);
			tempCall = new RESTCall_Temporary(context, log, readCall);
			openCall(tempCall);
		}
	}));

	context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => {
		treeProvider.refreshFromFile();
	}));

	const fileSystemWatcher = vscode.workspace.createFileSystemWatcher(treeProvider.filepath);
	fileSystemWatcher.onDidChange(treeProvider.refreshFromFile);
	context.subscriptions.push(fileSystemWatcher);
}

// This method is called when your extension is deactivated
export function deactivate(): void {}
