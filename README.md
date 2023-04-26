# Control your miniDSP Flex from your iPhone

[miniDSP Flex](https://www.minidsp.com/products/minidsp-in-a-box/flex) is a versatile audio processor that can be used as a preamplifier, digital-to-analog converter (DAC) and digital signal processor (EQ, [Dirac room correction](https://www.dirac.com)).

This Homebridge plugin allows you to change the volume, input source, DSP preset and Dirac status right from your iPhone/iPad/Mac/Watch. 

<img src="miniDSP-Homebridge.png" alt="Volume, Input, DSP Preset and Dirac control" width="500" height="351" />

## Features

* **Absolute volume control**, allowing you quickly to pick any volume between 0 and 100% 
* **Custom names for each input source**, since *Vinyl* is much easier to understand than *Analog Input*
* **Individual gain per input source**, so you don't have to adjust the volume when changing between inputs 
* **DSP preset selection including custom naming**, since *Bass +3db* is much easier to remember than *Preset 2*
* **DIRAC on and off control**

## Architecture

iDevice -> HomeKit
Homebridge with this plugin -> REST
miniDSP-RS -> USB
miniDSP Flex

## Setup

* [Install miniDSP RS](https://github.com/mrene/minidsp-rs/releases) on a machine connected to your miniDSP Flex
* Run miniDSP RS, e.g. type `minidspd.exe -v` in the Windows Command Prompt
* Install this plugin in homebridge
* Configure this plugin
* * Set `miniDSPServerURL` to the IP of the machine running miniDSP RS, e.g. `http://192.168.178.123:5380`
* * Change `name` and `dspName` to your liking ... -> DIRAC -10db
* * TODO: maximumDSPVolume and minimumDSPVolume
* * Under `inputs` remove the inputs you don't need and for the remaining, change the `displayName` and `gain` to your liking
* * Under `presets` remove the presets you don't need and for the remaining, change the `displayName` to your liking


## Notes

* Plugin accepts changes even if miniDSP is not reachable (e.g. when it is still powering up) and applies them as soon as available again.
* Plugin assumes it is in charge, meaning any changes done directly on the miniDSP or via the infraed control will be overriden (eventually)


## Thanks

[miniDSP RS](https://github.com/mrene/minidsp-rs)
