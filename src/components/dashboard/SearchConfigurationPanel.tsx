import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CONTACT_PREFERENCE_OPTIONS, PROBLEM_FILTER_OPTIONS } from './mockData';
import { BusinessProfile, SavedSearch, SearchConfiguration } from './types';

interface SearchConfigurationPanelProps {
  searchConfig: SearchConfiguration;
  savedSearches: SavedSearch[];
  selectedSavedSearchId: string;
  businessProfile: BusinessProfile | null;
  useBusinessProfile: boolean;
  isRunningSearch: boolean;
  onSelectSavedSearch: (savedSearchId: string) => void;
  onUpdateSearchConfig: (nextConfig: SearchConfiguration) => void;
  onUseBusinessProfileChange: (enabled: boolean) => void;
  onNavigateBusinessProfile: () => void;
  onSaveSearch: () => void;
  onRunSearch: () => void;
}

export function SearchConfigurationPanel({
  searchConfig,
  savedSearches,
  selectedSavedSearchId,
  businessProfile,
  useBusinessProfile,
  isRunningSearch,
  onSelectSavedSearch,
  onUpdateSearchConfig,
  onUseBusinessProfileChange,
  onNavigateBusinessProfile,
  onSaveSearch,
  onRunSearch,
}: SearchConfigurationPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const dropdownSelectClass =
    'w-full appearance-none rounded-xl border border-white/15 bg-white/5 px-4 py-3 pr-10 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition-all hover:border-white/25 focus:border-blue-400/80 focus:ring-2 focus:ring-blue-500/20';

  const toggleProblemFilter = (problem: string) => {
    const exists = searchConfig.problemFilters.includes(problem);

    onUpdateSearchConfig({
      ...searchConfig,
      problemFilters: exists
        ? searchConfig.problemFilters.filter((item) => item !== problem)
        : [...searchConfig.problemFilters, problem],
    });
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white">Search Configuration</h2>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
        >
          {isOpen ? 'Collapse' : 'Expand'}
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {isOpen ? (
        <div className="p-6 space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            {businessProfile ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-3 text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={useBusinessProfile}
                    onChange={(event) => onUseBusinessProfileChange(event.target.checked)}
                    className="h-4 w-4 rounded border border-white/20 bg-white/5"
                  />
                  Use Business Profile
                </label>
                <p className="text-xs text-gray-400">
                  {businessProfile.businessName} • {businessProfile.businessCategory} •{' '}
                  {businessProfile.businessLocation}
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-300">No business profile found.</p>
                <button
                  type="button"
                  onClick={onNavigateBusinessProfile}
                  className="text-sm text-blue-300 underline underline-offset-4 transition-colors hover:text-blue-200"
                >
                  Create Business Profile
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="saved-searches" className="block text-sm text-gray-300">
                Saved searches
              </label>
              <div className="relative">
                <select
                  id="saved-searches"
                  value={selectedSavedSearchId}
                  onChange={(event) => onSelectSavedSearch(event.target.value)}
                  className={dropdownSelectClass}
                >
                  <option value="" className="text-black">
                    Choose saved search
                  </option>
                  {savedSearches.map((savedSearch) => (
                    <option key={savedSearch.id} value={savedSearch.id} className="text-black">
                      {savedSearch.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="search-location" className="block text-sm text-gray-300">
                Location
              </label>
              <input
                id="search-location"
                value={searchConfig.location}
                onChange={(event) =>
                  onUpdateSearchConfig({
                    ...searchConfig,
                    location: event.target.value,
                  })
                }
                placeholder="City, State"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-blue-400/80"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="search-category" className="block text-sm text-gray-300">
                Business category
              </label>
              <input
                id="search-category"
                value={searchConfig.category}
                onChange={(event) =>
                  onUpdateSearchConfig({
                    ...searchConfig,
                    category: event.target.value,
                  })
                }
                placeholder="Category"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-blue-400/80"
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-300">Problem filters</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PROBLEM_FILTER_OPTIONS.map((problem) => (
                <label key={problem} className="inline-flex items-center gap-3 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={searchConfig.problemFilters.includes(problem)}
                    onChange={() => toggleProblemFilter(problem)}
                    className="h-4 w-4 rounded border border-white/20 bg-white/5"
                  />
                  {problem}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="contact-preference" className="block text-sm text-gray-300">
                Contact preference
              </label>
              <div className="relative">
                <select
                  id="contact-preference"
                  value={searchConfig.contactPreference}
                  onChange={(event) =>
                    onUpdateSearchConfig({
                      ...searchConfig,
                      contactPreference: event.target.value as SearchConfiguration['contactPreference'],
                    })
                  }
                  className={dropdownSelectClass}
                >
                  {CONTACT_PREFERENCE_OPTIONS.map((option) => (
                    <option key={option} value={option} className="text-black">
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onSaveSearch}
              className="px-5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-colors"
            >
              Save Search
            </button>
            <button
              type="button"
              onClick={onRunSearch}
              disabled={isRunningSearch}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 enabled:hover:from-blue-600 enabled:hover:to-purple-700 text-sm font-medium transition-all shadow-lg shadow-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isRunningSearch ? 'Running...' : 'Run Search'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
