"use strict";
const NodeHelper = require("node_helper");
const mqtt = require("mqtt");
const { merge, normalize } = require("./lib/status");

module.exports = NodeHelper.create({
  start() { this.instances = new Map(); },
  socketNotificationReceived(notification, payload) {
    if (notification !== "BAMBU_CONFIG" || !payload || typeof payload.id !== "string") return;
    const { id, config: c } = payload;
    const existing = this.instances.get(id);
    if (existing) { existing.emit(); return; }
    const send = data => this.sendSocketNotification("BAMBU_STATUS", { id, ...data });
    if (!c || !/^[a-z\d._:-]+$/i.test(c.host || "") || !/^[a-z\d_-]+$/i.test(c.serial || "") || !c.accessCode ||
        !Number.isInteger(c.port) || c.port < 1 || c.port > 65535) {
      send({ connection: "configError" }); return;
    }
    const entry = { raw: {}, connection: "connecting", updated: null, client: null };
    entry.emit = () => send({ connection: entry.connection, updated: entry.updated, status: normalize(entry.raw) });
    this.instances.set(id, entry);
    const report = `device/${c.serial}/report`;
    try {
      entry.client = mqtt.connect({ protocol: "mqtts", host: c.host, port: c.port,
        username: "bblp", password: String(c.accessCode), rejectUnauthorized: c.rejectUnauthorized === true,
        reconnectPeriod: 5000, connectTimeout: 15000, keepalive: 60, resubscribe: false,
        clientId: `mm-bodk-${require("node:crypto").randomBytes(8).toString("hex")}` });
      entry.client.on("connect", () => {
        entry.connection = "connected"; entry.raw = {}; entry.updated = null;
        entry.client.subscribe(report, { qos: 0 }, (error, granted) => {
          if (error || granted?.some(item => item.qos === 128)) {
            entry.connection = "subscriptionError"; entry.emit(); return;
          }
          // Read-only status request; no print or machine control commands.
          entry.client.publish(`device/${c.serial}/request`, JSON.stringify({ pushing: { sequence_id: "0", command: "pushall" } }));
        });
        entry.emit();
      });
      entry.client.on("message", (topic, buffer, packet) => {
        if (topic !== report || packet?.retain || buffer.length > 1024 * 1024) return;
        try {
          const message = JSON.parse(buffer.toString());
          if (!message.print || typeof message.print !== "object" || Array.isArray(message.print)) return;
          entry.raw = merge(entry.raw, message.print); entry.updated = Date.now(); entry.emit();
        } catch { /* Ignore malformed reports; keep the last valid reading. */ }
      });
      for (const event of ["offline", "close", "reconnect", "error"]) {
        entry.client.on(event, () => { entry.connection = event === "error" ? "connectionError" : "offline"; entry.emit(); });
      }
      entry.emit();
    } catch {
      this.instances.delete(id); send({ connection: "connectionError" });
    }
  },
  stop() {
    for (const entry of this.instances.values()) entry.client?.end(true);
    this.instances.clear();
  }
});
