import { useState } from 'react';
import { ArrowRight, Loader2, Target, Users, Landmark, Factory, Scale, Info } from 'lucide-react';
import { updateCompanyMetrics } from '@/lib/db';
import { useNavigate } from 'react-router-dom';

export function Newform() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form fields
    const [baseline_co2e, setBaseline_co2e] = useState('');
    const [target_co2e, setTarget_co2e] = useState('');
    const [target_year, setTarget_year] = useState('');
    const [employee_count, setEmployee_count] = useState('');
    const [annual_revenue_cr, setAnnual_revenue_cr] = useState('');
    const [production_volume, setProduction_volume] = useState('');
    const [production_unit, setProduction_unit] = useState('');
    const [industry_emission_factor, setIndustry_emission_factor] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await updateCompanyMetrics({
                baseline_co2e: baseline_co2e ? Number(baseline_co2e) : undefined,
                target_co2e: target_co2e ? Number(target_co2e) : undefined,
                target_year: target_year ? parseInt(target_year, 10) : undefined,
                employee_count: employee_count ? parseInt(employee_count, 10) : undefined,
                annual_revenue_cr: annual_revenue_cr ? Number(annual_revenue_cr) : undefined,
                production_volume: production_volume ? Number(production_volume) : undefined,
                production_unit: production_unit || undefined,
                industry_emission_factor: industry_emission_factor ? Number(industry_emission_factor) : undefined,
            });

            setSuccess('Company profile updated successfully!');
            setTimeout(() => {
                navigate('/');
            }, 1500);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full bg-eco-basegray border border-gray-200 text-eco-graphite rounded-xl px-4 py-3 pl-11 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-eco-mint/50 focus:border-eco-mint transition-all duration-200";

    return (
        <div className="min-h-screen flex font-['Inter',sans-serif]" style={{ background: '#F0F2F5' }}>

            {/* ── LEFT PANEL ── */}
            <div
                className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 relative overflow-hidden"
                style={{ background: 'linear-gradient(145deg, #1B4332 0%, #2D6A4F 55%, #1B4332 100%)' }}
            >
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
                />

                <div className="relative z-10 flex items-center gap-3">
                    <div className="bg-[#F0F2F5] rounded-xl p-1.5 shadow-lg flex items-center justify-center">
                        <img src="/logo.png" alt="EcoLedger Logo" className="w-10 h-10 object-contain drop-shadow-[0_4px_10px_rgba(64,145,108,0.4)]" />
                    </div>
                    <span className="text-white text-xl font-bold tracking-tight">
                        EcoLedger<span style={{ color: '#D9A06F' }}>.</span>
                    </span>
                </div>

                <div className="relative z-10 space-y-6">
                    <div>
                        <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight">
                            Complete Your<br />
                            <span style={{ color: '#40916C', textShadow: '0 0 30px rgba(64,145,108,0.6)' }}>
                                Profile
                            </span>
                        </h1>
                        <p className="mt-4 text-white/60 text-base leading-relaxed max-w-sm">
                            Setting baseline metrics helps track improvements toward net-zero accurately.
                        </p>
                    </div>

                    {/* Explainer Box */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm space-y-4">
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-eco-mint shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-white font-semibold text-sm">Baseline CO₂e</h3>
                                <p className="text-white/60 text-xs mt-1 leading-relaxed">
                                    Your company's total emissions in a fixed starting year (e.g., 2020). It’s calculated by combining Scope 1, 2, and 3 activities before interventions. This is the starting line.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Target className="w-5 h-5 text-eco-mint shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-white font-semibold text-sm">Target CO₂e</h3>
                                <p className="text-white/60 text-xs mt-1 leading-relaxed">
                                    The emission limit you aim to hit by your chosen <span className="text-white">Target Year</span>. Usually calculated based on SBTi (Science Based Targets) commitments (e.g., 50% reduction from baseline).
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10">
                    <p className="text-white/25 text-xs">
                        Aligned with SBTi and GHG Protocol
                    </p>
                </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-y-auto">
                <div className="w-full max-w-lg">
                    <div className="bg-white rounded-3xl shadow-2xl shadow-black/8 border border-gray-100 p-8 md:p-10">

                        <div className="mb-8">
                            <h2 className="text-2xl font-black" style={{ color: '#1B4332' }}>Company Metrics</h2>
                            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
                                Add details below so we can measure against industry averages and targets.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">

                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <Scale className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input type="number" step="0.01" placeholder="Baseline (tCO₂e)"
                                        value={baseline_co2e} onChange={e => setBaseline_co2e(e.target.value)}
                                        className={inputClass} />
                                </div>
                                <div className="relative">
                                    <Target className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input type="number" step="0.01" placeholder="Target (tCO₂e)"
                                        value={target_co2e} onChange={e => setTarget_co2e(e.target.value)}
                                        className={inputClass} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <Target className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input type="number" placeholder="Target Year (e.g. 2030)"
                                        value={target_year} onChange={e => setTarget_year(e.target.value)}
                                        className={inputClass} />
                                </div>
                                <div className="relative">
                                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input type="number" placeholder="Employee Count"
                                        value={employee_count} onChange={e => setEmployee_count(e.target.value)}
                                        className={inputClass} />
                                </div>
                            </div>

                            <div className="relative">
                                <Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="number" step="0.01" placeholder="Annual Revenue (₹ in Crores)"
                                    value={annual_revenue_cr} onChange={e => setAnnual_revenue_cr(e.target.value)}
                                    className={inputClass} />
                            </div>

                            <div className="grid grid-cols-[2fr_1fr] gap-4">
                                <div className="relative">
                                    <Factory className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input type="number" step="0.01" placeholder="Production Volume"
                                        value={production_volume} onChange={e => setProduction_volume(e.target.value)}
                                        className={inputClass} />
                                </div>
                                <div className="relative">
                                    <input type="text" placeholder="Unit (tonnes)"
                                        value={production_unit} onChange={e => setProduction_unit(e.target.value)}
                                        className={`${inputClass} !pl-4`} />
                                </div>
                            </div>

                            <div className="relative">
                                <Info className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="number" step="0.01" placeholder="Industry Emission Factor (optional)"
                                    value={industry_emission_factor} onChange={e => setIndustry_emission_factor(e.target.value)}
                                    className={inputClass} />
                            </div>

                            {error && (
                                <div className="rounded-xl px-4 py-3 text-sm border"
                                    style={{ background: 'rgba(217,160,111,0.1)', borderColor: 'rgba(217,160,111,0.4)', color: '#92400e' }}>
                                    ⚠️ {error}
                                </div>
                            )}
                            {success && (
                                <div className="rounded-xl px-4 py-3 text-sm border flex items-center gap-2"
                                    style={{ background: 'rgba(45,106,79,0.08)', borderColor: 'rgba(64,145,108,0.3)', color: '#1B4332' }}>
                                    <ArrowRight className="w-4 h-4 shrink-0" style={{ color: '#40916C' }} />
                                    {success}
                                </div>
                            )}

                            <button type="submit" disabled={loading}
                                className="w-full py-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-4"
                                style={{
                                    background: loading ? '#2D6A4F' : 'linear-gradient(135deg, #40916C 0%, #1B4332 100%)',
                                    boxShadow: loading ? 'none' : '0 4px 20px rgba(27,67,50,0.35)',
                                }}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Profile'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            {/* Ping keyframe */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                @keyframes ping {
                    0%   { transform: scale(1); opacity: 0.6; }
                    70%  { transform: scale(1.8); opacity: 0; }
                    100% { transform: scale(1.8); opacity: 0; }
                }
            `}</style>
        </div>
    );
}