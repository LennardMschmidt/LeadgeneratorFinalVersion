import { motion } from 'motion/react';
import { Search, ScanEye, FileDown } from 'lucide-react';

const steps = [
  {
    icon: Search,
    title: "Search",
    description: "Select your target business category and location. Choose the problems you solve."
  },
  {
    icon: ScanEye,
    title: "Evaluate",
    description: "Our AI analyzes public signals — websites, ratings, social presence — and scores lead quality."
  },
  {
    icon: FileDown,
    title: "Explain & Export",
    description: "Get clear reasoning for each lead plus contact info. Export to CSV or CRM in one click."
  }
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <h2 className="text-4xl font-bold mb-4">How it works</h2>
        <p className="text-xl text-gray-400">
          From search to outreach in three simple steps
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8 relative">
        {/* Connection line */}
        <div className="hidden md:block absolute top-16 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.2 }}
            className="relative"
          >
            <div className="bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all group">
              {/* Icon */}
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                  <step.icon className="w-8 h-8 text-blue-400" />
                </div>
                {/* Step number */}
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold shadow-lg">
                  {index + 1}
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-gray-400 leading-relaxed">
                {step.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
