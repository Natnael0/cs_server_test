// WORK IN PROGRESS FOR MATCHING RULES AND IF FIELD ARE MISSING.
export function evaluateCompatibility(sel) {
  const out = [];

  const cpu = sel.cpus;
  const mb  = sel.motherboards;
  const mem = sel.memory;
  const gpu = sel.gpus;
  const psu = sel.psus;
  const cooler = sel.coolers;
  const storage = sel.storage;

  // CPU ↔ Motherboard socket
  if (cpu && mb) {
    if (cpu.socket && mb.socket) {
      if (cpu.socket === mb.socket) {
        out.push(ok(`CPU and motherboard sockets match (${cpu.socket}).`));
      } else {
        out.push(err(`CPU socket ${cpu.socket} does not match motherboard socket ${mb.socket}.`));
      }
    } else out.push(warn("CPU or motherboard socket unknown; cannot verify socket compatibility."));
  }

  // Memory ↔ Motherboard type
  if (mem && mb) {
    if (mem.ramType && mb.ramType) {
      if (mem.ramType === mb.ramType) {
        out.push(ok(`Memory type matches motherboard (${mem.ramType}).`));
      } else {
        out.push(err(`Memory type ${mem.ramType} does not match motherboard ${mb.ramType}.`));
      }
    } else out.push(warn("Memory or motherboard RAM type unknown; cannot verify."));
  }

  // GPU ↔ Motherboard PCIe gen (allow older GPU in newer slot) - USED AI
  if (gpu && mb) {
    if (gpu.pcieGen && mb.pcieGen) {
      if (num(gpu.pcieGen) <= num(mb.pcieGen)) {
        out.push(ok(`GPU PCIe Gen ${gpu.pcieGen} works with motherboard Gen ${mb.pcieGen}.`));
      } else {
        out.push(warn(`GPU requires PCIe Gen ${gpu.pcieGen} but motherboard is Gen ${mb.pcieGen}; may bottleneck / not work.`));
      }
    } else out.push(warn("GPU or motherboard PCIe generation unknown."));
  }

  // PSU headroom (very rough) - USED AI
  if (psu) {
    const cpuT = cpu?.tdp ?? 0;
    const gpuT = gpu?.tdp ?? 0;
    const est = Math.round((cpuT + gpuT) * 1.5 || 350);
    if (psu.wattage) {
      if (psu.wattage >= est) out.push(ok(`PSU wattage (${psu.wattage}W) ≥ estimated need (~${est}W).`));
      else out.push(err(`PSU wattage (${psu.wattage}W) < estimated need (~${est}W). Consider higher wattage.`));
    } else out.push(warn("PSU wattage unknown; cannot estimate headroom."));
  }

  // Cooler ↔ CPU support - USED AI
  if (cooler && cpu) {
    const okSock = Array.isArray(cooler.supportedSockets) && cpu.socket
      ? cooler.supportedSockets.includes(cpu.socket)
      : null;
    const okTdp = cooler.tdpRating && cpu.tdp ? cooler.tdpRating >= cpu.tdp : null;

    if (okSock === false) out.push(err(`Cooler does not list support for CPU socket ${cpu.socket}.`));
    else if (okSock === true) out.push(ok(`Cooler supports CPU socket ${cpu.socket}.`));
    else out.push(warn("Cooler/CPU socket support unknown."));

    if (okTdp === false) out.push(err(`Cooler TDP rating (${cooler.tdpRating}W) is below CPU TDP (${cpu.tdp}W).`));
    else if (okTdp === true) out.push(ok("Cooler TDP rating looks sufficient."));
    else out.push(warn("Cooler or CPU TDP unknown; cannot verify cooling capacity."));
  }

  
  if (storage && mb) {
    if (storage.type === "NVMe") {
      if (mb.pcieGen) out.push(ok(`NVMe drive should work; motherboard reports PCIe Gen ${mb.pcieGen}.`));
      else out.push(warn("Motherboard PCIe/M.2 info missing; NVMe support not verified."));
    } else if (storage.type === "SATA") {
      out.push(ok("SATA storage is broadly compatible with most motherboards."));
    }
  }

  return out;
}

const ok = (msg) => ({ level: "ok", message: msg });
const warn = (msg) => ({ level: "warn", message: msg });
const err = (msg) => ({ level: "error", message: msg });

const num = (x) => {
  
  if (typeof x === "number") return x;
  const m = String(x).match(/(\d+(\.\d+)?)/);
  return m ? Number(m[1]) : NaN;
};
