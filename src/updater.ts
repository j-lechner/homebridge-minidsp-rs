import * as homebridge from 'homebridge';
import fetch, { FetchError } from 'node-fetch';
import { MiniDSPMasterStatus } from './status';

export class MiniDSPUpdater {
  private fetchInProgress = false;
  private updaterEnabled = false;

  private currentMasterStatus: MiniDSPMasterStatus;
  private currentMasterStatusRead = false;

  private targetMasterStatus: MiniDSPMasterStatus;
  private targetMasterStatusAccepted = false;

  constructor(
      public readonly log: homebridge.Logger,
      public readonly url: string,
      status: MiniDSPMasterStatus,
  ) {
    this.currentMasterStatus = new MiniDSPMasterStatus();
    this.targetMasterStatus = status;

    // Heartbeat
    setInterval(() => {
      this.updateMasterStatusIfApporiate();
    }, 750);
  }

  public enableUpdater() {
    this.updaterEnabled = true;
  }

  public disableUpdater() {
    this.updaterEnabled = false;
  }

  public queueMasterStatusUpdate() {
    this.targetMasterStatusAccepted = false;
    this.updateMasterStatusIfApporiate();
  }

  private async updateMasterStatusIfApporiate() {
    if(this.updaterEnabled === true) {
      if(this.currentMasterStatusRead === false) {
        if(!this.fetchInProgress) {
          this.fetchInProgress = true;
          await this.readMasterStatus();
          this.fetchInProgress = false;
        }
      } else if(this.targetMasterStatusAccepted === false) {
        if(!this.fetchInProgress) {
          this.fetchInProgress = true;
          await this.updateMasterStatus();
          this.fetchInProgress = false;
        }
      }
    }
  }

  private async readMasterStatus() {
    this.log.info('readMasterStatus');

    try {
      const response = await fetch(this.url + '/devices/0', {
        timeout: 500,
      });

      if(response.ok) {
        this.log.error('Status response.ok: ' + response.status);

        const data = await response.json();
        const dump = JSON.stringify(data);
        this.log.info('readMasterStatus: ' + dump);

        this.currentMasterStatus = new MiniDSPMasterStatus(data.master);
        this.currentMasterStatusRead = true;

      } else {
        this.log.error('Status !reponse.ok: ' + response.status);

        this.currentMasterStatusRead = false;

        if(response.status === 500) {
          const data = await response.json();
          const dump = JSON.stringify(data);
          this.log.info(dump);
        }
      }
    } catch (error) {
      this.log.error('Other error');
      this.currentMasterStatusRead = false;

      if(error instanceof FetchError) {
        this.log.error(error.message);
      } else {
        this.log.error('Other error');
      }
    }
  }

  private requiredUpdates(current : MiniDSPMasterStatus, target : MiniDSPMasterStatus) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const changes: any = {};

    if(current.dirac !== target.dirac) {
      changes.dirac = target.dirac;
    }
    if(current.mute !== target.mute) {
      changes.mute = target.mute;
    }
    if(current.preset !== target.preset) {
      changes.preset = target.preset;
    }
    if(current.source !== target.source) {
      changes.source = target.source;
    }
    if(current.volume !== target.volume) {
      changes.volume = target.volume;
    }

    return changes;
  }

  private async updateMasterStatus() {
    this.log.info('updateMasterStatus');

    const changes = this.requiredUpdates(this.currentMasterStatus, this.targetMasterStatus);
    if(Object.keys(changes).length === 0) {
      this.log.info('current status already target status -> Not updating');
      this.targetMasterStatusAccepted = true;
      return;
    }

    const timeout = 5000; // Changing presets takes 2-3 seconds

    const body = { master_status: changes };
    const bodyString = JSON.stringify(body);
    this.log.info(bodyString);

    try {
      const response = await fetch(this.url + '/devices/0/config', {
        method: 'post',
        body: bodyString,
        headers: {'Content-Type': 'application/json'},
        timeout: timeout,
      });

      if(response.ok) {
        this.log.error('Status response.ok: ' + response.status);

        this.targetMasterStatusAccepted = true;
        this.currentMasterStatusRead = false;
      } else {
        this.log.error('Status !reponse.ok: ' + response.status);

        this.targetMasterStatusAccepted = false;

        if(response.status === 500) {
          const data = await response.json();
          const dump = JSON.stringify(data);
          this.log.info(dump);
        }
      }
    } catch (error) {
      this.log.error('Other error');
      this.targetMasterStatusAccepted = false;

      if(error instanceof FetchError) {
        this.log.error(error.message);
      } else {
        this.log.error('Other error');
      }
    }
  }
}