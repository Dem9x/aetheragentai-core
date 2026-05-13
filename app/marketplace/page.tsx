import { MarketplaceCard } from "@/components/marketplace/MarketplaceCard";
import { StatCard } from "@/components/shared/Primitives";
import { marketplaceAssets } from "@/lib/seed-data";

export default function MarketplacePage() {
  return (
    <div className="space-y-4">
      <Header title="Agent Marketplace" copy="Browse trained agents, reasoning systems, automation modules, memory packs, datasets, and workflows." />
      <div className="grid gap-2 md:grid-cols-4"><StatCard label="Listings" value={marketplaceAssets.length.toString()} /><StatCard label="Volume" value="84,200 AAA" tone="green" /><StatCard label="Avg Rating" value="4.8" tone="amber" /><StatCard label="Performance Median" value="92" tone="violet" /></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{marketplaceAssets.map((asset) => <MarketplaceCard asset={asset} key={asset.id} />)}</div>
    </div>
  );
}

function Header({ title, copy }: { title: string; copy: string }) {
  return <div><h1 className="font-mono text-2xl uppercase text-cyan-50">{title}</h1><p className="mt-1 text-sm text-slate-500">{copy}</p></div>;
}
