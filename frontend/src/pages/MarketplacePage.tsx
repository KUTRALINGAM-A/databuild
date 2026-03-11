import { useState, useEffect } from 'react';
import { Leaf, Award, CheckCircle2, TrendingDown, Minus, Plus } from 'lucide-react';
import { getMarketplaceCredits, purchaseCredit, getMyCompany } from '@/lib/db';
import type { MarketplaceCredit } from '@/lib/db';

export function MarketplacePage() {
    const [credits, setCredits] = useState<MarketplaceCredit[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasingId, setPurchasingId] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [buyerId, setBuyerId] = useState<string | null>(null);

    // Per-card quantity state: creditId → selected kg amount
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    useEffect(() => {
        const init = async () => {
            const company = await getMyCompany();
            if (company) setBuyerId(company.id);
            await fetchCredits();
        };
        init();
    }, []);

    const fetchCredits = async () => {
        setLoading(true);
        const data = await getMarketplaceCredits();
        const available = data.filter(c => !c.credit_type.includes('Retired'));
        setCredits(available);

        // Initialise quantity for each credit to 10% of available (rounded)
        const init: Record<string, number> = {};
        for (const c of available) {
            init[c.id] = Math.max(1, Math.round(c.tonnes_offset * 0.1));
        }
        setQuantities(init);

        setLoading(false);
    };

    const setQty = (id: string, val: number, max: number) => {
        setQuantities(prev => ({ ...prev, [id]: Math.min(max, Math.max(1, Math.round(val))) }));
    };

    const handlePurchase = async (credit: MarketplaceCredit) => {
        if (!buyerId) return;
        const qty = quantities[credit.id] ?? credit.tonnes_offset;
        setPurchasingId(credit.id);
        setErrorMsg('');

        const success = await purchaseCredit(credit.id, buyerId, qty);

        if (success) {
            setSuccessMsg(`✅ Offset ${qty} tonnes CO₂e (${(qty * 1000).toFixed(0)} kg)! Your dashboard total has been updated.`);
            await fetchCredits();
            setTimeout(() => setSuccessMsg(''), 6000);
        } else {
            setErrorMsg('Purchase failed — please try again.');
            setTimeout(() => setErrorMsg(''), 5000);
        }

        setPurchasingId(null);
    };

    // Price scales linearly with how much you buy
    const proratedCost = (credit: MarketplaceCredit, qty: number) =>
        Math.round((qty / credit.tonnes_offset) * credit.cost_inr);

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

            {/* Toast messages */}
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
            ) : credits.length === 0 ? (
                <div className="glass-panel text-center py-20 rounded-2xl border border-dashed border-gray-300">
                    <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700">The Market is Empty</h3>
                    <p className="text-gray-500 mt-2">All available carbon credits have been purchased.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {credits.map(credit => {
                        const qty = quantities[credit.id] ?? Math.round(credit.tonnes_offset);
                        const cost = proratedCost(credit, qty);
                        const isPurchasing = purchasingId === credit.id;

                        return (
                            <div key={credit.id} className="glass-panel rounded-2xl p-6 transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden group flex flex-col">

                                {/* Glow */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-eco-mint/10 rounded-full blur-3xl group-hover:bg-eco-mint/20 transition-all pointer-events-none" />

                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-sm font-semibold text-eco-mint uppercase tracking-wider mb-1">Supplier Verified</p>
                                        <h3 className="text-xl font-bold text-gray-900">{credit.supplier_name}</h3>
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
                                            {credit.tonnes_offset.toLocaleString()} tonnes CO₂e
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 text-sm">Rate</span>
                                        <span className="font-medium text-gray-700">
                                            ₹{Math.round(credit.cost_inr / credit.tonnes_offset).toLocaleString()} / tonne
                                        </span>
                                    </div>
                                </div>

                                {/* Quantity Selector */}
                                <div className="mb-4">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        How much to offset?
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setQty(credit.id, qty - Math.max(1, Math.round(credit.tonnes_offset * 0.1)), credit.tonnes_offset)}
                                            className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition text-gray-600 shrink-0"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <input
                                            type="number"
                                            min={1}
                                            max={credit.tonnes_offset}
                                            value={qty}
                                            onChange={e => setQty(credit.id, parseFloat(e.target.value) || 0.01, credit.tonnes_offset)}
                                            step={0.01}
                                            className="flex-1 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-eco-mint/30"
                                        />
                                        <span className="text-xs text-gray-400 shrink-0">tonnes CO₂e</span>
                                        <button
                                            onClick={() => setQty(credit.id, qty + Math.max(1, Math.round(credit.tonnes_offset * 0.1)), credit.tonnes_offset)}
                                            className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition text-gray-600 shrink-0"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                    {/* Progress bar showing fraction selected */}
                                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-eco-deepgreen to-eco-mint rounded-full transition-all duration-300"
                                            style={{ width: `${Math.min(100, (qty / credit.tonnes_offset) * 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1 text-right">
                                        {((qty / credit.tonnes_offset) * 100).toFixed(0)}% of listing
                                    </p>
                                </div>

                                {/* Price + Buy */}
                                <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                                    <div>
                                        <p className="text-xs text-gray-400">Total Cost</p>
                                        <p className="text-2xl font-bold text-gray-900">₹{cost.toLocaleString()}</p>
                                    </div>
                                    <button
                                        onClick={() => handlePurchase(credit)}
                                        disabled={isPurchasing || !buyerId}
                                        className="px-6 py-2.5 bg-gray-900 hover:bg-eco-deepgreen text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        {isPurchasing ? 'Buying…' : `Buy ${qty} kg`}
                                    </button>
                                </div>

                                {/* Certificate link */}
                                {credit.certificate_url && (
                                    <a
                                        href="#"
                                        onClick={e => { e.preventDefault(); alert("Certificate Download currently in Sandbox mode."); }}
                                        className="block mt-3 text-center text-xs text-eco-mint hover:underline font-medium"
                                    >
                                        View Verification Certificate
                                    </a>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
