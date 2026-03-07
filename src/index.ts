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

  constructor(
    public readonly log: homebridge.Logger,
    public readonly config: homebridge.PlatformConfig,
    public readonly api: homebridge.API) {

    const devices: homebridge.PlatformConfig[] = this.config.devices ?? [];

    for(const device of devices) {
      const dspType = device.dspType ?? 'miniDSP';

      if(dspType === 'miniDSP') {
        const masterStatus = new MiniDSPMasterStatus();
        masterStatus.readFromDisk(this.api.user.storagePath() + '/status-' + device.name + '.json');

        const updater = new MiniDSPUpdater(log, device.miniDSPServerURL, masterStatus);

        const inputsAndVolume = new MiniDSPAccessory(log, device, api, masterStatus, updater, false);
        const dspAndPresets = new MiniDSPAccessory(log, device, api, masterStatus, updater, true);

        this.api.publishExternalAccessories('homebridge-minidsp-rs', [inputsAndVolume.accessory]);
        this.api.publishExternalAccessories('homebridge-minidsp-rs', [dspAndPresets.accessory]);

      } else if(dspType === 'Snapcast') {
        const dsp = new SnapcastAccessory(log, device, api);

        this.api.publishExternalAccessories('homebridge-minidsp-rs', [dsp.accessory]);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configureAccessory(accessory: homebridge.PlatformAccessory<homebridge.UnknownContext>): void {
    //throw new Error('Method not implemented.');
  }
}