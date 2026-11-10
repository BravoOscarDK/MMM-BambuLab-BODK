// Insert this object into the modules array in MagicMirror/config/config.js.
{
  module: "MMM-BambuLab-BODK",
  position: "top_right",
  header: "3D printer",
  config: {
    host: "192.168.1.100",
    serial: "YOUR_PRINTER_SERIAL",
    accessCode: "YOUR_LAN_ACCESS_CODE",
    printerName: "Bambu Lab",
    language: "en",
    layout: "default",
    width: "320px",
    showPrinterName: true,
    showConnection: true,
    showStatus: true,
    showFile: true,
    showProgress: true,
    showRemaining: true,
    showFinishTime: true,
    showLayers: true,
    showTemperatures: true,
    showChamber: false,
    showFans: false,
    showSpeed: false,
    showAMS: true,
    showErrors: true,
    showLastUpdate: false,
    hideWhenIdle: false,
    notifications: false
  }
}
