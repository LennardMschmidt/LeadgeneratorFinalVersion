import { Mail, Phone, Globe, Star } from 'lucide-react';

interface Lead {
  businessName: string;
  category: string;
  city: string;
  problems: string[];
  explanation: string;
  tier?: 'Most Valuable' | 'Probable';
}

interface LeadCardProps {
  lead: Lead;
  compact?: boolean;
}

export function LeadCard({ lead, compact = false }: LeadCardProps) {
  return (
    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">{lead.businessName}</h3>
          <p className="text-sm text-gray-400">
            {lead.category} • {lead.city}
          </p>
        </div>
        {lead.tier && (
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            lead.tier === 'Most Valuable' 
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
          }`}>
            {lead.tier}
          </span>
        )}
      </div>

      {/* Problem badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {lead.problems.map((problem, index) => (
          <span
            key={index}
            className="px-3 py-1 rounded-lg bg-red-500/10 text-red-300 text-xs font-medium border border-red-500/20"
          >
            {problem}
          </span>
        ))}
      </div>

      {!compact && (
        <>
          {/* Explanation */}
          <div className="mb-4 p-4 rounded-lg bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-400">Why this is a good lead</span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              {lead.explanation}
            </p>
          </div>

          {/* Contact icons */}
          <div className="flex items-center gap-3 pt-4 border-t border-white/5">
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 hover:text-white transition-all group-hover:scale-105">
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 hover:text-white transition-all group-hover:scale-105">
              <Phone className="w-4 h-4" />
              Phone
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 hover:text-white transition-all group-hover:scale-105">
              <Globe className="w-4 h-4" />
              Website
            </button>
          </div>
        </>
      )}
    </div>
  );
}
