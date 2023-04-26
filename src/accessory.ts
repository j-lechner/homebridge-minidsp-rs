import * as homebridge from 'homebridge';

import { MiniDSPMasterStatus } from './status';
import { MiniDSPUpdater } from './updater';

import { SnapController } from './snap';

export class MiniDSPAccessory {
  public readonly Service: typeof homebridge.Service = this.api.hap.Service;
  public readonly Characteristic: typeof homebridge.Characteristic = this.api.hap.Characteristic;

  public accessory;
  private televisionService;
  private volumeService;
  private currentInput = 0;

  constructor(
    public readonly log: homebridge.Logger,
    public readonly config: homebridge.PlatformConfig,
    public readonly api: homebridge.API,
    public readonly masterStatus : MiniDSPMasterStatus,
    public readonly updater : MiniDSPUpdater,
    public readonly presets: boolean) {

    const tvName = (presets) ? this.config.dspName : this.config.name;
    const uuid = this.api.hap.uuid.generate('homebridge:my-tv-plugin' + tvName);

    // create the accessory
    this.accessory = new api.platformAccessory(tvName, uuid);
    this.accessory.category = (presets) ? this.api.hap.Categories.PROGRAMMABLE_SWITCH : this.api.hap.Categories.AUDIO_RECEIVER;

    this.accessory.getService(this.Service.AccessoryInformation)!
      .setCharacteristic(this.Characteristic.Manufacturer, 'MiniDSP')
      .setCharacteristic(this.Characteristic.Model, 'Flex');

    if(!presets) {
      this.setupVolumeControlEmbedded();
    }

    // const test1 = new this.Service.Television(tvName, 'One');
    this.televisionService = this.accessory.addService(this.Service.Television);
    this.televisionService
      .setCharacteristic(this.Characteristic.ConfiguredName, tvName)
      .setCharacteristic(this.Characteristic.SleepDiscoveryMode, this.Characteristic.SleepDiscoveryMode.NOT_DISCOVERABLE)
      .setCharacteristic(this.Characteristic.PowerModeSelection, this.Characteristic.PowerModeSelection.HIDE);

    this.televisionService.getCharacteristic(this.Characteristic.Active)
      .onSet((newValue) => {
        this.log.info('set Active => setNewValue: ' + newValue);

        if(newValue === 1) {
          this.updater.enableUpdater();
        } else {
          this.updater.disableUpdater();
        }
      });

    if(presets) {
      this.setupWithPresets();
      this.setupDiracSwitch();
    } else {
      this.setupWithInputs();
    }
  }

  AbsoluteVolumeFromDSPVolumeWithGain (dspVolume) {
    const max = this.config.volumeControl.maximumDSPVolume * -1;
    const min = this.config.volumeControl.minimumDSPVolume * -1;
    const gain = this.config.inputs[this.currentInput].gain;

    return ((((dspVolume - gain) + max) / - 1) - (min - max)) / - (min - max) * 100;
  }

  DSPVolumeWithGainFromAbsoluteVolume (targetVolume) {
    const max = this.config.volumeControl.maximumDSPVolume * -1;
    const min = this.config.volumeControl.minimumDSPVolume * -1;
    const gain = this.config.inputs[this.currentInput].gain;

    let targetVolumeDSP = (-1 * ((min - max) - (min - max) * (targetVolume / 100))) - max;
    targetVolumeDSP += gain;
    targetVolumeDSP = Math.min(targetVolumeDSP, 0);
    targetVolumeDSP = Math.round(targetVolumeDSP*2)/2; // Round to .0 or .5

    return targetVolumeDSP;
  }

  setupDiracSwitch () {
    const diracService = this.accessory.addService(this.Service.Switch);
    diracService.setCharacteristic(this.Characteristic.Name, 'Dirac');
    diracService.setCharacteristic(this.Characteristic.On, this.masterStatus.dirac);

    diracService.getCharacteristic(this.Characteristic.On)
      .onGet(() => {
        return this.masterStatus.dirac;
      })
      .onSet((newValue) => {
        this.log.info('set DiracSwitch => setNewValue: ' + newValue);

        this.masterStatus.dirac = newValue;
        this.masterStatus.writeToDisk(this.api.user.storagePath() + '/status.json');
        this.updater.queueMasterStatusUpdate();
      });
  }

  setupVolumeControlEmbedded () {
    const restoredVolume = this.AbsoluteVolumeFromDSPVolumeWithGain(this.masterStatus.volume);

    this.volumeService = this.accessory.addService(this.Service.Lightbulb);
    this.volumeService.setCharacteristic(this.Characteristic.Name, 'Volume');
    this.volumeService.setCharacteristic(this.Characteristic.Brightness, restoredVolume);

    // handle volume control
    this.volumeService.getCharacteristic(this.Characteristic.Brightness)
      .onSet((newValue) => {
        this.log.info('set VolumeSelector => setNewValue: ' + newValue);

        const targetVolumeDSP = this.DSPVolumeWithGainFromAbsoluteVolume(newValue);
        this.masterStatus.volume = targetVolumeDSP;
        this.masterStatus.writeToDisk(this.api.user.storagePath() + '/status.json');
        this.updater.queueMasterStatusUpdate();
      });
  }

  setupWithInputs () {
    let position = 0;
    for (const input of this.config.inputs) {

      const inputService = this.accessory.addService(this.Service.InputSource, input.displayName, input.displayName);
      inputService
        .setCharacteristic(this.Characteristic.Identifier, position)
        .setCharacteristic(this.Characteristic.ConfiguredName, input.displayName)
        .setCharacteristic(this.Characteristic.IsConfigured, this.Characteristic.IsConfigured.CONFIGURED)
        .setCharacteristic(this.Characteristic.InputDeviceType, this.Characteristic.InputDeviceType.AUDIO_SYSTEM)
        .setCharacteristic(this.Characteristic.InputSourceType, this.Characteristic.InputSourceType.OTHER);
      this.televisionService.addLinkedService(inputService);

      //   this.log.info(input.source + '<->' + this.masterStatus.source);

      // Make it active if it is the curent source
      if(input.source === this.masterStatus.source) {
        this.currentInput = position;
        this.televisionService.updateCharacteristic(this.Characteristic.ActiveIdentifier, position);

      }

      ++position;
    }

    // handle input source changes
    this.televisionService.getCharacteristic(this.Characteristic.ActiveIdentifier)
      .onSet((newValue): void => {

        this.log.info('set Active Identifier => setNewValue: ' + newValue);

        // Also update volume to respect different gain settings per input
        // Get the current volume before making the input change
        const currentVolume = this.AbsoluteVolumeFromDSPVolumeWithGain(this.masterStatus.volume);

        this.currentInput = +newValue;

        const input = this.config.inputs[this.currentInput];
        const dump = JSON.stringify(input);
        this.log.info(dump);


        this.masterStatus.source = input.source;
        this.masterStatus.volume = this.DSPVolumeWithGainFromAbsoluteVolume(currentVolume);
        this.log.info('targetVolume:' + this.masterStatus.volume);

        this.masterStatus.writeToDisk(this.api.user.storagePath() + '/status.json');
        this.updater.queueMasterStatusUpdate();

        if(input.snapcast) {
          const snap = new SnapController();

          for (const command of input.snapcast) {
            snap.groupSetStream(this.config.snapcastServerURL, command.method, command.params);
          }
        }
      });
  }

  setupWithPresets () {
    let position = 0;
    for (const input of this.config.presets) {

      const inputService = this.accessory.addService(this.Service.InputSource, input.displayName, input.displayName);
      inputService
        .setCharacteristic(this.Characteristic.Identifier, position)
        .setCharacteristic(this.Characteristic.ConfiguredName, input.displayName)
        .setCharacteristic(this.Characteristic.IsConfigured, this.Characteristic.IsConfigured.CONFIGURED)
        .setCharacteristic(this.Characteristic.InputDeviceType, this.Characteristic.InputDeviceType.AUDIO_SYSTEM)
        .setCharacteristic(this.Characteristic.InputSourceType, this.Characteristic.InputSourceType.OTHER);
      this.televisionService.addLinkedService(inputService);

      ++position;
    }

    this.televisionService.updateCharacteristic(this.Characteristic.ActiveIdentifier, this.masterStatus.preset);

    // handle input source changes
    this.televisionService.getCharacteristic(this.Characteristic.ActiveIdentifier)
      .onSet((newValue): void => {

        this.log.info('set Active Identifier => setNewValue: ' + newValue);

        const input = this.config.presets[+newValue];
        const dump = JSON.stringify(input);
        this.log.info(dump);

        this.masterStatus.preset = newValue;
        this.masterStatus.writeToDisk(this.api.user.storagePath() + '/status.json');
        this.updater.queueMasterStatusUpdate();
      });
  }
}