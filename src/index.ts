import * as homebridge from 'homebridge';
import { MiniDSPMasterStatus } from './status';
import { MiniDSPUpdater } from './updater';
import { MiniDSPAccessory } from './accessory';

const PLATFORM_NAME = 'MiniDSPHomebridgePlugin';

export = (api: homebridge.API) => {
  api.registerPlatform(PLATFORM_NAME, MiniDSPPlatform);
};

class MiniDSPPlatform implements homebridge.DynamicPlatformPlugin {
  public readonly Service: typeof homebridge.Service = this.api.hap.Service;
  public readonly Characteristic: typeof homebridge.Characteristic = this.api.hap.Characteristic;
  public updater;
  public masterStatus;

  private tvAccessory;
  private tvService;

  constructor(
    public readonly log: homebridge.Logger,
    public readonly config: homebridge.PlatformConfig,
    public readonly api: homebridge.API) {

    this.masterStatus = new MiniDSPMasterStatus();
    this.masterStatus.readFromDisk(this.api.user.storagePath() + '/status.json');

    this.updater = new MiniDSPUpdater(log, this.config.miniDSPServerURL, this.masterStatus);

    const base = new MiniDSPAccessory(log, config, api, this.masterStatus, this.updater, false);
    const bla = new MiniDSPAccessory(log, config, api, this.masterStatus, this.updater, true);

    this.api.publishExternalAccessories('homebridge-mindsp-rs', [base.accessory, bla.accessory]);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configureAccessory(accessory: homebridge.PlatformAccessory<homebridge.UnknownContext>): void {
    //throw new Error('Method not implemented.');
  }
}