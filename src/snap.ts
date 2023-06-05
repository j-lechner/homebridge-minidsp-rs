import { resolveNaptr } from 'dns';
import * as homebridge from 'homebridge';
import fetch, { FetchError } from 'node-fetch';

export class SnapController {
  constructor(
    public readonly log: homebridge.Logger,
    public readonly url: string,
  ) {

  }

  public async processCommandList(commandList) {
    setTimeout(async () => {
      const success = await this.sendBatchRequest(this.url, commandList);

      // Try again one more time
      if(!success) {
        setTimeout(async () => {
          await this.sendBatchRequest(this.url, commandList);
        }, 500);
      }
    }, 100);
  }

  public async sendBatchRequest(url: string, commands) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = [] as any;
    let requestID = 0;

    for (const command of commands) {
      const line = {'id': ++requestID, 'jsonrpc':'2.0', 'method':command.method, 'params':command.params};
      body.push(line);
    }
    this.log.info('Request : ' + JSON.stringify(commands));

    try {
      const response = await fetch(url + '/jsonrpc', {
        method: 'post',
        body: JSON.stringify(body),
        headers: {'Content-Type': 'application/json'},
      });

      const responseContent = await response.text();
      this.log.info('Response: ' + responseContent);

      if(response.ok) {
        return true;
      }

    } catch (error) {
      if(error instanceof FetchError) {
        this.log.error(error.message);
      } else {
        this.log.error('Other error');
      }
    }

    return false;
  }
}