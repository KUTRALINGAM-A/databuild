import React, { useState } from 'react';
import { Activity, Zap, Factory, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type Vendor = {
    id: string;
    name: string;
    industry: string;
    co2e: number;
    cap: number;
    status: 'Green' | 'Red';
};

const mockVendors: Vendor[] = [
    { id: '1', name: 'Global Freight Logistics', industry: 'Shipping', co2e: 4200, cap: 5000, status: 'Green' },
    { id: '2', name: 'Apex Manufacturing Co.', industry: 'Manufacturing', co2e: 9800, cap: 8000, status: 'Red' },
    { id: '3', name: 'CloudServe Datacenters', industry: 'IT Infrastructure', co2e: 1200, cap: 2000, status: 'Green' },
];

const mockAlternatives = [
    { name: 'Eco-Fabricators Ltd.', co2e: 6100, reduction: '38%' },
    { name: 'GreenBuild Manufacturing', co2e: 7200, reduction: '27%' },
];

export function Dashboard() {
    const [selectedRedVendor, setSelectedRedVendor] = useState<Vendor | null>(null);

    const totalFootprint = 15200;

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8">

            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Activity className="w-24 h-24" />
                    </div>
                    <p className="text-zinc-400 font-medium mb-1 relative z-10">Total Company Footprint</p>
                    <h3 className="text-4xl font-bold text-white relative z-10">{totalFootprint.toLocaleString()} <span className="text-lg text-zinc-500 font-normal">kg CO2e</span></h3>
                    <div className="mt-4 flex items-center space-x-2 text-sm text-green-400 bg-green-400/10 w-max px-3 py-1 rounded-full border border-green-500/20 relative z-10">
                        <Activity className="w-4 h-4" />
                        <span>Scope 1 & 2 Combined</span>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap className="w-24 h-24 text-yellow-500" />
                    </div>
                    <p className="text-zinc-400 font-medium mb-1 relative z-10">Energy Consumption</p>
                    <h3 className="text-4xl font-bold text-white relative z-10">142,500 <span className="text-lg text-zinc-500 font-normal">kWh</span></h3>
                    <div className="mt-4 flex items-center space-x-2 text-sm text-yellow-400 bg-yellow-400/10 w-max px-3 py-1 rounded-full border border-yellow-500/20 relative z-10">
                        <Zap className="w-4 h-4" />
                        <span>-5% from last month</span>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-red-500">
                        <Factory className="w-24 h-24" />
                    </div>
                    <p className="text-zinc-400 font-medium mb-1 relative z-10">Supply Chain (Scope 3)</p>
                    <h3 className="text-4xl font-bold text-white relative z-10">15,200 <span className="text-lg text-zinc-500 font-normal">kg CO2e</span></h3>
                    <div className="mt-4 flex items-center space-x-2 text-sm text-red-400 bg-red-400/10 w-max px-3 py-1 rounded-full border border-red-500/20 relative z-10">
                        <AlertTriangle className="w-4 h-4" />
                        <span>1 Vendor Above Cap</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Vendors List */}
                <div className="lg:col-span-2 glass-panel rounded-2xl p-6 sm:p-8">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1">Supply Chain Nodes</h3>
                            <p className="text-sm text-zinc-400">Track carbon scores of registered vendors.</p>
                        </div>
                        <div className="flex space-x-4 text-sm font-medium">
                            <span className="flex items-center text-green-400"><span className="w-2 h-2 rounded-full bg-green-500 mr-2 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span> Compliant</span>
                            <span className="flex items-center text-red-400 text-glow"><span className="w-2 h-2 rounded-full bg-red-500 mr-2 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></span> Breach</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {mockVendors.map((vendor) => (
                            <div
                                key={vendor.id}
                                onClick={() => vendor.status === 'Red' && setSelectedRedVendor(vendor)}
                                className={cn(
                                    "p-4 rounded-xl border flex flex-wrap sm:flex-nowrap justify-between items-center transition-all duration-300 relative overflow-hidden group",
                                    vendor.status === 'Red' ? "border-red-900/50 bg-red-950/20 cursor-pointer hover:bg-red-900/30 hover:shadow-[0_0_20px_rgba(220,38,38,0.2)]" : "border-zinc-800 bg-zinc-800/20"
                                )}
                            >
                                {/* Background Accent Gradient */}
                                <div className={cn(
                                    "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500",
                                    vendor.status === 'Red' ? "bg-gradient-to-r from-red-600 to-transparent" : "bg-gradient-to-r from-zinc-600 to-transparent"
                                )} />

                                <div className="w-full sm:w-auto mb-4 sm:mb-0 relative z-10">
                                    <div className="flex items-center space-x-3 mb-1">
                                        <div className={cn(
                                            "w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]",
                                            vendor.status === 'Green' ? "text-green-500 bg-green-500" : "text-red-500 bg-red-500 animate-pulse"
                                        )} />
                                        <h4 className="font-semibold text-lg text-zinc-100">{vendor.name}</h4>
                                    </div>
                                    <p className="text-sm text-zinc-500 ml-5">{vendor.industry}</p>
                                </div>

                                <div className="flex items-center space-x-8 relative z-10">
                                    <div className="text-right">
                                        <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">Carbon Emitted</p>
                                        <p className={cn(
                                            "font-bold text-lg",
                                            vendor.status === 'Red' ? "text-red-400" : "text-zinc-200"
                                        )}>
                                            {vendor.co2e.toLocaleString()} <span className="text-xs font-normal opacity-70">kg</span>
                                        </p>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">Carbon Cap</p>
                                        <p className="font-bold text-lg text-zinc-200">{vendor.cap.toLocaleString()} <span className="text-xs font-normal opacity-70">kg</span></p>
                                    </div>
                                </div>

                                {vendor.status === 'Red' && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 hidden sm:block">
                                        <ArrowRight className="w-6 h-6" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Smart Switch Recommendation Engine UI */}
                <div className="glass-panel rounded-2xl p-6 sm:p-8 flex flex-col h-full border-zinc-700/50 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="p-2 bg-gradient-to-br from-green-400 to-emerald-600 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                            <ShieldCheck className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
                            Smart Switch Engine
                        </h3>
                    </div>

                    {!selectedRedVendor ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
                            <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center border border-zinc-700">
                                <AlertTriangle className="w-8 h-8 text-zinc-600" />
                            </div>
                            <p className="text-zinc-400 text-sm max-w-[250px]">
                                Select a non-compliant vendor to view greener, verified alternatives in their industry.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 fade-in duration-300">
                            <div className="mb-6 p-4 rounded-xl bg-red-950/30 border border-red-900/50 text-sm">
                                <span className="text-red-400 font-semibold block mb-1">Breach Detected</span>
                                <span className="text-zinc-300">{selectedRedVendor.name} is {((selectedRedVendor.co2e - selectedRedVendor.cap) / selectedRedVendor.cap * 100).toFixed(1)}% above their carbon cap.</span>
                            </div>

                            <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Recommended Alternatives</h4>

                            <div className="space-y-4 flex-1">
                                {mockAlternatives.map((alt, i) => (
                                    <div key={i} className="p-4 rounded-xl border border-green-900/30 bg-green-950/10 hover:bg-green-900/20 hover:border-green-500/50 transition-all cursor-pointer group">
                                        <div className="flex justify-between items-start mb-2">
                                            <h5 className="font-semibold text-green-100 group-hover:text-green-300 transition-colors">{alt.name}</h5>
                                            <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded font-bold border border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]">-{alt.reduction}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-zinc-500">Emissions Avg:</span>
                                            <span className="font-medium text-green-200">{alt.co2e.toLocaleString()} kg</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button className="mt-6 w-full py-3 bg-zinc-100 text-zinc-900 font-bold justify-center rounded-xl flex items-center space-x-2 hover:bg-white transition-colors">
                                <span>Initiate Supplier Switch</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
