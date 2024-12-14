import {readFileSync} from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import * as vscode from 'vscode';
import RESTCall, {JSONCallObject} from './Call';
import RESTCall_Temporary from './Call-Temporary';
import {replaceRessources} from './helpers/WebViewHelpers';
import statusCodes from './helpers/statusCodes';

interface CallResultData {
  status: number
  statusMessage: string
  milliseconds: number
  request: {
    headers: JSONCallObject['headers']
    body: string
  }
  headers: JSONCallObject['headers']
  body: string
}

export class CallRun {
  constructor(
    /** A reference to the Call / Temporary Call that owns this Run */
    call: RESTCall | RESTCall_Temporary,
    /** Callback to execute when the run (webview) is destroyed */
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
    this.webview.onDidDispose(() => {
      if (this.request) this.request.destroy();
      this.destructor();
    });
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

  request: http.ClientRequest | undefined;
  preparedData: JSONCallObject | undefined;

  /**
   * Prepares stored data to be used in run, eg. variable substitution
   */
  prepareRun = (): void => {
    const createCachebuster = (url: string): string => {
      let ret = '';
      if (url.includes('?')) {
        ret = `${url}&${Date.now().toString().substring(7)}`;
      } else ret = `${url}?${Date.now().toString().substring(7)}`;
      return ret;
    };
    this.preparedData = this.call.getJsonObject();
    this.preparedData.auth = this.call.constructAuthHeader(this.preparedData.auth);
    if (this.preparedData.auth) this.preparedData.headers.push({header: 'Authorization', value: this.preparedData.auth});
    this.preparedData.headers = this.preparedData.headers.map((x) => ({header: x.header.toLowerCase(), value: this.call.transformVariableStrings(x.value)}));
    this.preparedData.body = this.call.transformVariableStrings(this.preparedData.body);
    this.preparedData.url = this.call.transformVariableStrings(this.preparedData.url);
    if (this.call.bustCache) this.preparedData.url = createCachebuster(this.preparedData.url);
    this.webviewSendMessage({channel: 'call-data', value: this.preparedData});
  };

  /**
   * Creates an HTTP(S) request, runs it and provides parsed response data to the webview
   */
  run = (): void => {
    if (!this.preparedData) return this.call.err('Prepared data empty on call. This is a bug.');
    let start: number | undefined;
    
    const options: http.RequestOptions = {
      method: this.preparedData.method,
      auth: undefined,
      headers: this.preparedData.headers.reduce((sum, cur) => {sum[cur.header] = cur.value; return sum;}, {} as Record<string, string>)
    };
    const callback = (res: http.IncomingMessage): void => {
      const done = Date.now();
      const ret: CallResultData = {
        status: res.statusCode ?? -1,
        statusMessage: statusCodes[res.statusCode ?? 0]?.message ?? '',
        milliseconds: done - start!,
        request: {
          headers: this.preparedData!.headers,
          body: this.preparedData!.body
        },
        headers: Object.entries(res.headers).map((h) => ({header: h[0], value: Array.isArray(h[1]) ? h[1].join(', ') : h[1] ?? ''})),
        body: ''
      };
      res.setEncoding('utf8');
      res.on('data', (chunk) => {if (typeof chunk === 'string') ret.body += chunk; return;});
      res.on('end', () => this.webviewSendMessage({channel: 'run-success', value: ret}));
    };

    try {
      if (this.preparedData?.url.startsWith('http://')) {
        this.request = http.request(this.preparedData.url, options, callback);
      } else {
        this.request = https.request(this.preparedData.url, options, callback);
      }

      if (this.preparedData.body) this.request.write(this.preparedData.body);

      this.request.on('error', (err) => this.webviewSendMessage({channel: 'run-err', value: err.message}));
      start = Date.now();
      this.request.end();
    } catch (err) {
      this.webviewSendMessage({channel: 'run-err', value: (err as Error).message});
    }
  };

  /**
   * Posts a message to the webview
   * @param message channel: channel name; value: any serializable object
   */
  private webviewSendMessage = (message: {channel: string, value: any}): void => {
    this.log.appendLine(`Sending to webview run: ${JSON.stringify(message.channel)}`);
    this.webview.webview.postMessage(message);
  };
  /**
   * Called when the webview posts a message. Param *should* adhere to the priciples set in `webviewSendMessage`, but
   * this cannot be guaranteed.
   */
  private webviewReceiveMessage = (message: any): void => {
    this.log.appendLine(`Receiving from webview edit: ${JSON.stringify(message.channel)}`);
    switch (message.channel) {
      case 'event':
        switch (message.value) {
          case 'ready':
            this.prepareRun();
            break;
          case 'prepared':
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

  /**
   * Gets and prepares HTML to use for the webview
   * @param context Context of the extension, used to generate paths
   * @returns HTML
   */
  private getHTML = (context: vscode.ExtensionContext): string => {
    let html = readFileSync(context.asAbsolutePath(path.join('src', 'CallRun.html')), 'utf-8');
    html = replaceRessources(html, this.webview.webview, context);
    return html;
  };
}