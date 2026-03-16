// The main source of truth for categories & routing labels.
export const CATEGORIES = [
  { key: "cpus", path: "cpu", label: "CPU" },
  { key: "motherboards", path: "motherboards", label: "Motherboard" },
  { key: "gpus", path: "gpu", label: "GPU" },
  { key: "memory", path: "memory", label: "RAM" },
  { key: "storage", path: "storage", label: "Storage" },
  { key: "psus", path: "psu", label: "PSU" },
  { key: "coolers", path: "coolers", label: "Coolers" },
  { key: "cases", path: "case", label: "Case" },
  { key: "monitors", path: "monitor", label: "Monitor" },
  { key: "os", path: "os", label: "OS" }
];

export const CATEGORY_BY_PATH = Object.fromEntries(
  CATEGORIES.map(c => ["/" + c.path, c])
);

export const CATEGORY_BY_KEY = Object.fromEntries(
  CATEGORIES.map(c => [c.key, c])
);
