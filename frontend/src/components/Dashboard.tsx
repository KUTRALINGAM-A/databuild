import { useState, useEffect } from 'react';
import { Activity, Zap, Factory, AlertTriangle, ArrowRight, ShieldCheck, Sprout, RefreshCw, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMyCompany, getMyCarbonLedger, getMyVendors, getIndustryAverages } from '@/lib/db';
import type { CompanyRow, CarbonLedgerRow, IndustryAverageRow } from '@/lib/db';
import { useNavigate } from 'react-router-dom';


export function Dashboard() {
    const navigate = useNavigate();
    const [company, setCompany] = useState<CompanyRow | null>(null);
    const [ledger, setLedger] = useState<CarbonLedgerRow[]>([]);
    const [vendors, setVendors] = useState<CompanyRow[]>([]);
    const [industryAvgs, setIndustryAvgs] = useState<IndustryAverageRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRedVendor, setSelectedRedVendor] = useState<CompanyRow | null>(null);

    const load = async () => {
        setLoading(true);
        
        // 1) Fetch user's company first to avoid duplicating database `getUser()` auth checks
        const co = await getMyCompany();
        if (!co) {
            setLoading(false);
            return;
        }

        // 2) Fetch the rest of the data safely without hitting N+1 getMyCompany calls
        const [led, ven, avgs] = await Promise.all([
            getMyCarbonLedger(co.id),
            getMyVendors(co.id),
            getIndustryAverages(),
        ]);

        setCompany(co);
        setLedger(led);
        setVendors(ven);
        setIndustryAvgs(avgs);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    // ── Computed metrics ──────────────────────────────────────────────────────
    const totalCo2e = ledger.reduce((s, r) => s + r.calculated_co2e, 0);
    const energyCo2e = ledger.filter(r => r.metric_unit === 'KWh').reduce((s, r) => s + r.raw_metric, 0);
    const scope3Co2e = vendors.reduce((s, v) => s + (v.total_co2e ?? 0), 0);
    const breachCount = vendors.filter(v => v.status === 'Red').length;
    const carbonCap = company?.carbon_cap ?? 10000;
    const capPercent = Math.min((totalCo2e / carbonCap) * 100, 100);

    // Smart Switch alternatives pulled from industry averages
    const getAlternatives = (vendor: CompanyRow) => {
        const industryCap = industryAvgs.find(a => a.industry === vendor.industry)?.avg_co2e ?? 8000;
        return [
            { name: `Eco-${vendor.industry} Partner A`, co2e: Math.round(industryCap * 0.75), reduction: '25%' },
            { name: `Green${vendor.industry} Ltd.`, co2e: Math.round(industryCap * 0.85), reduction: '15%' },
        ];
    };

    if (loading) return (
        <div className="w-full max-w-6xl mx-auto flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-eco-mint/30 border-t-eco-mint rounded-full animate-spin" />
                <p className="text-eco-graphite/60 text-sm font-medium">Loading your carbon data…</p>
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8">

            {/* Company banner */}
            {company && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-eco-deepgreen">{company.name}</h2>
                        <p className="text-eco-graphite/70 text-sm">{company.industry} · Carbon Cap: {carbonCap.toLocaleString()} kg CO₂e / year</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => navigate('/newform')} 
                            className="flex items-center gap-2 px-4 py-2 bg-eco-deepgreen text-white text-sm font-bold rounded-xl shadow-md hover:bg-eco-teal transition-all"
                        >
                            <FileText className="w-4 h-4" />
                            Enter Carbon Data
                        </button>
                        <button onClick={load} className="p-2 rounded-xl border border-eco-graphite/20 text-eco-graphite/60 hover:text-eco-deepgreen hover:bg-white/50 transition bg-white/30">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Cap progress bar */}
            {company && (
                <div className="glass-panel p-4 outline-none border border-zinc-800 shadow-[0_4px_30px_rgba(0,0,0,0.1)] rounded-2xl relative overflow-hidden group">
                    {/* Glassmorphism shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 relative z-10 space-y-2 md:space-y-0">
                        <div>
                            <span className="text-sm font-bold text-eco-deepgreen block mb-1">Dynamic Carbon Cap Limit (PAT Scheme)</span>
                            {company.production_volume ? (
                                <div className="flex flex-wrap items-center gap-2 text-xs text-eco-graphite/70">
                                    <span className="bg-white px-2 py-1 border border-eco-graphite/10 rounded-md shadow-sm">{company.production_volume.toLocaleString()} {company.production_unit}</span>
                                    <span>×</span>
                                    <span className="bg-white px-2 py-1 border border-eco-graphite/10 rounded-md shadow-sm">{company.industry_emission_factor} kg/unit (Benchmark)</span>
                                    <span>=</span>
                                    <span className="text-eco-deepgreen font-bold">{carbonCap.toLocaleString()} kg CO₂e Allowed</span>
                                </div>
                            ) : (
                                <span className="text-xs text-eco-graphite/70">Fixed limit configuration</span>
                            )}
                        </div>
                        <span className={cn("px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md",
                            capPercent >= 100 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                capPercent >= 80 ? 'bg-eco-ochre/20 text-eco-ochre border border-eco-ochre/30' :
                                    'bg-eco-mint/20 text-eco-mint border border-eco-mint/30')}>
                            {capPercent.toFixed(1)}% Capacity Used
                        </span>
                    </div>

                    <div className="h-3 bg-white/60 rounded-full overflow-hidden border border-eco-graphite/10 shadow-inner relative z-10">
                        <div
                            className={cn("h-full rounded-full transition-all duration-1000 ease-out shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]",
                                capPercent >= 100 ? "bg-gradient-to-r from-red-600 to-red-400" :
                                    capPercent >= 80 ? "bg-gradient-to-r from-eco-ochre to-yellow-400" :
                                        "bg-gradient-to-r from-eco-deepgreen to-eco-mint")}
                            style={{ width: `${capPercent}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[11px] font-medium text-eco-graphite/70 mt-2 relative z-10">
                        <span>0 kg</span>
                        <span className={capPercent >= 100 ? "text-red-500 font-bold" : ""}>{totalCo2e.toLocaleString()} kg Emitted</span>
                        <span>{carbonCap.toLocaleString()} kg Limit</span>
                    </div>
                </div>
            )}

            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Activity className="w-24 h-24" />
                    </div>
                    <p className="text-eco-graphite/60 font-medium mb-1 relative z-10">My Footprint (Scope 1+2)</p>
                    <h3 className="text-4xl font-bold text-eco-deepgreen relative z-10">
                        {totalCo2e > 0 ? totalCo2e.toLocaleString() : '—'}
                        <span className="text-lg text-eco-graphite/60 font-medium"> kg CO₂e</span>
                    </h3>
                    <div className="mt-4 flex items-center space-x-2 text-sm text-eco-mint bg-eco-mint/10 w-max px-3 py-1 rounded-full border border-eco-mint/20 relative z-10">
                        <Activity className="w-4 h-4" /><span>{ledger.length} records tracked</span>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap className="w-24 h-24 text-eco-ochre" />
                    </div>
                    <p className="text-eco-graphite/60 font-medium mb-1 relative z-10">Energy Consumption</p>
                    <h3 className="text-4xl font-bold text-eco-deepgreen relative z-10">
                        {energyCo2e > 0 ? energyCo2e.toLocaleString() : '—'}
                        <span className="text-lg text-eco-graphite/60 font-medium"> kWh</span>
                    </h3>
                    <div className="mt-4 flex items-center space-x-2 text-sm text-eco-ochre bg-eco-ochre/10 w-max px-3 py-1 rounded-full border border-eco-ochre/20 relative z-10">
                        <Zap className="w-4 h-4" /><span>Scope 2 from uploads</span>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-red-500">
                        <Factory className="w-24 h-24" />
                    </div>
                    <p className="text-eco-graphite/60 font-medium mb-1 relative z-10">Supply Chain (Scope 3)</p>
                    <h3 className="text-4xl font-bold text-eco-deepgreen relative z-10">
                        {scope3Co2e.toLocaleString()}
                        <span className="text-lg text-eco-graphite/60 font-medium"> kg CO₂e</span>
                    </h3>
                    <div className={cn("mt-4 flex items-center space-x-2 text-sm w-max px-3 py-1 rounded-full border relative z-10",
                        breachCount > 0 ? "text-red-400 bg-red-400/10 border-red-500/20" : "text-eco-mint bg-eco-mint/10 border-eco-mint/20")}>
                        <AlertTriangle className="w-4 h-4" />
                        <span>{breachCount > 0 ? `${breachCount} Vendor${breachCount > 1 ? 's' : ''} Above Cap` : 'All Vendors Compliant'}</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Vendors List */}
                <div className="lg:col-span-2 glass-panel rounded-2xl p-6 sm:p-8">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-eco-deepgreen mb-1">Supply Chain Nodes</h3>
                            <p className="text-sm text-eco-graphite/70">Track carbon scores of registered vendors.</p>
                        </div>
                        <div className="flex space-x-4 text-sm font-medium">
                            <span className="flex items-center text-eco-mint"><span className="w-2 h-2 rounded-full bg-eco-mint mr-2 shadow-[0_0_8px_rgba(64,145,108,0.8)]" /> Compliant</span>
                            <span className="flex items-center text-red-400"><span className="w-2 h-2 rounded-full bg-red-500 mr-2 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" /> Breach</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {vendors.length === 0 ? (
                            <div className="p-8 text-center border border-dashed border-eco-graphite/20 rounded-xl bg-white/20">
                                <Factory className="w-8 h-8 text-eco-graphite/30 mx-auto mb-3" />
                                <p className="text-sm font-medium text-eco-graphite/60">No supply chain nodes found.</p>
                                <p className="text-xs text-eco-graphite/40 mt-1">Vendors added to your supply chain will appear here directly from the database.</p>
                            </div>
                        ) : (
                            vendors.map((vendor) => (
                                <div
                                    key={vendor.id}
                                    onClick={() => vendor.status === 'Red' && setSelectedRedVendor(vendor)}
                                    className={cn(
                                        "p-4 rounded-xl border flex flex-wrap sm:flex-nowrap justify-between items-center transition-all duration-300 relative overflow-hidden group",
                                        vendor.status === 'Red' ? "border-eco-ochre/30 bg-eco-ochre/5 cursor-pointer hover:bg-eco-ochre/10 hover:shadow-[0_4px_20px_rgba(217,160,111,0.15)]" : "border-eco-graphite/10 bg-white/40"
                                    )}
                                >
                                    <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500",
                                        vendor.status === 'Red' ? "bg-gradient-to-r from-eco-ochre/50 to-transparent" : "bg-gradient-to-r from-eco-basegray to-transparent"
                                    )} />

                                    <div className="w-full sm:w-auto mb-4 sm:mb-0 relative z-10">
                                        <div className="flex items-center space-x-3 mb-1">
                                            <div className={cn("w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]",
                                                vendor.status === 'Green' ? "text-eco-mint bg-eco-mint" : "text-red-500 bg-red-500 animate-pulse"
                                            )} />
                                            <h4 className="font-semibold text-lg text-eco-deepgreen">{vendor.name}</h4>
                                        </div>
                                        <p className="text-sm text-eco-graphite/70 ml-5">{vendor.industry}</p>
                                    </div>

                                    <div className="flex items-center space-x-8 relative z-10">
                                        <div className="text-right">
                                            <p className="text-xs font-semibold text-eco-graphite/60 mb-1 uppercase tracking-wider">Carbon Emitted</p>
                                            <p className={cn("font-bold text-lg", vendor.status === 'Red' ? "text-eco-ochre" : "text-eco-teal")}>
                                                {(vendor.total_co2e ?? 0).toLocaleString()} <span className="text-xs font-medium opacity-70">kg</span>
                                            </p>
                                        </div>
                                        <div className="text-right hidden sm:block">
                                            <p className="text-xs font-semibold text-eco-graphite/60 mb-1 uppercase tracking-wider">Carbon Cap</p>
                                            <p className="font-bold text-lg text-eco-teal">{vendor.carbon_cap.toLocaleString()} <span className="text-xs font-medium opacity-70">kg</span></p>
                                        </div>
                                    </div>

                                    {vendor.status === 'Red' && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 hidden sm:block">
                                            <ArrowRight className="w-6 h-6" />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Smart Switch */}
                <div className="glass-panel rounded-2xl p-6 sm:p-8 flex flex-col h-full border-eco-graphite/10 shadow-xl overflow-hidden">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-gradient-to-br from-eco-mint to-eco-deepgreen rounded-lg shadow-[0_4px_15px_rgba(64,145,108,0.2)]">
                            <ShieldCheck className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-eco-mint to-eco-teal">
                            Smart Switch Engine
                        </h3>
                    </div>

                    {!selectedRedVendor ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
                            <div className="w-16 h-16 rounded-full bg-eco-basegray flex items-center justify-center border border-eco-graphite/10 shadow-inner">
                                <AlertTriangle className="w-8 h-8 text-eco-graphite/40" />
                            </div>
                            <p className="text-eco-graphite/70 text-sm max-w-[250px] font-medium">
                                Select a non-compliant vendor to view greener, verified alternatives in their industry.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 fade-in duration-300">
                            <div className="mb-6 p-4 rounded-xl bg-eco-ochre/10 border border-eco-ochre/30 text-sm">
                                <span className="text-eco-ochre font-bold block mb-1">Breach Detected</span>
                                <span className="text-eco-graphite font-medium">
                                    {selectedRedVendor.name} is {(((selectedRedVendor.total_co2e ?? 0) - selectedRedVendor.carbon_cap) / selectedRedVendor.carbon_cap * 100).toFixed(1)}% above their carbon cap.
                                </span>
                            </div>

                            <h4 className="text-sm font-bold text-eco-graphite/60 uppercase tracking-wider mb-4">Recommended Actions</h4>

                            <div className="space-y-4 flex-1">
                                {getAlternatives(selectedRedVendor).map((alt, i) => (
                                    <div key={i} className="p-4 rounded-xl border border-eco-teal/30 bg-white/50 hover:bg-white/80 hover:border-eco-mint/50 transition-all cursor-pointer shadow-sm group">
                                        <div className="flex justify-between items-start mb-2">
                                            <h5 className="font-bold text-eco-deepgreen group-hover:text-eco-teal transition-colors">Switch to {alt.name}</h5>
                                            <span className="bg-eco-mint/20 text-eco-deepgreen text-xs px-2 py-1 rounded font-bold border border-eco-mint/30">-{alt.reduction}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-eco-graphite/60">Emissions Avg:</span>
                                            <span className="font-bold text-eco-teal">{alt.co2e.toLocaleString()} kg</span>
                                        </div>
                                    </div>
                                ))}

                                <div className="p-4 rounded-xl border border-eco-teal/40 bg-eco-teal/5 hover:bg-eco-teal/10 hover:border-eco-mint/70 transition-all cursor-pointer shadow-sm group">
                                    <div className="flex justify-between items-start mb-2">
                                        <h5 className="font-bold text-eco-deepgreen group-hover:text-eco-teal transition-colors flex items-center gap-2">
                                            <Sprout className="w-4 h-4 text-eco-mint" />
                                            Buy Carbon Credits via CCTS
                                        </h5>
                                        <span className="bg-eco-mint/20 text-eco-deepgreen text-xs px-2 py-1 rounded font-bold border border-eco-mint/30">Offset Breach</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-eco-graphite/60">Cost to clear {((selectedRedVendor.total_co2e ?? 0) - selectedRedVendor.carbon_cap).toLocaleString()} kg:</span>
                                        <span className="font-bold text-eco-teal">₹{(((selectedRedVendor.total_co2e ?? 0) - selectedRedVendor.carbon_cap) * 4.17).toFixed(0)}</span>
                                    </div>
                                </div>
                            </div>

                            <button className="mt-6 w-full py-3 bg-eco-deepgreen text-white font-bold justify-center rounded-xl flex items-center space-x-2 shadow-md hover:bg-eco-teal transition-colors">
                                <span>Take Action</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
