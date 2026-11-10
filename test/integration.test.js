"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const source = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
test("helper isolates instances, requests status, handles deltas, reconnects and stops", () => {
  const clients = [], sent = [], module = {};
  vm.runInNewContext(source("node_helper.js"), { module, Buffer, require(name) {
    if (name === "node_helper") return { create: value => value };
    if (name === "mqtt") return { connect: () => {
      const client = new EventEmitter(); client.published = [];
      client.subscribe = (topic, options, callback) => callback(null, [{ qos: 0 }]);
      client.publish = (...args) => client.published.push(args);
      client.end = () => { client.ended = true; }; clients.push(client); return client;
    } };
    return require(name === "./lib/status" ? "../lib/status" : name);
  } });
  const helper = module.exports;
  helper.sendSocketNotification = (name, payload) => sent.push(payload); helper.start();
  const configure = id => helper.socketNotificationReceived("BAMBU_CONFIG", { id,
    config: { host: "192.168.1.2", port: 8883, serial: "TEST", accessCode: "secret" } });
  configure("one"); configure("two"); configure("one"); assert.equal(clients.length, 2);
  clients[0].emit("connect"); assert.match(clients[0].published[0][1], /pushall/);
  clients[0].emit("message", "device/TEST/report", Buffer.from('{"print":{"gcode_state":"RUNNING","mc_percent":10,"nozzle_temper":210}}'));
  clients[0].emit("message", "device/TEST/report", Buffer.from('{"print":{"mc_percent":11}}'));
  assert.equal(sent.at(-1).id, "one"); assert.equal(sent.at(-1).status.nozzle, 210);
  assert.equal(sent.at(-1).status.percent, 11);
  clients[0].emit("message", "device/TEST/report", Buffer.from("invalid"));
  clients[0].emit("close"); assert.equal(sent.at(-1).connection, "offline");
  clients[0].emit("connect"); assert.equal(sent.at(-1).updated, null);
  assert.ok(!JSON.stringify(sent).includes("secret"));
  helper.stop(); assert.ok(clients.every(c => c.ended));
});
test("frontend renders safe text and respects all display switches", () => {
  class Element {
    constructor() { this.children = []; this.style = {}; this.textContent = ""; }
    append(...items) { this.children.push(...items); }
    appendChild(item) { this.append(item); }
    prepend(item) { this.children.unshift(item); }
    get lastChild() { return this.children.at(-1); }
    setAttribute() {}
  }
  let definition;
  const context = {
    Module: { register: (name, value) => { definition = value; } },
    document: { createElement: () => new Element() }, config: { language: "en" },
    setInterval, clearInterval, Date
  };
  vm.createContext(context);
  vm.runInContext(source("translations.js"), context);
  vm.runInContext(source("MMM-BambuLab-BODK.js"), context);
  definition.config = { ...definition.defaults }; definition.translate = key => key;
  assert.equal(definition.config.language, "en");
  context.config.language = "da";
  assert.equal(definition.t("status"), "Status");
  assert.equal(definition.t("remaining"), "Remaining");
  definition.config.language = "da";
  assert.equal(definition.t("remaining"), "Resterende");
  definition.config.language = "en";
  definition.reading = { connection: "connected", updated: Date.now(), status: {
    ...require("../lib/status").normalize({ gcode_state: "RUNNING", subtask_name: "<img src=x>", mc_percent: 20 })
  } };
  const root = definition.getDom();
  assert.ok(root.children.some(row => row.children.some(child => child.textContent === "<img src=x>")));
  for (const key of Object.keys(definition.config)) if (key.startsWith("show")) definition.config[key] = false;
  assert.equal(definition.getDom().children.length, 0);
  definition.reading.connection = "offline"; assert.equal(definition.getDom().children.length, 1);
});
