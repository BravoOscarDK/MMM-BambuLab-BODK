/* global Module, config, BambuBodkTexts */
Module.register("MMM-BambuLab-BODK", {
  defaults: {
    host: "", port: 8883, serial: "", accessCode: "", printerName: "Bambu Lab",
    rejectUnauthorized: false, language: "en", layout: "default", width: "320px",
    animationSpeed: 300, staleAfter: 180000, hideWhenIdle: false,
    showPrinterName: true, showConnection: true, showStatus: true, showFile: true,
    showProgress: true, showRemaining: true, showFinishTime: true, showLayers: true,
    showTemperatures: true, showChamber: false, showFans: false, showSpeed: false,
    showAMS: true, showErrors: true, showLastUpdate: false,
    notifications: false, notificationStates: ["RUNNING", "PAUSE", "FINISH", "FAILED"]
  },
  getStyles() { return ["MMM-BambuLab-BODK.css"]; },
  getScripts() { return ["translations.js"]; },
  start() {
    this.reading = { connection: "connecting" };
    this.previousState = null;
    this.timer = setInterval(() => this.updateDom(0), 30000);
  },
  notificationReceived(notification) {
    if (notification === "DOM_OBJECTS_CREATED") this.configure();
  },
  configure() {
    const { host, port, serial, accessCode, rejectUnauthorized } = this.config;
    this.sendSocketNotification("BAMBU_CONFIG", { id: this.identifier,
      config: { host, port, serial, accessCode, rejectUnauthorized } });
  },
  suspend() { clearInterval(this.timer); },
  resume() {
    clearInterval(this.timer);
    this.timer = setInterval(() => this.updateDom(0), 30000);
    this.configure(); this.updateDom(0);
  },
  socketNotificationReceived(notification, payload) {
    if (notification !== "BAMBU_STATUS" || payload.id !== this.identifier) return;
    const state = payload.status?.state;
    if (this.config.notifications && payload.connection === "connected" && this.previousState &&
        state !== this.previousState && this.config.notificationStates.includes(state)) {
      this.sendNotification("SHOW_ALERT", { type: "notification", title: this.config.printerName,
        message: this.t(state), timer: 8000 });
    }
    if (payload.connection === "connected" && state && state !== "UNKNOWN") this.previousState = state;
    else if (payload.connection !== "connected") this.previousState = null;
    this.reading = payload; this.updateDom(this.config.animationSpeed);
  },
  t(key) {
    const language = this.config.language || config.language || "en";
    return BambuBodkTexts[language]?.[key] || BambuBodkTexts.en[key] || key;
  },
  getDom() {
    const c = this.config, r = this.reading, s = r.status || {};
    const root = document.createElement("div");
    root.className = `bambu-bodk ${c.layout === "compact" ? "bambu-compact" : ""}`;
    root.style.width = c.width;
    if (c.hideWhenIdle && r.connection === "connected" && ["IDLE", "FINISH"].includes(s.state)) return root;
    const add = (label, value, className = "") => {
      const row = document.createElement("div"); row.className = `bambu-row ${className}`;
      const key = document.createElement("span"); key.className = "bambu-label"; key.textContent = label;
      const val = document.createElement("span"); val.className = "bambu-value"; val.textContent = value;
      row.append(key, val); root.appendChild(row); return row;
    };
    const n = value => value === null || value === undefined ? "—" : String(value);
    if (c.showPrinterName) add("", c.printerName, "bambu-title bright");
    const stale = r.updated && Date.now() - r.updated > c.staleAfter;
    if (c.showConnection) add(this.t("connection"), this.t(r.connection), `bambu-${r.connection}`);
    if (stale) add("", this.t("stale"), "bambu-warning");
    if (r.connection !== "connected") {
      if (!c.showConnection) add("", this.t(r.connection), "bambu-warning");
      return root;
    }
    if (!r.updated) { add("", this.t("waiting")); return root; }
    if (c.showStatus) add(this.t("status"), this.t(s.state));
    if (c.showFile && s.file) add(this.t("file"), s.file, "bambu-file");
    if (c.showProgress) {
      add(this.t("progress"), s.percent === null ? "—" : `${s.percent}%`);
      const bar = document.createElement("div"); bar.className = "bambu-progress";
      bar.setAttribute("role", "progressbar"); bar.setAttribute("aria-label", this.t("progress"));
      bar.setAttribute("aria-valuemin", "0"); bar.setAttribute("aria-valuemax", "100");
      if (s.percent !== null) bar.setAttribute("aria-valuenow", String(s.percent));
      const fill = document.createElement("div"); fill.style.width = `${s.percent || 0}%`;
      bar.appendChild(fill); root.appendChild(bar);
    }
    if (c.showRemaining) add(this.t("remaining"), s.remaining === null ? "—" : `${Math.floor(s.remaining / 60)}h ${s.remaining % 60}m`);
    if (c.showFinishTime) add(this.t("finishTime"), !stale && s.state === "RUNNING" && s.remaining !== null
      ? new Date(r.updated + s.remaining * 60000).toLocaleTimeString(c.language || config.language || "en", { hour: "2-digit", minute: "2-digit" }) : "—");
    if (c.showLayers) add(this.t("layers"), `${n(s.layer)} / ${n(s.layers)}`);
    if (c.showTemperatures) {
      add(this.t("nozzle"), `${n(s.nozzle)} / ${n(s.nozzleTarget)} °C`);
      add(this.t("bed"), `${n(s.bed)} / ${n(s.bedTarget)} °C`);
    }
    if (c.showChamber) add(this.t("chamber"), `${n(s.chamber)} °C`);
    if (c.showFans) for (const key of ["fan", "auxiliaryFan", "chamberFan"]) {
      add(this.t(key), s[key] === null ? "—" : `${Math.round(Math.min(15, Math.max(0, s[key])) / 15 * 100)}%`);
    }
    if (c.showSpeed) add(this.t("speed"), this.t(["UNKNOWN", "silent", "standard", "sport", "ludicrous"][s.speed] || "UNKNOWN"));
    if (c.showAMS) for (const tray of s.trays || []) {
      const row = add(`AMS ${Number(tray.unit) + 1} · ${Number(tray.slot) + 1}`, `${tray.active ? "▶ " : ""}${tray.type}`, "bambu-tray");
      if (tray.color) { const swatch = document.createElement("i"); swatch.style.backgroundColor = tray.color; row.lastChild.prepend(swatch); }
    }
    if (c.showErrors && s.error) add(this.t("error"), s.error, "bambu-warning");
    if (c.showLastUpdate) add(this.t("updated"), new Date(r.updated).toLocaleTimeString(c.language || config.language || "en"));
    return root;
  }
});
