import { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import {
  BUSINESS_TYPE_OPTIONS,
  getProblemCategoriesForBusinessType,
} from './businessTypeProblemCatalog';
import { CONTACT_PREFERENCE_OPTIONS } from './mockData';
import { SEARCH_SOURCE_OPTIONS } from './searchSources';
import { DashboardSelect } from './DashboardSelect';
import { SavedSearch, SearchConfiguration } from './types';

interface SearchConfigurationPanelProps {
  searchConfig: SearchConfiguration;
  savedSearches: SavedSearch[];
  selectedSavedSearchId: string;
  deletingSavedSearchId: string | null;
  isRunningSearch: boolean;
  isSavingSearch: boolean;
  onSelectSavedSearch: (savedSearchId: string) => void;
  onDeleteSavedSearch: (savedSearchId: string) => void;
  onUpdateSearchConfig: (nextConfig: SearchConfiguration) => void;
  onSaveSearch: () => void;
  onRunSearch: () => void;
  onCancelSearch: () => void;
}

export function SearchConfigurationPanel({
  searchConfig,
  savedSearches,
  selectedSavedSearchId,
  deletingSavedSearchId,
  isRunningSearch,
  isSavingSearch,
  onSelectSavedSearch,
  onDeleteSavedSearch,
  onUpdateSearchConfig,
  onSaveSearch,
  onRunSearch,
  onCancelSearch,
}: SearchConfigurationPanelProps) {
  const { raw, t, tm } = useI18n();
  const AVAILABLE_BUSINESS_TYPE = 'Web Agencies';
  const [isOpen, setIsOpen] = useState(true);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [isProblemGuideOpen, setIsProblemGuideOpen] = useState(false);
  const noSavedSearchValue = '__none__';
  const noBusinessTypeValue = '__none_business_type__';
  const noSearchSourceValue = '__none_search_source__';
  const [maxResultsDraft, setMaxResultsDraft] = useState(String(searchConfig.maxResults));
  const loadingSteps = raw<string[]>('dashboard.searchPanel.loadingSteps');
  const isLinkedInSource = searchConfig.searchSource === 'linkedin';

  useEffect(() => {
    setMaxResultsDraft(String(searchConfig.maxResults));
  }, [searchConfig.maxResults]);

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
  const canRunSearch =
    !!searchConfig.searchSource &&
    (isLinkedInSource || !!searchConfig.businessType) &&
    !isRunningSearch;
  const isDeletingSelectedSavedSearch =
    !!selectedSavedSearchId && deletingSavedSearchId === selectedSavedSearchId;
  const missingSelectionWarning =
    !searchConfig.searchSource
      ? t('dashboard.searchPanel.selectSearchSourceWarning')
      : !isLinkedInSource && !searchConfig.businessType
      ? t('dashboard.searchPanel.selectBusinessTypeWarning')
      : null;

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

    if (normalizedBusinessType && normalizedBusinessType !== AVAILABLE_BUSINESS_TYPE) {
      return;
    }

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
    const digitsOnly = nextValue.replace(/[^\d]/g, '');
    if (digitsOnly.length === 0) {
      setMaxResultsDraft('');
      return;
    }

    const parsed = Number.parseInt(digitsOnly, 10);
    const normalized = Number.isFinite(parsed) ? Math.min(300, parsed) : 20;
    setMaxResultsDraft(String(normalized));
    onUpdateSearchConfig({
      ...searchConfig,
      maxResults: normalized,
    });
  };

  const commitMaxResults = () => {
    const parsed = Number.parseInt(maxResultsDraft, 10);
    const normalized = Number.isFinite(parsed) ? Math.max(20, Math.min(300, parsed)) : 20;
    setMaxResultsDraft(String(normalized));
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
        <h2 className="text-lg font-semibold text-white">{t('dashboard.searchPanel.title')}</h2>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm leading-none text-gray-300 transition-colors hover:text-white"
        >
          {isOpen ? t('dashboard.searchPanel.collapse') : t('dashboard.searchPanel.expand')}
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {isOpen ? (
        <div className="p-6 space-y-6">
          <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-4">
            <p className="text-sm text-gray-100">{t('dashboard.searchPanel.intro')}</p>
            <p className="mt-1 text-xs text-gray-300">{t('dashboard.searchPanel.introDetail')}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <label htmlFor="saved-searches" className="block text-sm text-gray-300">
                {t('dashboard.searchPanel.savedSearchesLabel')}
              </label>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <DashboardSelect
                    id="saved-searches"
                    value={selectedSavedSearchId || noSavedSearchValue}
                    onValueChange={(nextSavedSearchId) =>
                      onSelectSavedSearch(nextSavedSearchId === noSavedSearchValue ? '' : nextSavedSearchId)
                    }
                    options={[
                      { value: noSavedSearchValue, label: t('dashboard.searchPanel.chooseSavedSearch') },
                      ...savedSearches.map((savedSearch) => ({
                        value: savedSearch.id,
                        label: savedSearch.name,
                      })),
                    ]}
                  />
                </div>
                {selectedSavedSearchId ? (
                  <button
                    type="button"
                    onClick={() => onDeleteSavedSearch(selectedSavedSearchId)}
                    disabled={!!deletingSavedSearchId}
                    className="shrink-0 rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-3 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDeletingSelectedSavedSearch
                      ? t('dashboard.searchPanel.removingSavedSearch')
                      : t('dashboard.searchPanel.removeSavedSearch')}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <label htmlFor="search-location" className="block text-sm text-gray-300">
                {t('dashboard.searchPanel.locationLabel')}
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
                placeholder={t('dashboard.searchPanel.locationPlaceholder')}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-blue-400/80"
              />
            </div>

            <div className="space-y-3">
              <label htmlFor="search-category" className="block text-sm text-gray-300">
                {t('dashboard.searchPanel.businessCategoryLabel')}
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
                placeholder={t('dashboard.searchPanel.businessCategoryPlaceholder')}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-blue-400/80"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <label htmlFor="business-type" className="block text-sm text-gray-300">
                {t('dashboard.searchPanel.businessTypeLabel')}
              </label>
              <DashboardSelect
                id="business-type"
                value={searchConfig.businessType || noBusinessTypeValue}
                onValueChange={setBusinessType}
                contentStyleOverride={{
                  maxHeight: '196px',
                  overflowY: 'auto',
                }}
                options={[
                  { value: noBusinessTypeValue, label: t('dashboard.searchPanel.selectBusinessType') },
                  ...BUSINESS_TYPE_OPTIONS.map((businessType) => {
                    const isAvailable = businessType === AVAILABLE_BUSINESS_TYPE;
                    const businessTypeLabel = tm('businessTypes', businessType);
                    return {
                      value: businessType,
                      label: isAvailable
                        ? businessTypeLabel
                        : `${businessTypeLabel} ${t('common.comingSoonSuffix')}`,
                      disabled: !isAvailable,
                    };
                  }),
                ]}
              />
            </div>

            <div className="space-y-3">
              <label htmlFor="search-source" className="block text-sm text-gray-300">
                {t('dashboard.searchPanel.searchSourceLabel')}
              </label>
              <DashboardSelect
                id="search-source"
                value={searchConfig.searchSource || noSearchSourceValue}
                onValueChange={(nextValue) =>
                  onUpdateSearchConfig({
                    ...searchConfig,
                    searchSource:
                      nextValue === noSearchSourceValue
                        ? ''
                        : (nextValue as Exclude<SearchConfiguration['searchSource'], ''>),
                  })
                }
                options={[
                  {
                    value: noSearchSourceValue,
                    label: t('dashboard.searchPanel.selectSearchSource'),
                  },
                  ...SEARCH_SOURCE_OPTIONS.map((option) => ({
                    value: option.value,
                    label: t(option.labelKey),
                  })),
                ]}
              />
            </div>
          </div>

          <div className="space-y-3 md:max-w-md">
            <label htmlFor="contact-preference" className="block text-sm text-gray-300">
              {t('dashboard.searchPanel.contactPreferenceLabel')}
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
                label: tm('contactPreferences', option),
              }))}
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-gray-300">{t('dashboard.searchPanel.problemCategoriesLabel')}</p>
                <button
                  type="button"
                  onClick={() => setIsProblemGuideOpen((current) => !current)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:bg-white/10"
                  aria-expanded={isProblemGuideOpen}
                >
                  {t('dashboard.searchPanel.howThisWorks')}
                  {isProblemGuideOpen ? (
                    <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  )}
                </button>
              </div>
              {!isLinkedInSource ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllProblemCategories}
                    disabled={!searchConfig.businessType || activeProblemCategories.length === 0}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('dashboard.searchPanel.selectAll')}
                  </button>
                  <button
                    type="button"
                    onClick={unselectAllProblemCategories}
                    disabled={!searchConfig.businessType || searchConfig.problemCategoriesSelected.length === 0}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('dashboard.searchPanel.unselectAll')}
                  </button>
                </div>
              ) : null}
            </div>

            {isProblemGuideOpen ? (
              <div className="rounded-xl border border-blue-400/25 bg-blue-500/10 p-4 text-sm text-blue-100">
                <p className="font-medium">{t('dashboard.searchPanel.guideTitle')}</p>
                <p className="mt-2 text-blue-100/90">{t('dashboard.searchPanel.guideStep1')}</p>
                <p className="mt-1 text-blue-100/90">{t('dashboard.searchPanel.guideStep2')}</p>
                <p className="mt-1 text-blue-100/90">{t('dashboard.searchPanel.guideStep3')}</p>
                <p className="mt-1 text-blue-100/90">{t('dashboard.searchPanel.guideConclusion')}</p>
              </div>
            ) : null}

            {isLinkedInSource ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-gray-400">
                {t('dashboard.searchPanel.linkedinProblemCategoriesUnavailable')}
              </div>
            ) : searchConfig.businessType ? (
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

                      <span className="text-sm text-gray-200">{tm('problemCategories', problemCategory)}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-gray-400">
                {t('dashboard.searchPanel.selectBusinessTypeFirst')}
              </div>
            )}
          </div>

          <div className="space-y-3 md:max-w-md">
            <label htmlFor="search-max-results" className="block text-sm text-gray-300">
              {t('dashboard.searchPanel.expectedResultsLabel')}
            </label>
            <input
              id="search-max-results"
              type="number"
              min={20}
              max={300}
              value={maxResultsDraft}
              onChange={(event) => setMaxResults(event.target.value)}
              onBlur={commitMaxResults}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-blue-400/80 focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-xs text-gray-500">{t('dashboard.searchPanel.expectedResultsRange')}</p>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onSaveSearch}
              disabled={isRunningSearch || isSavingSearch}
              className="px-5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-colors"
            >
              {isSavingSearch ? 'Saving...' : t('dashboard.searchPanel.saveSearch')}
            </button>
            <button
              type="button"
              onClick={onRunSearch}
              disabled={!canRunSearch}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 enabled:hover:from-blue-600 enabled:hover:to-purple-700 text-sm font-medium transition-all shadow-lg shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isRunningSearch ? (
                <>
                  <Loader2
                    className="h-4 w-4"
                    style={{ animation: 'searchLoaderSpin 900ms linear infinite' }}
                  />
                  <span>{t('dashboard.searchPanel.runningSearch')}</span>
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
                t('dashboard.searchPanel.runSearch')
              )}
            </button>
            {missingSelectionWarning && !isRunningSearch ? (
              <p className="text-xs text-amber-300">{missingSelectionWarning}</p>
            ) : null}
            {isRunningSearch ? (
              <button
                type="button"
                onClick={onCancelSearch}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg border text-sm font-medium transition-colors"
                style={{
                  borderColor: 'rgba(252, 165, 165, 0.45)',
                  backgroundColor: 'rgba(239, 68, 68, 0.18)',
                  color: 'rgb(254, 226, 226)',
                  boxShadow: '0 10px 25px rgba(239, 68, 68, 0.22)',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.28)';
                  event.currentTarget.style.borderColor = 'rgba(254, 202, 202, 0.6)';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.18)';
                  event.currentTarget.style.borderColor = 'rgba(252, 165, 165, 0.45)';
                }}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full bg-red-300"
                  style={{ animation: 'searchDotPulse 900ms ease-in-out infinite' }}
                />
                {t('dashboard.searchPanel.cancelSearch')}
              </button>
            ) : null}

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
