import { motion } from 'motion/react';
import { LeadCard } from './LeadCard';

const exampleResults = [
  {
    businessName: "Verde Bistro",
    category: "Restaurant",
    city: "San Francisco, CA",
    problems: ["Outdated website", "No online ordering"],
    explanation: "Popular neighborhood restaurant with 4.5★ rating but website hasn't been updated since 2016. Recent reviews specifically mention wanting online ordering capability.",
    tier: "Most Valuable" as const
  },
  {
    businessName: "Elite Fitness Studio",
    category: "Gym",
    city: "Denver, CO",
    problems: ["No booking system", "Low rating (3.4★)"],
    explanation: "Well-equipped gym with consistent foot traffic. Low ratings primarily due to difficulty scheduling classes and personal training sessions.",
    tier: "Most Valuable" as const
  },
  {
    businessName: "TechFix Solutions",
    category: "IT Support",
    city: "Boston, MA",
    problems: ["No social presence", "No website"],
    explanation: "Established IT service provider operating primarily through referrals. Zero online presence but strong reputation in local business community.",
    tier: "Probable" as const
  }
];

export function ResultsSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h2 className="text-4xl font-bold mb-4">Results you can act on</h2>
        <p className="text-xl text-gray-400">
          Every lead comes with clear reasoning and contact options
        </p>
      </motion.div>

      <div className="grid gap-6">
        {exampleResults.map((lead, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <LeadCard lead={lead} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
