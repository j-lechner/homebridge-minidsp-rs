import * as homebridge from 'homebridge';

import { SnapController } from './snap';

export class SnapcastAccessory {
  public readonly Service: typeof homebridge.Service = this.api.hap.Service;
  public readonly Characteristic: typeof homebridge.Characteristic = this.api.hap.Characteristic;

  public accessory;
  private televisionService;
  private volumeService;
  private currentInput = 0;

  constructor(
    public readonly log: homebridge.Logger,
    public readonly config: homebridge.PlatformConfig,
    public readonly api: homebridge.API) {

    const tvName = (this.config.name as string);
    const uuid = this.api.hap.uuid.generate('homebridge:my-tv-plugin' + tvName);

    // create the accessory
    this.accessory = new api.platformAccessory(tvName, uuid);
    this.accessory.category = this.api.hap.Categories.AUDIO_RECEIVER;

    this.accessory.getService(this.Service.AccessoryInformation)!
      .setCharacteristic(this.Characteristic.Manufacturer, 'Snapcast')
      .setCharacteristic(this.Characteristic.Model, 'HomeKit Controller');

    this.televisionService = this.accessory.addService(this.Service.Television);
    this.televisionService.setPrimaryService(true);
    this.televisionService
      .setCharacteristic(this.Characteristic.ConfiguredName, tvName)
      .setCharacteristic(this.Characteristic.SleepDiscoveryMode, this.Characteristic.SleepDiscoveryMode.NOT_DISCOVERABLE)
      .setCharacteristic(this.Characteristic.PowerModeSelection, this.Characteristic.PowerModeSelection.HIDE);

    this.televisionService.getCharacteristic(this.Characteristic.Active)
      .onSet((newValue) => {
        this.log.info('set Active => setNewValue: ' + newValue);

        //     if(newValue === 1) {
        //       this.updater.enableUpdater();
        //     } else {
        //       this.updater.disableUpdater();
        //     }
      });

    this.setupWithInputs();

    this.setupVolumeControlEmbedded();

  }

  setupVolumeControlEmbedded () {
    const restoredVolume = 70;

    this.volumeService = this.accessory.addService(this.Service.Lightbulb);
    this.volumeService.setCharacteristic(this.Characteristic.Name, 'Volume' + (this.config.name as string));
    this.volumeService.setCharacteristic(this.Characteristic.Brightness, restoredVolume);
    this.televisionService.addLinkedService(this.volumeService);

    // handle volume control
    this.volumeService.getCharacteristic(this.Characteristic.Brightness)
      .onSet((newValue) => {
        this.log.info('set VolumeSelector => setNewValue: ' + newValue);

        const volumeCommand = [
          {
            'comment': 'Study',
            'method': 'Client.SetVolume',
            'params': {
              'id': this.config.volumeControl.clientId,
              'volume': {
                'muted': false,
                'percent': +newValue,
              },
            },
          },
        ];

        const snap = new SnapController(this.log, this.config.snapcastServerURL);
        snap.processCommandList(volumeCommand); // Non-blocking

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

      // // Make it active if it is the curent source
      // if(input.source === this.masterStatus.source) {
      //   this.currentInput = position;
      //   this.televisionService.updateCharacteristic(this.Characteristic.ActiveIdentifier, position);

      // }

      ++position;
    }

    // handle input source changes
    this.televisionService.getCharacteristic(this.Characteristic.ActiveIdentifier)
      .onSet((newValue): void => {

        this.log.info('set Active Identifier => setNewValue: ' + newValue);

        // Also update volume to respect different gain settings per input
        // Get the current volume before making the input change
        // const currentVolume = this.AbsoluteVolumeFromDSPVolumeWithGain(this.masterStatus.volume);

        this.currentInput = +newValue;

        const input = this.config.inputs[this.currentInput];
        const dump = JSON.stringify(input);
        this.log.info(dump);


        // this.masterStatus.source = input.source;
        // this.masterStatus.volume = this.DSPVolumeWithGainFromAbsoluteVolume(currentVolume);
        // this.log.info('targetVolume:' + this.masterStatus.volume);

        // this.masterStatus.writeToDisk(this.api.user.storagePath() + '/status.json');
        // this.updater.queueMasterStatusUpdate();

        if(input.snapcast) {
          const snap = new SnapController(this.log, this.config.snapcastServerURL);
          snap.processCommandList(input.snapcast); // Non-blocking
        }
      });
  }
}