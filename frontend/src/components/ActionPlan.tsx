import { useState, useEffect } from 'react';
import { 
    Coins, 
    Zap, 
    ArrowRight, 
    TrendingUp, 
    Clock, 
    ShieldCheck, 
    BarChart3, 
    AlertCircle,
    CheckCircle2,
    Building2,
    RefreshCw,
    Loader2
} from 'lucide-react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip as RechartTooltip, 
    ResponsiveContainer,
    Cell
} from 'recharts';
import { getMyCompany } from '@/lib/db';

interface StrategyOption {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    financial_cost: number;
    time_to_compliance: string;
    difficulty: string;
    roi: string;
    tonnes_saved: number;
}

interface ActionPlanData {
    summary: {
        total_co2e: number;
        carbon_cap: number;
        deficit_tonnes: number;
        status: string;
    };
    options: StrategyOption[];
}

export function ActionPlan() {
    const [data, setData] = useState<ActionPlanData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    const loadPlan = async () => {
        try {
            setLoading(true);
            const company = await getMyCompany();
            if (!company) throw new Error("No company found");

            const baseUrl = (import.meta as any).env.VITE_BACKEND_URL || 'http://localhost:8000';
            const res = await fetch(`${baseUrl}/api/strategy/action-plan?company_id=${company.id}`);
            const json = await res.json();
            
            if (json.status === 'success') {
                setData(json.data);
            } else {
                throw new Error("Failed to load action plan");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPlan();
    }, []);

    if (loading) return (
        <div className="w-full flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 text-eco-mint animate-spin" />
            <p className="text-eco-graphite/60 font-medium italic">Running ROI simulations for your business...</p>
        </div>
    );

    if (error || !data) return (
        <div className="p-8 bg-red-50 border border-red-100 rounded-3xl text-red-800">
            <h3 className="font-bold flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5" />
                Strategy Engine Error
            </h3>
            <p className="text-sm opacity-80">{error || "Could not generate action plan at this time."}</p>
        </div>
    );

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    };

    const chartData = data.options.map(opt => ({
        name: opt.title.split(' ')[0], // Use first word of title for chart axis
        cost: opt.financial_cost,
        tonnes: opt.tonnes_saved,
        fullName: opt.title
    }));

    const bestOption = data.options[data.options.length - 1]; // Usually the long-term one
    const recommendation = data.options.find(o => o.id === 'C') || bestOption;

    return (
        <div className="w-full max-w-6xl mx-auto pb-20">
            {/* Header Section */}
            <div className="mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-eco-mint/10 border border-eco-mint/20 text-eco-deepgreen text-xs font-bold mb-4 uppercase tracking-wider">
                    <TrendingUp className="w-3.5 h-3.5" />
                    CFO Decarbonization ROI Engine
                </div>
                <h1 className="text-4xl font-black text-eco-deepgreen mb-3 tracking-tight">
                    Strategic Compliance Roadmap
                </h1>
                <p className="text-gray-500 max-w-2xl text-lg leading-relaxed">
                    Financial strategies to bring your emissions under the <span className="font-bold text-eco-graphite">{data.summary.carbon_cap.toLocaleString()} kg</span> cap.
                </p>
            </div>

            {/* Top Summary Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Company Status</p>
                    <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${data.summary.status === 'Red' ? 'bg-red-500 animate-pulse' : 'bg-eco-mint'}`} />
                        <p className={`text-xl font-black ${data.summary.status === 'Red' ? 'text-red-600' : 'text-eco-deepgreen'}`}>
                            {data.summary.status === 'Red' ? 'Over Cap' : 'Compliant'}
                        </p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Delta to Goal</p>
                    <p className="text-xl font-black text-eco-graphite">
                        {data.summary.deficit_tonnes.toFixed(1)} Tonnes
                    </p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Annual Emissions</p>
                    <p className="text-xl font-black text-eco-graphite">
                        {(data.summary.total_co2e / 1000).toFixed(1)} T
                    </p>
                </div>
                <div className="bg-eco-deepgreen p-6 rounded-3xl shadow-lg border border-eco-deepgreen">
                    <p className="text-xs text-white/60 font-bold uppercase mb-1">Best ROI Strategy</p>
                    <p className="text-xl font-black text-white">{recommendation.title}</p>
                </div>
            </div>

            {/* Main Strategies */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                {data.options.map((opt) => (
                    <div 
                        key={opt.id}
                        onClick={() => setSelectedOption(opt.id)}
                        className={`group relative flex flex-col p-8 rounded-[2.5rem] border-2 transition-all cursor-pointer hover:shadow-2xl hover:-translate-y-1 ${
                            selectedOption === opt.id 
                                ? 'bg-white border-eco-mint shadow-xl' 
                                : 'bg-white/60 border-gray-100 hover:border-eco-mint/30 shadow-sm'
                        }`}
                    >
                        {/* Option Tag */}
                        <div className="absolute -top-3 left-8 px-4 py-1 rounded-full bg-eco-graphite text-white text-[10px] font-black uppercase tracking-widest z-10 shadow-md">
                            Option {opt.id}
                        </div>

                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-2xl font-black text-eco-deepgreen">{opt.title}</h3>
                                {opt.id === 'A' && <Coins className="w-6 h-6 text-amber-500" />}
                                {opt.id === 'B' && <RefreshCw className="w-6 h-6 text-eco-mint" />}
                                {opt.id === 'C' && <Zap className="w-6 h-6 text-blue-500" />}
                            </div>
                            <p className="text-eco-mint font-bold text-xs uppercase tracking-tight">{opt.subtitle}</p>
                        </div>

                        <p className="text-sm text-gray-500 leading-relaxed mb-8 flex-grow">
                            {opt.description}
                        </p>

                        <div className="space-y-4 pt-6 border-t border-gray-50">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                                    <Coins className="w-3 h-3" /> Financial Cost
                                </span>
                                <span className="text-sm font-black text-eco-graphite">{formatCurrency(opt.financial_cost)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                                    <BarChart3 className="w-3 h-3" /> Carbon Offset
                                </span>
                                <span className="text-sm font-bold text-eco-mint">{opt.tonnes_saved.toFixed(1)} tonnes</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                                    <Clock className="w-3 h-3" /> Timeframe
                                </span>
                                <span className="text-sm font-bold text-eco-graphite">{opt.time_to_compliance}</span>
                            </div>
                            <div className="flex justify-between items-center bg-gray-50 -mx-4 px-4 py-2 rounded-xl mt-2">
                                <span className="text-xs text-gray-500 font-bold flex items-center gap-1.5">
                                    <TrendingUp className="w-3 h-3" /> CFO Metrics
                                </span>
                                <span className="text-xs font-black text-eco-mint bg-white border border-eco-mint/20 px-2 py-0.5 rounded-lg shadow-sm">
                                    {opt.roi}
                                </span>
                            </div>
                        </div>

                        <button className={`w-full mt-8 py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
                            selectedOption === opt.id
                                ? 'bg-eco-deepgreen text-white shadow-lg'
                                : 'bg-gray-100 text-gray-400 group-hover:bg-eco-mint group-hover:text-white'
                        }`}>
                            Execute Strategy <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Analysis Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-eco-graphite rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-eco-mint/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                    
                    <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
                        <BarChart3 className="w-6 h-6 text-eco-mint" />
                        Cost vs. Impact Analysis
                    </h3>

                    <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2D6A4F20" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#ffffff60', fontSize: 12, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis hide />
                                <RechartTooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#1B4332', 
                                        border: 'none', 
                                        borderRadius: '16px', 
                                        color: '#fff',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                                    }}
                                    cursor={{ fill: 'transparent' }}
                                />
                                <Bar dataKey="cost" radius={[15, 15, 15, 15]} barSize={40}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 2 ? '#40916C' : '#ffffff20'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    
                    <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-[10px] text-white/40 font-bold uppercase mb-1">Cheapest</p>
                            <p className="text-sm font-bold">{data.options[0].id === 'A' ? 'Option A' : 'Strategy A'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-white/40 font-bold uppercase mb-1">Max Impact</p>
                            <p className="text-sm font-bold text-eco-mint">{recommendation.id === 'C' ? 'Option C' : 'Strategy C'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-white/40 font-bold uppercase mb-1">Fastest</p>
                            <p className="text-sm font-bold">Option A</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm flex flex-col">
                    <h3 className="text-2xl font-black mb-6 text-eco-deepgreen flex items-center gap-3">
                        <ShieldCheck className="w-6 h-6 text-eco-mint" />
                        CFO Recommendation
                    </h3>
                    
                    <div className="space-y-6 flex-grow">
                        <div className="p-6 rounded-3xl bg-gray-50 border border-gray-100">
                            <p className="text-sm text-gray-600 italic leading-relaxed">
                                "Based on your current emission intensity, **{recommendation.title}** represents the highest net-present value. This strategy addresses long-term systemic risk and provides the most favorable decarbonization-to-cost ratio for your industry."
                            </p>
                            <div className="flex items-center gap-2 mt-4 text-eco-mint">
                                <CheckCircle2 className="w-4 h-4 fill-eco-mint text-white" />
                                <span className="text-xs font-black uppercase tracking-widest">Highly Advised</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                                    <AlertCircle className="w-4 h-4 text-orange-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-eco-graphite">Tax Advantage</p>
                                    <p className="text-[10px] text-gray-400">Strategy qualifies for relevant green incentive programs.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                    <Building2 className="w-4 h-4 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-eco-graphite">Market Signal</p>
                                    <p className="text-[10px] text-gray-400">Green energy assets boost ESG rating by 15%.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button className="w-full mt-8 py-4 bg-eco-mint text-white rounded-[1.5rem] font-black tracking-wide shadow-lg shadow-eco-mint/30 hover:shadow-xl hover:-translate-y-1 transition-all">
                        GENERATE FINANCIAL PROPOSAL
                    </button>
                </div>
            </div>
        </div>
    );
}
