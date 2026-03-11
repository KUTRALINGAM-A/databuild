import { useState, useEffect, useMemo } from 'react';
import { Leaf, Award, CheckCircle2, TrendingDown, Minus, Plus, Zap } from 'lucide-react';
import { getMarketplaceCredits, purchaseCredit, getMyCompany, getMyCarbonLedger, getMyVendors } from '@/lib/db';
import type { MarketplaceCredit } from '@/lib/db';

// ── One card per supplier, all their listings merged ─────────────────────────
interface GroupedSupplier {
    supplier_name: string;
    totalTonnes: number;
    blendedRatePerTonne: number; // weighted average ₹/tonne
    listings: MarketplaceCredit[]; // sorted cheapest per-tonne first
}

function groupBySupplier(credits: MarketplaceCredit[]): GroupedSupplier[] {
    const map = new Map<string, MarketplaceCredit[]>();
    for (const c of credits) {
        const key = c.supplier_name;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(c);
    }
    return Array.from(map.entries()).map(([supplier_name, listings]) => {
        const sorted = [...listings].sort(
            (a, b) => (a.cost_inr / a.tonnes_offset) - (b.cost_inr / b.tonnes_offset)
        );
        const totalTonnes = sorted.reduce((s, c) => s + c.tonnes_offset, 0);
        const totalCost   = sorted.reduce((s, c) => s + c.cost_inr, 0);
        return {
            supplier_name,
            totalTonnes: Math.round(totalTonnes * 1000) / 1000,
            blendedRatePerTonne: Math.round(totalCost / totalTonnes),
            listings: sorted,
        };
    });
}

export function MarketplacePage() {
    const [grouped,            setGrouped]            = useState<GroupedSupplier[]>([]);
    const [loading,            setLoading]            = useState(true);
    const [purchasingSupplier, setPurchasingSupplier] = useState<string | null>(null);
    const [successMsg,         setSuccessMsg]         = useState('');
    const [errorMsg,           setErrorMsg]           = useState('');
    const [buyerId,            setBuyerId]            = useState<string | null>(null);
    const [companyDetails,     setCompanyDetails]     = useState<any>(null);
    const [allAvailable,       setAllAvailable]       = useState<MarketplaceCredit[]>([]);
    const [grandTotalCo2e,     setGrandTotalCo2e]     = useState<number>(0);
    
    // Optimization Panel State
    const [optimizedTonnes, setOptimizedTonnes] = useState<number>(100);
    const [isOptimizing, setIsOptimizing] = useState(false);

    // keyed by supplier_name
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    useEffect(() => {
        const init = async () => {
            const company = await getMyCompany();
            if (company) {
                setBuyerId(company.id);
                setCompanyDetails(company);
                
                const [led, ven] = await Promise.all([
                    getMyCarbonLedger(company.id),
                    getMyVendors(company.id),
                ]);
                const scope12 = led.reduce((s, r) => s + r.calculated_co2e, 0);
                const scope3 = ven.reduce((s, v) => s + (v.total_co2e ?? 0), 0);
                setGrandTotalCo2e(scope12 + scope3);
            }
            await fetchCredits();
        };
        init();
    }, []);

    const fetchCredits = async () => {
        setLoading(true);
        const data      = await getMarketplaceCredits();
        const available = data.filter(c => !c.credit_type.includes('Retired'));
        setAllAvailable(available);
        const g         = groupBySupplier(available);
        setGrouped(g);
        // Init quantity per supplier = 10 % of their total
        const init: Record<string, number> = {};
        for (const s of g) {
            init[s.supplier_name] = Math.max(0.01, Math.round(s.totalTonnes * 0.1 * 100) / 100);
        }
        setQuantities(init);
        setLoading(false);
    };

    const optimalPlan = useMemo(() => {
        if (!optimizedTonnes || optimizedTonnes <= 0) return null;
        let target = optimizedTonnes;
        const plan = [];
        const sorted = [...allAvailable].sort((a, b) => (a.cost_inr / a.tonnes_offset) - (b.cost_inr / b.tonnes_offset));
        let totalCost = 0;
        for (const c of sorted) {
            if (target <= 0) break;
            const take = Math.min(target, c.tonnes_offset);
            const cost = (c.cost_inr / c.tonnes_offset) * take;
            plan.push({ credit: c, take: Math.round(take * 1000) / 1000, cost });
            totalCost += cost;
            target -= take;
        }
        return { plan, remainingTarget: Math.round(target * 1000) / 1000, totalCost: Math.round(totalCost) };
    }, [optimizedTonnes, allAvailable]);

    const executeOptimizedPurchase = async () => {
        if (!optimalPlan || !buyerId) return;
        setIsOptimizing(true);
        setErrorMsg('');
        
        try {
            let totalBought = 0;
            // Execute purchases sequentially to avoid race conditions on the DB
            for (const item of optimalPlan.plan) {
                const success = await purchaseCredit(item.credit.id, buyerId, item.take);
                if (success) totalBought += item.take;
            }
            if (totalBought > 0) {
                setSuccessMsg(`✅ Smart Optimized Purchase complete! Offset ${totalBought.toFixed(2)} tonnes CO₂e. Dashboard updated.`);
                await fetchCredits();
                setTimeout(() => setSuccessMsg(''), 6000);
            } else {
                setErrorMsg('Optimization purchase failed. Please try again.');
                setTimeout(() => setErrorMsg(''), 5000);
            }
        } catch (e: any) {
            setErrorMsg(e.message || 'Optimization purchase failed.');
            setTimeout(() => setErrorMsg(''), 5000);
        } finally {
            setIsOptimizing(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <Leaf className="w-8 h-8 text-eco-mint" />
                        Carbon Credit Exchange
                    </h2>
                    <p className="text-gray-500 mt-2 max-w-2xl text-lg">
                        Purchase surplus verified green credits directly from eco-friendly suppliers to offset your Scope 3 emissions.
                    </p>
                </div>
            </div>

            {/* Toasts */}
            {successMsg && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4">
                    <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                    <p className="text-green-800 font-medium">{successMsg}</p>
                </div>
            )}
            {errorMsg && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3">
                    <p className="text-red-800 font-medium">{errorMsg}</p>
                </div>
            )}

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="glass-panel h-72 rounded-2xl animate-pulse bg-gray-100" />
                    ))}
                </div>
            ) : grouped.length === 0 ? (
                <div className="glass-panel text-center py-20 rounded-2xl border border-dashed border-gray-300">
                    <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700">The Market is Empty</h3>
                    <p className="text-gray-500 mt-2">All available carbon credits have been purchased.</p>
                </div>
            ) : (
                <>
                    {/* Optimization Panel (Least Cost Method) */}
                    <div className="glass-panel rounded-2xl p-6 border-2 border-eco-mint/20 relative overflow-hidden group">
                        <div className="absolute -left-16 -top-16 w-32 h-32 bg-eco-mint/10 rounded-full blur-3xl group-hover:bg-eco-mint/20 transition-all pointer-events-none" />
                        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative z-10">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="w-5 h-5 text-yellow-500" />
                                    <h3 className="text-lg font-bold text-gray-900">Smart Least-Cost Purchase</h3>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Enter your total needed offset. We will use a greedy optimization (least-cost method) to automatically assemble the cheapest mix of credits from the market constraints.
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-gray-100 shadow-sm w-full md:w-auto">
                                <div className="flex flex-col px-3">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target Offset</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={0.01}
                                            step={0.01}
                                            value={optimizedTonnes || ''}
                                            onChange={e => setOptimizedTonnes(parseFloat(e.target.value) || 0)}
                                            className="w-24 text-lg font-bold text-gray-900 focus:outline-none bg-transparent"
                                        />
                                        <span className="text-sm font-medium text-gray-500">t CO₂e</span>
                                    </div>
                                    {companyDetails && (() => {
                                        const dynamicCap = (companyDetails.production_volume && companyDetails.industry_emission_factor)
                                            ? companyDetails.production_volume * companyDetails.industry_emission_factor
                                            : (companyDetails.carbon_cap ?? 10000);
                                        return (
                                        <div className="flex gap-2 mt-2">
                                            {grandTotalCo2e > dynamicCap ? (
                                                optimizedTonnes === Math.max(0.01, Math.round(((grandTotalCo2e - dynamicCap) / 1000) * 100) / 100) ? (
                                                    <button
                                                        onClick={() => setOptimizedTonnes(Math.max(0.01, Math.round((grandTotalCo2e / 1000) * 100) / 100))}
                                                        className="text-[10px] px-3 py-1 bg-eco-mint/10 hover:bg-eco-mint/20 text-eco-deepgreen rounded-md transition-colors font-medium border border-eco-mint/30"
                                                    >
                                                        Net Zero
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setOptimizedTonnes(Math.max(0.01, Math.round(((grandTotalCo2e - dynamicCap) / 1000) * 100) / 100))}
                                                        className="text-[10px] px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors font-medium border border-gray-200"
                                                    >
                                                        To Limit
                                                    </button>
                                                )
                                            ) : grandTotalCo2e > 0 && optimizedTonnes !== Math.max(0.01, Math.round((grandTotalCo2e / 1000) * 100) / 100) ? (
                                                <button
                                                    onClick={() => setOptimizedTonnes(Math.max(0.01, Math.round((grandTotalCo2e / 1000) * 100) / 100))}
                                                    className="text-[10px] px-3 py-1 bg-eco-mint/10 hover:bg-eco-mint/20 text-eco-deepgreen rounded-md transition-colors font-medium border border-eco-mint/30"
                                                >
                                                    Net Zero
                                                </button>
                                            ) : null}
                                        </div>
                                        );
                                    })()}
                                </div>
                                
                                <div className="h-10 w-px bg-gray-100 hidden sm:block"></div>
                                
                                <button
                                    onClick={executeOptimizedPurchase}
                                    disabled={!optimalPlan || optimalPlan.plan.length === 0 || isOptimizing || !!optimalPlan.remainingTarget}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-eco-deepgreen hover:to-eco-deepgreen text-white rounded-lg font-medium transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isOptimizing ? 'Optimizing & Buying...' : `Buy Optimal (₹${optimalPlan?.totalCost.toLocaleString() || 0})`}
                                </button>
                            </div>
                        </div>

                        {/* Optimal plan breakdown */}
                        {optimalPlan && optimalPlan.plan.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Optimal Allocation Breakdown</p>
                                <div className="flex flex-wrap gap-2">
                                    {optimalPlan.plan.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
                                            <span className="font-medium text-gray-900">{item.take}t</span>
                                            <span className="text-gray-400">from</span>
                                            <span className="font-medium text-eco-mint">{item.credit.supplier_name || 'Green SME'}</span>
                                            <span className="text-gray-500">(@ ₹{Math.round(item.credit.cost_inr / item.credit.tonnes_offset)}/t)</span>
                                        </div>
                                    ))}
                                    {optimalPlan.remainingTarget > 0 && (
                                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 text-sm text-red-700">
                                            <span className="font-medium">{optimalPlan.remainingTarget}t</span>
                                            <span>unfulfilled (Not enough supply)</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 py-2">
                        <div className="h-px bg-gray-200 flex-1"></div>
                        <p className="text-sm font-medium text-gray-400 uppercase tracking-widest px-2">OR Pick Manually</p>
                        <div className="h-px bg-gray-200 flex-1"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {grouped.map(supplier => {
                        const key             = supplier.supplier_name;
                        const qty             = quantities[key] ?? Math.max(0.01, Math.round(supplier.totalTonnes * 0.1 * 100) / 100);
                        const estimatedCost   = Math.round(qty * supplier.blendedRatePerTonne);
                        const isPurchasing    = purchasingSupplier === key;
                        const cheapestListing = supplier.listings[0];
                        const step            = Math.max(0.01, Math.round(supplier.totalTonnes * 0.1 * 100) / 100);

                        return (
                            <div key={key} className="glass-panel rounded-2xl p-6 transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden group flex flex-col">

                                {/* Glow */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-eco-mint/10 rounded-full blur-3xl group-hover:bg-eco-mint/20 transition-all pointer-events-none" />

                                {/* Card header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-sm font-semibold text-eco-mint uppercase tracking-wider mb-1">Supplier Verified</p>
                                        <h3 className="text-xl font-bold text-gray-900">{supplier.supplier_name}</h3>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {supplier.listings.length} active listing{supplier.listings.length > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <div className="p-2 bg-green-50 rounded-lg shrink-0">
                                        <Award className="w-6 h-6 text-green-600" />
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-500 text-sm">Total Available</span>
                                        <span className="font-bold text-gray-900 flex items-center gap-1">
                                            <TrendingDown className="w-4 h-4 text-green-500" />
                                            {supplier.totalTonnes.toLocaleString()} tonnes CO₂e
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-sm">Rate</span>
                                        <span className="font-medium text-gray-700">
                                            ₹{supplier.blendedRatePerTonne.toLocaleString()} / tonne
                                        </span>
                                    </div>
                                </div>

                                {/* Quantity selector */}
                                <div className="mb-4">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        How much to offset?
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setQuantities(prev => ({
                                                ...prev,
                                                [key]: Math.max(0.01, Math.round((( prev[key] ?? qty) - step) * 1000) / 1000)
                                            }))}
                                            className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition text-gray-600 shrink-0"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <input
                                            type="number"
                                            min={0.01}
                                            max={supplier.totalTonnes}
                                            value={qty}
                                            onChange={e => setQuantities(prev => ({
                                                ...prev,
                                                [key]: Math.min(supplier.totalTonnes, Math.max(0.01, parseFloat(e.target.value) || 0.01))
                                            }))}
                                            step={0.01}
                                            className="flex-1 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-eco-mint/30"
                                        />
                                        <span className="text-xs text-gray-400 shrink-0">tonnes CO₂e</span>
                                        <button
                                            onClick={() => setQuantities(prev => ({
                                                ...prev,
                                                [key]: Math.min(supplier.totalTonnes, Math.round(((prev[key] ?? qty) + step) * 1000) / 1000)
                                            }))}
                                            className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition text-gray-600 shrink-0"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-eco-deepgreen to-eco-mint rounded-full transition-all duration-300"
                                            style={{ width: `${Math.min(100, (qty / supplier.totalTonnes) * 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1 text-right">
                                        {((qty / supplier.totalTonnes) * 100).toFixed(0)}% of total available
                                    </p>
                                </div>

                                {/* Price + Buy */}
                                <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                                    <div>
                                        <p className="text-xs text-gray-400">Estimated Cost</p>
                                        <p className="text-2xl font-bold text-gray-900">₹{estimatedCost.toLocaleString()}</p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (!buyerId || !cheapestListing) return;
                                            setPurchasingSupplier(key);
                                            setErrorMsg('');
                                            // Cap the buy to what the cheapest listing actually has
                                            const buyQty = Math.min(qty, cheapestListing.tonnes_offset);
                                            const success = await purchaseCredit(cheapestListing.id, buyerId, buyQty);
                                            if (success) {
                                                setSuccessMsg(`✅ Offset ${buyQty} tonnes CO₂e (${(buyQty * 1000).toFixed(0)} kg)! Dashboard updated.`);
                                                await fetchCredits();
                                                setTimeout(() => setSuccessMsg(''), 6000);
                                            } else {
                                                setErrorMsg('Purchase failed — please try again.');
                                                setTimeout(() => setErrorMsg(''), 5000);
                                            }
                                            setPurchasingSupplier(null);
                                        }}
                                        disabled={isPurchasing || !buyerId}
                                        className="px-6 py-2.5 bg-gray-900 hover:bg-eco-deepgreen text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        {isPurchasing ? 'Buying…' : `Buy ${qty} t`}
                                    </button>
                                </div>

                                {/* Certificate */}
                                {cheapestListing?.certificate_url && (
                                    <a
                                        href="#"
                                        onClick={e => { e.preventDefault(); alert('Certificate Download currently in Sandbox mode.'); }}
                                        className="block mt-3 text-center text-xs text-eco-mint hover:underline font-medium"
                                    >
                                        View Verification Certificate
                                    </a>
                                )}
                            </div>
                        );
                    })}
                </div>
                </>
            )}
        </div>
    );
}
