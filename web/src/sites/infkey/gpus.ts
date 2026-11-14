/* GPUs and Apple chips for "Can I run it?". VRAM (GB) and memory bandwidth (GB/s) from the
   vendors' published spec sheets. `usable` = share of memory a model can realistically use
   (Apple unified memory is shared with the OS). */

export interface Gpu {
  id: string;
  name: string;
  vram: number;
  bw: number;
  kind: "nvidia" | "amd" | "intel" | "apple" | "datacenter";
  usable?: number;
  top?: boolean; // popular: indexable GPU page
}

export const GPUS: Gpu[] = [
  { id: "rtx-5090", name: "NVIDIA RTX 5090", vram: 32, bw: 1792, kind: "nvidia", top: true },
  { id: "rtx-5080", name: "NVIDIA RTX 5080", vram: 16, bw: 960, kind: "nvidia", top: true },
  { id: "rtx-5070-ti", name: "NVIDIA RTX 5070 Ti", vram: 16, bw: 896, kind: "nvidia", top: true },
  { id: "rtx-5070", name: "NVIDIA RTX 5070", vram: 12, bw: 672, kind: "nvidia", top: true },
  { id: "rtx-5060-ti-16gb", name: "NVIDIA RTX 5060 Ti 16GB", vram: 16, bw: 448, kind: "nvidia", top: true },
  { id: "rtx-5060", name: "NVIDIA RTX 5060", vram: 8, bw: 448, kind: "nvidia", top: true },
  { id: "rtx-4090", name: "NVIDIA RTX 4090", vram: 24, bw: 1008, kind: "nvidia", top: true },
  { id: "rtx-4080-super", name: "NVIDIA RTX 4080 Super", vram: 16, bw: 736, kind: "nvidia", top: true },
  { id: "rtx-4070-ti-super", name: "NVIDIA RTX 4070 Ti Super", vram: 16, bw: 672, kind: "nvidia", top: true },
  { id: "rtx-4070-super", name: "NVIDIA RTX 4070 Super", vram: 12, bw: 504, kind: "nvidia", top: true },
  { id: "rtx-4070", name: "NVIDIA RTX 4070", vram: 12, bw: 504, kind: "nvidia", top: true },
  { id: "rtx-4060-ti-16gb", name: "NVIDIA RTX 4060 Ti 16GB", vram: 16, bw: 288, kind: "nvidia", top: true },
  { id: "rtx-4060-ti", name: "NVIDIA RTX 4060 Ti 8GB", vram: 8, bw: 288, kind: "nvidia", top: true },
  { id: "rtx-4060", name: "NVIDIA RTX 4060", vram: 8, bw: 272, kind: "nvidia", top: true },
  { id: "rtx-3090", name: "NVIDIA RTX 3090", vram: 24, bw: 936, kind: "nvidia", top: true },
  { id: "rtx-3080", name: "NVIDIA RTX 3080 10GB", vram: 10, bw: 760, kind: "nvidia", top: true },
  { id: "rtx-3070", name: "NVIDIA RTX 3070", vram: 8, bw: 448, kind: "nvidia", top: true },
  { id: "rtx-3060", name: "NVIDIA RTX 3060 12GB", vram: 12, bw: 360, kind: "nvidia", top: true },
  { id: "rtx-2080-ti", name: "NVIDIA RTX 2080 Ti", vram: 11, bw: 616, kind: "nvidia" },
  { id: "rtx-2060", name: "NVIDIA RTX 2060", vram: 6, bw: 336, kind: "nvidia" },
  { id: "gtx-1080-ti", name: "NVIDIA GTX 1080 Ti", vram: 11, bw: 484, kind: "nvidia" },
  { id: "gtx-1660-super", name: "NVIDIA GTX 1660 Super", vram: 6, bw: 336, kind: "nvidia" },
  { id: "rx-9070-xt", name: "AMD Radeon RX 9070 XT", vram: 16, bw: 640, kind: "amd", top: true },
  { id: "rx-7900-xtx", name: "AMD Radeon RX 7900 XTX", vram: 24, bw: 960, kind: "amd", top: true },
  { id: "rx-7900-xt", name: "AMD Radeon RX 7900 XT", vram: 20, bw: 800, kind: "amd" },
  { id: "rx-7800-xt", name: "AMD Radeon RX 7800 XT", vram: 16, bw: 624, kind: "amd", top: true },
  { id: "rx-7600", name: "AMD Radeon RX 7600", vram: 8, bw: 288, kind: "amd" },
  { id: "arc-b580", name: "Intel Arc B580", vram: 12, bw: 456, kind: "intel", top: true },
  { id: "arc-a770", name: "Intel Arc A770 16GB", vram: 16, bw: 560, kind: "intel" },
  { id: "m4-16gb", name: "Apple M4 (16GB)", vram: 16, bw: 120, kind: "apple", usable: 0.65, top: true },
  { id: "m4-pro-24gb", name: "Apple M4 Pro (24GB)", vram: 24, bw: 273, kind: "apple", usable: 0.7, top: true },
  { id: "m4-pro-48gb", name: "Apple M4 Pro (48GB)", vram: 48, bw: 273, kind: "apple", usable: 0.72, top: true },
  { id: "m4-max-64gb", name: "Apple M4 Max (64GB)", vram: 64, bw: 546, kind: "apple", usable: 0.75, top: true },
  { id: "m4-max-128gb", name: "Apple M4 Max (128GB)", vram: 128, bw: 546, kind: "apple", usable: 0.75, top: true },
  { id: "m3-ultra-192gb", name: "Apple M3 Ultra (192GB)", vram: 192, bw: 819, kind: "apple", usable: 0.75 },
  { id: "m3-ultra-512gb", name: "Apple M3 Ultra (512GB)", vram: 512, bw: 819, kind: "apple", usable: 0.75 },
  { id: "m2-16gb", name: "Apple M2 (16GB)", vram: 16, bw: 100, kind: "apple", usable: 0.65 },
  { id: "m1-8gb", name: "Apple M1 (8GB)", vram: 8, bw: 68, kind: "apple", usable: 0.6 },
  { id: "dgx-spark", name: "NVIDIA DGX Spark (128GB)", vram: 128, bw: 273, kind: "datacenter", top: true },
  { id: "rtx-pro-6000", name: "NVIDIA RTX PRO 6000 Blackwell", vram: 96, bw: 1792, kind: "datacenter" },
  { id: "rtx-6000-ada", name: "NVIDIA RTX 6000 Ada", vram: 48, bw: 960, kind: "datacenter" },
  { id: "l40s", name: "NVIDIA L40S", vram: 48, bw: 864, kind: "datacenter" },
  { id: "l4", name: "NVIDIA L4", vram: 24, bw: 300, kind: "datacenter" },
  { id: "t4", name: "NVIDIA T4", vram: 16, bw: 320, kind: "datacenter", top: true },
  { id: "a10g", name: "NVIDIA A10G", vram: 24, bw: 600, kind: "datacenter" },
  { id: "a100-40gb", name: "NVIDIA A100 40GB", vram: 40, bw: 1555, kind: "datacenter" },
  { id: "a100-80gb", name: "NVIDIA A100 80GB", vram: 80, bw: 2039, kind: "datacenter", top: true },
  { id: "h100", name: "NVIDIA H100 80GB (SXM)", vram: 80, bw: 3350, kind: "datacenter", top: true },
  { id: "h200", name: "NVIDIA H200 141GB", vram: 141, bw: 4800, kind: "datacenter", top: true },
  { id: "b200", name: "NVIDIA B200 192GB", vram: 192, bw: 8000, kind: "datacenter" },
];

export const QUANTS = [
  { id: "fp16", name: "FP16 / BF16 (full quality)", bytes: 2 },
  { id: "q8", name: "Q8 (8-bit, near-full quality)", bytes: 1.07 },
  { id: "q4", name: "Q4_K_M (4-bit, popular for local use)", bytes: 0.6 },
] as const;

export type Fit = "fits" | "tight" | "no";

/** GB needed for weights + ~1.5 GB runtime and a short (≈8K) context. */
export function needGb(params: number, bytes: number): number {
  return (params * bytes) / 1e9 + 1.5 + (params / 1e9) * 0.04;
}

export function estimate(params: number, gpu: Gpu, bytes: number): { need: number; fit: Fit; tps: number | null } {
  const need = needGb(params, bytes);
  const avail = gpu.vram * (gpu.usable ?? 0.95);
  const fit: Fit = need <= avail * 0.9 ? "fits" : need <= avail ? "tight" : "no";
  const tps = fit === "no" ? null : Math.max(1, Math.round((gpu.bw / ((params * bytes) / 1e9)) * 0.6));
  return { need, fit, tps };
}

export const getGpu = (id: string) => GPUS.find((g) => g.id === id);

export function fmtParams(p: number): string {
  if (p >= 1e12) return (p / 1e12).toFixed(1).replace(/\.0$/, "") + "T";
  if (p >= 1e9) return (p / 1e9).toFixed(p >= 1e10 ? 0 : 1).replace(/\.0$/, "") + "B";
  return Math.round(p / 1e6) + "M";
}
