import * as homebridge from 'homebridge';
import { MiniDSPMasterStatus } from './status';
import { MiniDSPUpdater } from './updater';
import { MiniDSPAccessory } from './accessory-minidsp';
import { SnapcastAccessory } from './accessory-snapcast';

const PLATFORM_NAME = 'MiniDSPHomebridgePlugin';

export = (api: homebridge.API) => {
  api.registerPlatform(PLATFORM_NAME, MiniDSPPlatform);
};

class MiniDSPPlatform implements homebridge.DynamicPlatformPlugin {
  public readonly Service: typeof homebridge.Service = this.api.hap.Service;
  public readonly Characteristic: typeof homebridge.Characteristic = this.api.hap.Characteristic;
  public dspType;
  public updater;
  public masterStatus;

  private tvAccessory;
  private tvService;

  constructor(
    public readonly log: homebridge.Logger,
    public readonly config: homebridge.PlatformConfig,
    public readonly api: homebridge.API) {

    this.dspType = 'miniDSP';
    if('dspType' in this.config) {
      this.dspType = this.config.dspType;
    }

    if(this.dspType === 'miniDSP') {
      this.masterStatus = new MiniDSPMasterStatus();
      this.masterStatus.readFromDisk(this.api.user.storagePath() + '/status.json');

      this.updater = new MiniDSPUpdater(log, this.config.miniDSPServerURL, this.masterStatus);

      const inputsAndVolume = new MiniDSPAccessory(log, config, api, this.masterStatus, this.updater, false);
      const dspAndPresets = new MiniDSPAccessory(log, config, api, this.masterStatus, this.updater, true);

      this.api.publishExternalAccessories('homebridge-mindsp-rs', [inputsAndVolume.accessory, dspAndPresets.accessory]);

    } else if(this.dspType === 'Snapcast') {
      const dsp = new SnapcastAccessory(log, config, api);

      this.api.publishExternalAccessories('homebridge-mindsp-rs', [dsp.accessory]);

    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configureAccessory(accessory: homebridge.PlatformAccessory<homebridge.UnknownContext>): void {
    //throw new Error('Method not implemented.');
  }
}