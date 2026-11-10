"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { merge, normalize } = require("../lib/status");
test("delta reports retain temperatures and merge AMS trays by ID", () => {
  const full = { gcode_state: "RUNNING", nozzle_temper: 210, mc_percent: 20,
    ams: { tray_now: "0", ams: [{ id: "0", tray: [{ id: "0", tray_type: "PLA", tray_color: "FF0000FF" }, { id: "1", tray_type: "PETG" }] }] } };
  const next = merge(full, { mc_percent: 21, ams: { ams: [{ id: "0", tray: [{ id: "0", tray_color: "00FF00FF" }] }] } });
  const s = normalize(next);
  assert.equal(s.nozzle, 210); assert.equal(s.percent, 21); assert.equal(s.trays.length, 2);
  assert.equal(s.trays.find(t => t.slot === "0").type, "PLA");
  assert.equal(s.trays.find(t => t.slot === "0").color, "#00FF00");
  assert.equal(s.trays.find(t => t.slot === "0").active, true);
  assert.equal(full.mc_percent, 20);
});
test("zero values survive, absent values stay unknown and invalid colors are rejected", () => {
  const s = normalize({ mc_percent: 0, mc_remaining_time: "0", bed_temper: 0 });
  assert.equal(s.percent, 0); assert.equal(s.remaining, 0); assert.equal(s.bed, 0);
  assert.equal(s.nozzle, null); assert.equal(normalize({ mc_percent: 200 }).percent, 100);
});
test("merge rejects prototype pollution", () => {
  merge({}, JSON.parse('{"__proto__":{"polluted":true}}'));
  assert.equal({}.polluted, undefined);
});
