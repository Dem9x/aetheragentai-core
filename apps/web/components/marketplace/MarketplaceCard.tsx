import type { MarketplaceAsset } from "@/types";
import { StatusPill } from "@/components/shared/Primitives";

export function MarketplaceCard({ asset }: { asset: MarketplaceAsset }) {
  return (
    <div className="border border-cyan-300/18 bg-[#05070a]/85 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-sm text-cyan-100">{asset.name}</div>
          <div className="mt-1 text-xs text-slate-500">{asset.type} by {asset.creator}</div>
        </div>
        <StatusPill tone="violet">{asset.licenseType}</StatusPill>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 font-mono text-xs">
        <div className="border border-slate-800 bg-black/25 p-2"><div className="text-slate-500">Price</div><div className="text-lime-300">{asset.priceAAA} AAA</div></div>
        <div className="border border-slate-800 bg-black/25 p-2"><div className="text-slate-500">Rating</div><div className="text-amber-300">{asset.rating.toFixed(1)}</div></div>
        <div className="border border-slate-800 bg-black/25 p-2"><div className="text-slate-500">Perf</div><div className="text-cyan-200">{asset.performanceScore}</div></div>
      </div>
      <button className="mt-4 w-full border border-lime-300/20 px-3 py-2 font-mono text-xs text-lime-200 hover:bg-lime-300/8">Request License</button>
    </div>
  );
}
