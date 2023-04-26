import fetch from 'node-fetch';

export class SnapController {

  public async groupSetStream(url: string, method: string, params: string) {

    const body = {'id':1, 'jsonrpc':'2.0', 'method':method,
      'params':params};

    const response = await fetch(url + '/jsonrpc', {
      method: 'post',
      body: JSON.stringify(body),
      headers: {'Content-Type': 'application/json'},
    });
    const data = await response.json();
  }
}