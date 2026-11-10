"use strict";

// Reports are deltas. Merge nested objects and AMS arrays by their protocol ID.
function merge(previous, patch) {
  const result = { ...previous };
  for (const [key, value] of Object.entries(patch)) {
    if (["__proto__", "constructor", "prototype"].includes(key)) continue;
    if (Array.isArray(value)) {
      const old = Array.isArray(result[key]) ? result[key] : [];
      result[key] = value.every(item => item && typeof item === "object" && item.id !== undefined)
        ? [...old.filter(item => !value.some(next => String(next.id) === String(item.id))),
          ...value.map(item => merge(old.find(prev => String(prev.id) === String(item.id)) || {}, item))]
        : value;
    } else if (value && typeof value === "object") {
      result[key] = merge(result[key] && typeof result[key] === "object" ? result[key] : {}, value);
    } else result[key] = value;
  }
  return result;
}

function number(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) ? Number(value) : null;
}

function normalize(p) {
  const numeric = key => number(p[key]);
  const trays = [];
  for (const unit of p.ams?.ams || []) {
    for (const tray of unit.tray || []) {
      trays.push({ unit: String(unit.id), slot: String(tray.id), type: String(tray.tray_type || "—"),
        color: /^[a-f\d]{6}([a-f\d]{2})?$/i.test(tray.tray_color || "") ? `#${tray.tray_color.slice(0, 6)}` : "",
        active: Number(p.ams.tray_now) === Number(unit.id) * 4 + Number(tray.id) });
    }
  }
  return {
    state: String(p.gcode_state || "UNKNOWN").toUpperCase(),
    file: String(p.subtask_name || p.gcode_file || ""),
    percent: numeric("mc_percent") === null ? null : Math.max(0, Math.min(100, numeric("mc_percent"))),
    remaining: numeric("mc_remaining_time"), layer: numeric("layer_num"), layers: numeric("total_layer_num"),
    nozzle: numeric("nozzle_temper"), nozzleTarget: numeric("nozzle_target_temper"),
    bed: numeric("bed_temper"), bedTarget: numeric("bed_target_temper"), chamber: numeric("chamber_temper"),
    fan: numeric("cooling_fan_speed"), auxiliaryFan: numeric("big_fan1_speed"), chamberFan: numeric("big_fan2_speed"),
    speed: numeric("spd_lvl"), error: p.print_error ? String(p.print_error) : "", trays
  };
}
module.exports = { merge, normalize };
