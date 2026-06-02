export interface TopupPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
}

const TOPUP_PACKAGES = {
  coba_dulu: { id: "coba_dulu", name: "Coba Dulu", credits: 300, price: 9900 },
  teman_mingguan: { id: "teman_mingguan", name: "Teman Mingguan", credits: 1000, price: 24900 },
  sahabat_siklus: { id: "sahabat_siklus", name: "Sahabat Siklus", credits: 2500, price: 49000 },
  bekal_tenang: { id: "bekal_tenang", name: "Bekal Tenang", credits: 6000, price: 99000 },
} satisfies Record<string, TopupPackage>;

export function resolveTopupPackage(packageId: unknown): TopupPackage | null {
  if (typeof packageId !== "string" || packageId.length === 0) return null;
  return TOPUP_PACKAGES[packageId as keyof typeof TOPUP_PACKAGES] || null;
}
