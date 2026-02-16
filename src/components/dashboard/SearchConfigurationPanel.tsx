import { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Info, Loader2 } from 'lucide-react';
import {
  BUSINESS_TYPE_OPTIONS,
  getProblemCategoriesForBusinessType,
} from './businessTypeProblemCatalog';
import { CONTACT_PREFERENCE_OPTIONS } from './mockData';
import { DashboardSelect } from './DashboardSelect';
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
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [isProblemGuideOpen, setIsProblemGuideOpen] = useState(false);
  const noSavedSearchValue = '__none__';
  const noBusinessTypeValue = '__none_business_type__';
  const loadingSteps = [
    'Preparing your search configuration...',
    'Connecting to the map search engine...',
    'Scanning map listings for matching businesses...',
    'Opening business profiles and collecting public details...',
    'Extracting websites, ratings, and contact channels...',
    'Detecting problem signals for each business...',
    'Scoring and tiering leads for your dashboard...',
    'Ranking results by fit with your target group...',
    'Finalizing lead cards and refreshing your table...',
  ];

  useEffect(() => {
    if (!isRunningSearch) {
      setLoadingStepIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setLoadingStepIndex((currentIndex) => (currentIndex + 1) % loadingSteps.length);
    }, 4200);

    return () => window.clearInterval(intervalId);
  }, [isRunningSearch, loadingSteps.length]);

  const activeProblemCategories = getProblemCategoriesForBusinessType(searchConfig.businessType);

  const setProblemCategoriesSelected = (nextProblemCategories: string[]) => {
    onUpdateSearchConfig({
      ...searchConfig,
      problemCategoriesSelected: nextProblemCategories,
      problemFilters: nextProblemCategories,
    });
  };

  const toggleProblemCategory = (problemCategory: string) => {
    const exists = searchConfig.problemCategoriesSelected.includes(problemCategory);
    const nextProblemCategories = exists
      ? searchConfig.problemCategoriesSelected.filter((item) => item !== problemCategory)
      : [...searchConfig.problemCategoriesSelected, problemCategory];

    setProblemCategoriesSelected(nextProblemCategories);
  };

  const setBusinessType = (nextBusinessType: string) => {
    const normalizedBusinessType =
      nextBusinessType === noBusinessTypeValue ? '' : nextBusinessType;

    if (normalizedBusinessType === searchConfig.businessType) {
      return;
    }

    onUpdateSearchConfig({
      ...searchConfig,
      businessType: normalizedBusinessType,
      problemCategoriesSelected: [],
      problemFilters: [],
    });
  };

  const selectAllProblemCategories = () => {
    if (!searchConfig.businessType) {
      return;
    }

    setProblemCategoriesSelected(activeProblemCategories);
  };

  const unselectAllProblemCategories = () => {
    setProblemCategoriesSelected([]);
  };

  const setMaxResults = (nextValue: string) => {
    const parsed = Number.parseInt(nextValue, 10);
    const normalized = Number.isFinite(parsed) ? Math.max(20, Math.min(300, parsed)) : 20;
    onUpdateSearchConfig({
      ...searchConfig,
      maxResults: normalized,
    });
  };

  const loadingAnimationStyles = `
    @keyframes searchLoaderSpin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes searchDotPulse {
      0%, 100% { transform: translateY(0); opacity: 0.6; }
      50% { transform: translateY(-2px); opacity: 1; }
    }
  `;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5">
      <style>{loadingAnimationStyles}</style>
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white">Search Configuration</h2>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm leading-none text-gray-300 transition-colors hover:text-white"
        >
          {isOpen ? 'Collapse' : 'Expand'}
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {isOpen ? (
        <div className="p-6 space-y-6">
          <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-4">
            <p className="text-sm text-gray-100">
              Define the exact target business group you want to evaluate.
            </p>
            <p className="mt-1 text-xs text-gray-300">
              This configuration controls only the search pool (location, category, business type,
              problem categories, contact preference, and expected results). After running the search,
              the leads are shown and evaluated.
            </p>
          </div>

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
              <DashboardSelect
                id="saved-searches"
                value={selectedSavedSearchId || noSavedSearchValue}
                onValueChange={(nextSavedSearchId) =>
                  onSelectSavedSearch(nextSavedSearchId === noSavedSearchValue ? '' : nextSavedSearchId)
                }
                options={[
                  { value: noSavedSearchValue, label: 'Choose saved search' },
                  ...savedSearches.map((savedSearch) => ({
                    value: savedSearch.id,
                    label: savedSearch.name,
                  })),
                ]}
              />
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="business-type" className="block text-sm text-gray-300">
                Business Type
              </label>
              <DashboardSelect
                id="business-type"
                value={searchConfig.businessType || noBusinessTypeValue}
                onValueChange={setBusinessType}
                options={[
                  { value: noBusinessTypeValue, label: 'Select business type' },
                  ...BUSINESS_TYPE_OPTIONS.map((businessType) => ({
                    value: businessType,
                    label: businessType,
                  })),
                ]}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="contact-preference" className="block text-sm text-gray-300">
                Contact preference
              </label>
              <DashboardSelect
                id="contact-preference"
                value={searchConfig.contactPreference}
                onValueChange={(nextValue) =>
                  onUpdateSearchConfig({
                    ...searchConfig,
                    contactPreference: nextValue as SearchConfiguration['contactPreference'],
                  })
                }
                options={CONTACT_PREFERENCE_OPTIONS.map((option) => ({
                  value: option,
                  label: option,
                }))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-gray-300">Problem categories</p>
                <button
                  type="button"
                  onClick={() => setIsProblemGuideOpen((current) => !current)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:bg-white/10"
                  aria-expanded={isProblemGuideOpen}
                >
                  How this works
                  {isProblemGuideOpen ? (
                    <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  )}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllProblemCategories}
                  disabled={!searchConfig.businessType || activeProblemCategories.length === 0}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={unselectAllProblemCategories}
                  disabled={
                    !searchConfig.businessType ||
                    searchConfig.problemCategoriesSelected.length === 0
                  }
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Unselect All
                </button>
              </div>
            </div>

            {isProblemGuideOpen ? (
              <div className="rounded-xl border border-blue-400/25 bg-blue-500/10 p-4 text-sm text-blue-100">
                <p className="font-medium">How to configure this section</p>
                <p className="mt-2 text-blue-100/90">
                  1. First choose your <span className="font-medium">Location</span> and{' '}
                  <span className="font-medium">Business category</span> to define the base search pool.
                </p>
                <p className="mt-1 text-blue-100/90">
                  2. Then choose a <span className="font-medium">Business Type</span>. This loads the matching
                  problem categories.
                </p>
                <p className="mt-1 text-blue-100/90">
                  3. Tick the <span className="font-medium">problem categories</span> (pain points) you want to
                  target.
                </p>
                <p className="mt-1 text-blue-100/90">
                  These selected pain points are crucial for deciding if a lead is a strong fit or not.
                </p>
              </div>
            ) : null}

            {searchConfig.businessType ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {activeProblemCategories.map((problemCategory) => {
                  const isSelected =
                    searchConfig.problemCategoriesSelected.includes(problemCategory);

                  return (
                    <label
                      key={problemCategory}
                      className={`group relative flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-all ${
                        isSelected
                          ? 'border border-blue-400/40 bg-blue-500/10'
                          : 'bg-white/[0.02] hover:bg-white/[0.05]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleProblemCategory(problemCategory)}
                        className="peer"
                        style={{
                          position: 'absolute',
                          opacity: 0,
                          width: 0,
                          height: 0,
                          pointerEvents: 'none',
                        }}
                      />

                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          isSelected
                            ? 'border-blue-300/70 bg-blue-500/20 text-blue-200'
                            : 'border-white/20 bg-white/5 text-transparent group-hover:border-white/35'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>

                      <span className="text-sm text-gray-200">{problemCategory}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-gray-400">
                Select a business type first to view and choose problem categories.
              </div>
            )}
          </div>

          <div className="space-y-2 md:max-w-md">
            <label htmlFor="search-max-results" className="block text-sm text-gray-300">
              Expected results
            </label>
            <input
              id="search-max-results"
              type="number"
              min={20}
              max={300}
              value={searchConfig.maxResults}
              onChange={(event) => setMaxResults(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-blue-400/80 focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-xs text-gray-500">Allowed range: 20-300 leads per search.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSaveSearch}
              disabled={isRunningSearch}
              className="px-5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-colors"
            >
              Save Search
            </button>
            <button
              type="button"
              onClick={onRunSearch}
              disabled={isRunningSearch}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 enabled:hover:from-blue-600 enabled:hover:to-purple-700 text-sm font-medium transition-all shadow-lg shadow-blue-500/20 disabled:cursor-wait disabled:opacity-80"
            >
              {isRunningSearch ? (
                <>
                  <Loader2
                    className="h-4 w-4"
                    style={{ animation: 'searchLoaderSpin 900ms linear infinite' }}
                  />
                  <span>Running Search</span>
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-white/90"
                      style={{ animation: 'searchDotPulse 900ms ease-in-out infinite', animationDelay: '-180ms' }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-white/90"
                      style={{ animation: 'searchDotPulse 900ms ease-in-out infinite', animationDelay: '-90ms' }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-white/90"
                      style={{ animation: 'searchDotPulse 900ms ease-in-out infinite' }}
                    />
                  </span>
                </>
              ) : (
                'Run Search'
              )}
            </button>

            {isRunningSearch ? (
              <div className="flex items-center gap-2 text-sm text-blue-200">
                <span
                  className="h-2 w-2 rounded-full bg-blue-400"
                  style={{ animation: 'searchDotPulse 1s ease-in-out infinite' }}
                />
                <span>{loadingSteps[loadingStepIndex]}</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
