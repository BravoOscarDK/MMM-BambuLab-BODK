# MMM-BambuLab-BODK

## Description

A configurable MagicMirror² module for local Bambu Lab printer status over MQTT/TLS. English is the default language; Danish is available with `language: "da"`.

Display status, job name, progress, remaining time, estimated finish time, layers, temperatures, fans, speed profile and AMS filament slots. Each section can be enabled or disabled separately. Includes a compact layout, CSS customization, optional notifications and multiple printer instances.

Inspired by [MMM-Bambulink](https://github.com/TAGinside/MMM-Bambulink) and [MMM-BambuLabNotify](https://github.com/LuckyDuckTx/MMM-BambuLabNotify). Follows [MagicMirror² module conventions](https://docs.magicmirror.builders/development/). Requests a full status report on connection; sends no print or machine control commands.

## Requirements

Node.js 22 or newer, also supported by your MagicMirror² installation. A compatible Bambu Lab printer with local MQTT/TLS access and network access to TCP port 8883 are required.

Enable local printer access as required by your model and firmware. Find the local IP address, serial number and LAN access code in the printer network settings or Bambu Studio. MagicMirror² must reach TCP port 8883. Availability depends on printer model, firmware and LAN settings; Bambu Cloud login is not supported.

## Installation

Run these commands on the device running MagicMirror²:

```sh
cd ~/MagicMirror/modules
git clone https://github.com/BravoOscarDK/MMM-BambuLab-BODK.git
cd MMM-BambuLab-BODK
npm install
```

Keep the folder name `MMM-BambuLab-BODK` unchanged. Complete the configuration below, then restart MagicMirror² using your usual startup method.

## Configuration

Add this entry to the `modules` array in `~/MagicMirror/config/config.js`, then restart MagicMirror²:

```js
{
  module: "MMM-BambuLab-BODK",
  position: "top_right",
  header: "3D printer",
  config: {
    host: "192.168.1.100",
    serial: "YOUR_PRINTER_SERIAL",
    accessCode: "YOUR_LAN_ACCESS_CODE",
    printerName: "My Bambu Lab",
    language: "en",
    showAMS: true,
    showFans: false,
    showChamber: false
  }
},
```

See [config.example.js](config.example.js) for all display switches. Add a separate module entry for each printer; each instance has its own connection.

| Option | Default | Description |
| --- | --- | --- |
| `host` | `""` | Printer local IP address or DNS name |
| `serial` | `""` | Printer serial number |
| `accessCode` | `""` | Printer LAN access code |
| `port` | `8883` | MQTT/TLS port |
| `printerName` | `"Bambu Lab"` | Display name |
| `language` | `"en"` | English (`en`) or Danish (`da`); an empty value follows the MagicMirror² global language |
| `layout` | `"default"` | `default` or `compact` |
| `width` | `"320px"` | CSS width |
| `animationSpeed` | `300` | DOM transition duration in milliseconds |
| `staleAfter` | `180000` | Milliseconds without a report before showing a warning |
| `hideWhenIdle` | `false` | Hide module content while IDLE or FINISH |
| `rejectUnauthorized` | `false` | Allow the printer's self-signed TLS certificate. Use on a trusted LAN. True requires a certificate trusted by Node.js. |
| `notifications` | `false` | SHOW_ALERT on state changes; requires the standard alert module |
| `notificationStates` | `["RUNNING", "PAUSE", "FINISH", "FAILED"]` | States that trigger notifications |

All display options accept `true` or `false` independently:

| Option | Default | Content |
| --- | --- | --- |
| `showPrinterName` | `true` | Printer name |
| `showConnection` | `true` | Connection status |
| `showStatus` | `true` | Printer state |
| `showFile` | `true` | Job/file name |
| `showProgress` | `true` | Percentage and progress bar |
| `showRemaining` | `true` | Remaining hours and minutes |
| `showFinishTime` | `true` | Estimated completion time while RUNNING |
| `showLayers` | `true` | Current / total layers |
| `showTemperatures` | `true` | Nozzle and bed, actual / target |
| `showChamber` | `false` | Chamber temperature |
| `showFans` | `false` | Part, auxiliary and chamber fans |
| `showSpeed` | `false` | Speed profile |
| `showAMS` | `true` | AMS slots, materials, colors and active slot |
| `showErrors` | `true` | Printer error code |
| `showLastUpdate` | `false` | Last report time |

Unreported values display as `—`. AMS appears only when AMS data is reported. External spools and camera images are not implemented. Fan percentages use the protocol's 0–15 scale. New firmware formats may need adjustments. Estimated finish time uses the report timestamp and remaining time; it is hidden for stale data or paused prints. The first state after startup or reconnection triggers no notification.

### Styling

Add overrides to `MagicMirror²/css/custom.css`:

```css
.MMM-BambuLab-BODK .bambu-bodk {
  --bambu-accent: #ffffff;
  --bambu-warning: #ffb454;
  --bambu-track: #333333;
  --bambu-font-size: 18px;
  --bambu-gap: 6px;
}
```

You can also style `.bambu-title`, `.bambu-row`, `.bambu-label`, `.bambu-value`, `.bambu-progress` and `.bambu-tray`. Standard MagicMirror² `header`, `position` and `classes` options are supported.

## Language

English is the default, independently of the MagicMirror² global language. Set the language in this module's `config`:

```js
language: "en" // English (default); use "da" for Danish.
```

Unsupported languages fall back to English. Custom labels, device names and upstream data retain their configured or reported values. Technical logs and diagnostic errors are in English.

For this module, an explicitly empty `language` value follows the MagicMirror² global language. Use `"en"` to keep English selected explicitly. Use the exact codes `en` or `da`.

## Updating

For an installation created with `git clone`:

```sh
cd ~/MagicMirror/modules/MMM-BambuLab-BODK
git pull --ff-only
npm install
```

Restart MagicMirror² using your usual startup method. Keep your module settings in `~/MagicMirror/config/config.js`. If Git reports local changes or diverging branches, preserve those changes and resolve the issue before updating. A ZIP download or copied folder must be replaced manually or migrated to a Git clone before using `git pull`.

## Troubleshooting

For connection errors, check IP address, port, serial number, LAN access code, local access settings and firewall. The module reconnects every five seconds. "Waiting for printer data" means MQTT is connected but no report has arrived. Error codes are displayed as reported; consult Bambu Lab for their meaning.

The LAN access code is stored in your MagicMirror² configuration. Do not publish that configuration. The module does not return the access code in status messages or log raw printer data.

## Validation

```sh
npm run check
npm test
```

Automated tests use simulated reports and MQTT connections. Physical printer connectivity and operation in a running MagicMirror² installation still need hardware testing.

## License

MIT. See [LICENSE](LICENSE) for license terms and attribution.
