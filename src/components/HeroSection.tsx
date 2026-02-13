import { motion } from 'motion/react';
import { LeadCard } from './LeadCard';

const exampleLeads = [
  {
    businessName: "Summit Coffee Roasters",
    category: "Cafe",
    city: "Seattle, WA",
    problems: ["No website", "Low rating (3.2★)"],
    explanation: "Active business with regular customers but no online ordering. Recent reviews mention difficulty placing orders."
  },
  {
    businessName: "Precision Auto Repair",
    category: "Auto Service",
    city: "Austin, TX",
    problems: ["No social presence"],
    explanation: "Established shop with good reputation but zero social media presence. Missing appointment booking system."
  },
  {
    businessName: "Bloom Floral Design",
    category: "Florist",
    city: "Portland, OR",
    problems: ["Outdated website", "No booking system"],
    explanation: "Popular florist with a website from 2015. No online ordering despite high demand for delivery services."
  }
];

export function HeroSection() {
  return (
    <section className="max-w-7xl mx-auto px-6 pt-20 pb-32">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Left: Text content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Find businesses that need what you sell —{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              and know exactly why.
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 mb-10 leading-relaxed">
            We analyze public online signals to surface businesses with real problems and show the best way to reach the decision maker.
          </p>

          <div className="flex flex-wrap gap-4">
            <button className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium transition-all shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105">
              Generate free leads
            </button>
            <button className="px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all border border-white/10 hover:border-white/20">
              See example leads
            </button>
          </div>
        </motion.div>

        {/* Right: Lead cards stack */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          <div className="space-y-4">
            {exampleLeads.map((lead, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
              >
                <LeadCard lead={lead} compact />
              </motion.div>
            ))}
          </div>

          {/* Glow effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-3xl -z-10" />
        </motion.div>
      </div>
    </section>
  );
}
