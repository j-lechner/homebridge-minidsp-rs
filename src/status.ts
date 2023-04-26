import fs from 'fs';

export class MiniDSPMasterStatus {
  public dirac = true;
  public mute = false;
  public preset: 0|1|2|3 = 0;
  public source: 'Analog'|'Toslink'|'Spdif'|'Usb'|'Rca'|'Bluetooth' = 'Spdif';
  public volume = -127.0;

  constructor(json?) {
    if(json) {
      this.dirac = json.dirac;
      this.mute = json.mute;
      this.preset = json.preset;
      this.source = json.source;
      this.volume = json.volume;
    }
  }

  readFromDisk(filename) {

    if(fs.existsSync(filename)) {
      const content = fs.readFileSync(filename, 'utf8');
      const parseJson = JSON.parse(content);

      this.dirac = parseJson.dirac;
      this.mute = parseJson.mute;
      this.preset = parseJson.preset;
      this.source = parseJson.source;
      this.volume = parseJson.volume;
    }
  }

  writeToDisk(filename) {

    const data = {
      'dirac': this.dirac,
      'mute': this.mute,
      'preset': this.preset,
      'source': this.source,
      'volume': this.volume };

    fs.writeFile (filename, JSON.stringify(data), (err) => {
      if (err) {
        throw err;
      }
    },
    );
  }
}