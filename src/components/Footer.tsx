import { Sparkles } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-white/[0.02] backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left: Logo and disclaimer */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold">Lead Generator</span>
            </div>
            <p className="text-sm text-gray-500 max-w-md">
              Lead Generator analyzes publicly available business information including websites, ratings, and social media presence. All data is sourced from public directories and platforms.
            </p>
          </div>

          {/* Right: Links */}
          <div className="flex flex-col md:items-end gap-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Contact
              </a>
            </div>
            <p className="text-sm text-gray-500">
              © 2026 Lead Generator. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
