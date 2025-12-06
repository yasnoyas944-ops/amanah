'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Zap, Globe2, TrendingUp, Users, CheckCircle2, XCircle, ChevronRight, Lock, Activity, Coins } from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white font-sans selection:bg-amber-500/30">

            {/* HEADER */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg group-hover:bg-slate-200 dark:group-hover:bg-slate-800 transition-colors">
                            <ArrowLeft size={20} className="text-zinc-600 dark:text-zinc-400" />
                        </div>
                        <span className="font-bold text-zinc-600 dark:text-zinc-400">Back to App</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold font-serif">
                            A
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-serif">Amanah Protocol</span>
                    </div>
                    <div className="w-24" /> {/* Spacer for balance */}
                </div>
            </header>

            <main className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto space-y-24">

                    {/* SECTION 1: EXECUTIVE SUMMARY */}
                    <section className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
                            Investable Opportunity
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-slate-900 to-slate-600 dark:from-white dark:to-zinc-500 font-serif leading-tight">
                            Trust is Golden.<br />Payments are Instant.
                        </h1>
                        <p className="text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed">
                            Influencer-Escrow is a <span className="text-zinc-900 dark:text-white font-bold">$20B+ opportunity</span> addressing the #1 crisis in the creator economy: payment risk and trust breakdown.
                        </p>
                    </section>

                    {/* SECTION 2: THE PROBLEM (DATA) */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/20 dark:shadow-none">
                            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-6">
                                <XCircle size={24} />
                            </div>
                            <h2 className="text-2xl font-bold mb-4">The Crisis: Late Payments</h2>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <span className="text-4xl font-bold text-red-500">87%</span>
                                    <p className="text-zinc-500">of creators experience late payments or non-payment issues annually.</p>
                                </div>
                                <div className="h-px bg-zinc-100 dark:bg-zinc-800" />
                                <ul className="space-y-3 text-zinc-600 dark:text-zinc-400">
                                    <li className="flex items-center gap-2">❌ Brands pay Net 60 days (standard)</li>
                                    <li className="flex items-center gap-2">❌ "Non-delivery" disputes with no proof</li>
                                    <li className="flex items-center gap-2">❌ Creators absorb 100% of the risk</li>
                                </ul>
                            </div>
                        </div>

                        <div className="p-8 rounded-3xl bg-slate-900 text-white relative overflow-hidden border border-slate-800">
                            <div className="absolute top-0 right-0 p-32 bg-amber-500/20 blur-[100px] rounded-full pointer-events-none" />
                            <div className="relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center mb-6">
                                    <ShieldCheck size={24} />
                                </div>
                                <h2 className="text-2xl font-bold mb-4">The Solution: Smart Escrow</h2>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                        <span className="text-4xl font-bold text-amber-400">5s</span>
                                        <p className="text-slate-400">Instant settlement upon verified completion. No banks. No Net 60.</p>
                                    </div>
                                    <div className="h-px bg-slate-800" />
                                    <ul className="space-y-3 text-slate-300">
                                        <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> Funds locked upfront (Trustless)</li>
                                        <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> AI Oracle verifies content (Automated)</li>
                                        <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /> Money moves instantly (DeFi)</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 3: MARKET & SCALING */}
                    <section className="space-y-8">
                        <h2 className="text-3xl font-bold font-serif">Market Strategy: Dubai First</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-amber-500/30 transition-colors">
                                <Globe2 size={32} className="text-amber-500 mb-4" />
                                <h3 className="text-lg font-bold mb-2">Primary Market</h3>
                                <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">$276M</p>
                                <p className="text-zinc-500 text-sm">UAE Influencer Spend (2025)</p>
                            </div>
                            <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-amber-500/30 transition-colors">
                                <TrendingUp size={32} className="text-emerald-500 mb-4" />
                                <h3 className="text-lg font-bold mb-2">Growth Rate</h3>
                                <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">8.14%</p>
                                <p className="text-zinc-500 text-sm">CAGR to $412M by 2029</p>
                            </div>
                            <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-amber-500/30 transition-colors">
                                <Zap size={32} className="text-blue-500 mb-4" />
                                <h3 className="text-lg font-bold mb-2">Adoption</h3>
                                <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">72%</p>
                                <p className="text-zinc-500 text-sm">UAE Trust in Influencers</p>
                            </div>
                        </div>

                        <div className="p-6 bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                            <h3 className="font-bold mb-4 flex items-center gap-2"><Activity size={18} /> Scaling Roadmap</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white mb-1">Phase 1: MVP</div>
                                    <div className="text-zinc-500">Testnet Launch, Manual Verification</div>
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white mb-1">Phase 2: Alpha</div>
                                    <div className="text-zinc-500">Audit Contract, 100 Beta Users</div>
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white mb-1">Phase 3: Beta</div>
                                    <div className="text-zinc-500">Open to UAE, 1,000 Users</div>
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white mb-1">Phase 4: Expansion</div>
                                    <div className="text-zinc-500">MENA Region, Enterprise</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 4: REVENUE MODEL */}
                    <section className="bg-slate-900 text-white rounded-3xl p-8 md:p-12 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.2),transparent_50%)]" />
                        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                            <div>
                                <h2 className="text-3xl font-bold font-serif mb-6">Revenue Model</h2>
                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                                            <Coins size={24} className="text-amber-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">Platform Fee</h3>
                                            <p className="text-slate-400 mt-1">We charge <span className="text-white font-bold">3-5%</span> on every transaction volume. Significantly lower than the 20% industry standard.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                                            <Lock size={24} className="text-amber-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">Unit Economics</h3>
                                            <p className="text-slate-400 mt-1">Per $5,000 deal, we earn $200. Costs are minimal (~$3.25) thanks to blockchain efficiency. <span className="text-white font-bold">98% Gross Margin.</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                                <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">Projected Growth (Year 3)</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <span className="text-slate-300">Transaction Vol</span>
                                        <span className="text-2xl font-bold text-white">$104M</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full w-[80%] bg-gradient-to-r from-amber-400 to-amber-600" />
                                    </div>
                                    <div className="flex justify-between items-end pt-2">
                                        <span className="text-slate-300">Net Revenue</span>
                                        <span className="text-2xl font-bold text-emerald-400">$3.07M</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* CTA */}
                    <section className="text-center py-12">
                        <h2 className="text-3xl font-bold mb-6 text-zinc-900 dark:text-white">Ready to change the game?</h2>
                        <Link href="/" className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-amber-500 font-bold rounded-xl text-lg hover:bg-slate-800 hover:scale-105 transition-all shadow-xl shadow-amber-500/10">
                            Start The Demo <ChevronRight />
                        </Link>
                    </section>

                </div>
            </main>
        </div>
    );
}
