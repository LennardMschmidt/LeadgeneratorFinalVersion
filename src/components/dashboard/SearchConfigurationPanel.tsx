import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import {
  getProblemCategoriesForBusinessType,
} from './businessTypeProblemCatalog';
import { SEARCH_SOURCE_OPTIONS } from './searchSources';
import { DashboardSelect } from './DashboardSelect';
import { SavedSearch, SearchConfiguration } from './types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

interface SearchConfigurationPanelProps {
  searchConfig: SearchConfiguration;
  savedSearches: SavedSearch[];
  selectedSavedSearchId: string;
  deletingSavedSearchId: string | null;
  isRunningSearch: boolean;
  isSavingSearch: boolean;
  canUseLinkedInSearch?: boolean;
  isGuideModalOpen?: boolean;
  onGuideModalOpenChange?: (open: boolean) => void;
  onOpenGuide?: () => void;
  onOpenProblemGuide?: () => void;
  onNavigateBilling?: () => void;
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
  canUseLinkedInSearch = false,
  isGuideModalOpen = false,
  onGuideModalOpenChange,
  onOpenGuide,
  onOpenProblemGuide,
  onNavigateBilling,
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
  const [isProblemGuideModalOpen, setIsProblemGuideModalOpen] = useState(false);
  const noSavedSearchValue = '__none__';
  const noBusinessTypeValue = '__none_business_type__';
  const noSearchSourceValue = '__none_search_source__';
  const [maxResultsDraft, setMaxResultsDraft] = useState(String(searchConfig.maxResults));
  const loadingSteps = raw<string[]>('dashboard.searchPanel.loadingSteps');
  const isLinkedInSource = searchConfig.searchSource === 'linkedin';
  const isLinkedInLocked = !canUseLinkedInSearch;
  const normalizedBusinessTypeValue =
    searchConfig.businessType === AVAILABLE_BUSINESS_TYPE
      ? searchConfig.businessType
      : noBusinessTypeValue;
  const searchSourceLabelByValue = useMemo(
    () =>
      Object.fromEntries(
        SEARCH_SOURCE_OPTIONS.map((option) => [option.value, t(option.labelKey)]),
      ) as Record<'google_maps' | 'linkedin', string>,
    [t],
  );
  const savedSearchDropdownOptions = useMemo(
    () => [
      { value: noSavedSearchValue, label: t('dashboard.searchPanel.chooseSavedSearch') },
      ...savedSearches.map((savedSearch) => {
        const source = savedSearch.config.searchSource
          ? searchSourceLabelByValue[savedSearch.config.searchSource]
          : t('dashboard.searchPanel.selectSearchSource');
        const businessType = savedSearch.config.businessType
          ? tm('businessTypes', savedSearch.config.businessType)
          : t('dashboard.searchPanel.selectBusinessType');
        return {
          value: savedSearch.id,
          label: `${savedSearch.name} · ${source} · ${businessType}`,
        };
      }),
    ],
    [savedSearches, searchSourceLabelByValue, t, tm],
  );

  useEffect(() => {
    setMaxResultsDraft(String(searchConfig.maxResults));
  }, [searchConfig.maxResults]);

  useEffect(() => {
    if (!isLinkedInLocked || searchConfig.searchSource !== 'linkedin') {
      return;
    }

    onUpdateSearchConfig({
      ...searchConfig,
      searchSource: 'google_maps',
    });
  }, [isLinkedInLocked, onUpdateSearchConfig, searchConfig]);

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
  const canRunSearch = !isRunningSearch;
  const isDeletingSelectedSavedSearch =
    !!selectedSavedSearchId && deletingSavedSearchId === selectedSavedSearchId;
  const missingSelectionWarning =
    !searchConfig.searchSource
      ? t('dashboard.searchPanel.selectSearchSourceWarning')
      : !isLinkedInSource && !searchConfig.businessType
      ? t('dashboard.searchPanel.selectBusinessTypeWarning')
      : null;
  const searchGuideSteps = [
    {
      step: '1',
      title: 'Set your target carefully',
      description:
        'Fill out all fields and choose location and category wisely. Test different location levels such as city names, districts, neighborhoods, streets, and specific areas to surface different lead pools.',
      borderColor: 'rgba(59, 130, 246, 0.35)',
      badgeBackground: 'linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(96, 165, 250, 0.95))',
      accentBackground: 'linear-gradient(155deg, rgba(59, 130, 246, 0.18), rgba(15, 23, 42, 0.55))',
    },
    {
      step: '2',
      title: 'Filter before saving',
      description:
        'The filtered lead view is exactly what gets saved when you click save leads. Save only the leads you want by selecting Tier 1, Tier 2, Tier 3, or specific problems. Click each tier to review that result set before saving.',
      borderColor: 'rgba(168, 85, 247, 0.35)',
      badgeBackground:
        'linear-gradient(135deg, rgba(168, 85, 247, 0.95), rgba(139, 92, 246, 0.95))',
      accentBackground: 'linear-gradient(155deg, rgba(168, 85, 247, 0.18), rgba(15, 23, 42, 0.55))',
    },
    {
      step: '3',
      title: 'Continue in Saved Searches',
      description:
        'Open Saved Searches to run website analyses, generate AI contact suggestions, manage lead status, and continue lead qualification from one place.',
      borderColor: 'rgba(34, 211, 238, 0.35)',
      badgeBackground: 'linear-gradient(135deg, rgba(34, 211, 238, 0.95), rgba(59, 130, 246, 0.95))',
      accentBackground: 'linear-gradient(155deg, rgba(34, 211, 238, 0.18), rgba(15, 23, 42, 0.55))',
    },
  ];
  const isGoogleMapsSource = searchConfig.searchSource === 'google_maps';
  const shouldShowReliabilityTips = searchConfig.searchSource === 'linkedin' || isGoogleMapsSource;

  const openProblemGuideModal = () => {
    setIsProblemGuideModalOpen(true);
    onOpenProblemGuide?.();
  };

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
    const normalized = Number.isFinite(parsed) ? Math.min(120, parsed) : 20;
    setMaxResultsDraft(String(normalized));
    onUpdateSearchConfig({
      ...searchConfig,
      maxResults: normalized,
    });
  };

  const commitMaxResults = () => {
    const parsed = Number.parseInt(maxResultsDraft, 10);
    const normalized = Number.isFinite(parsed) ? Math.max(20, Math.min(120, parsed)) : 20;
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
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <h2 className="text-lg font-semibold text-white">{t('dashboard.searchPanel.title')}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onOpenGuide?.();
              onGuideModalOpenChange?.(true);
            }}
            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-blue-300/25 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-100 transition-colors hover:bg-blue-500/20"
          >
            {t('dashboard.searchPanel.guideOpenButton')}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm leading-none text-gray-300 transition-colors hover:text-white"
          >
            {isOpen ? t('dashboard.searchPanel.collapse') : t('dashboard.searchPanel.expand')}
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
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
                    options={savedSearchDropdownOptions}
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
                value={normalizedBusinessTypeValue}
                onValueChange={setBusinessType}
                contentStyleOverride={{
                  maxHeight: '196px',
                  overflowY: 'auto',
                }}
                options={[
                  { value: noBusinessTypeValue, label: t('dashboard.searchPanel.selectBusinessType') },
                  { value: AVAILABLE_BUSINESS_TYPE, label: 'Web Agency' },
                  { value: '__more_to_come__', label: 'More to come', disabled: true },
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
                onValueChange={(nextValue) => {
                  if (nextValue === 'linkedin' && isLinkedInLocked) {
                    return;
                  }

                  onUpdateSearchConfig({
                    ...searchConfig,
                    searchSource:
                      nextValue === noSearchSourceValue
                        ? ''
                        : (nextValue as Exclude<SearchConfiguration['searchSource'], ''>),
                  });
                }}
                options={[
                  {
                    value: noSearchSourceValue,
                    label: t('dashboard.searchPanel.selectSearchSource'),
                  },
                  ...SEARCH_SOURCE_OPTIONS.map((option) => ({
                    value: option.value,
                    label: t(option.labelKey),
                    disabled: option.value === 'linkedin' && isLinkedInLocked,
                  })),
                ]}
              />
              {isLinkedInLocked ? (
                <div className="rounded-xl border border-violet-300/30 bg-violet-500/10 px-3 py-2">
                  <p className="text-xs text-violet-100">
                    {t('dashboard.searchPanel.linkedinRequiresPro')}
                  </p>
                  {onNavigateBilling ? (
                    <button
                      type="button"
                      onClick={onNavigateBilling}
                      className="mt-2 rounded-lg border border-violet-200/40 bg-violet-400/15 px-3 py-1.5 text-xs font-medium text-violet-100 transition hover:bg-violet-400/25"
                    >
                      {t('dashboard.searchPanel.upgradeCta')}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-gray-300">{t('dashboard.searchPanel.problemCategoriesLabel')}</p>
                <button
                  type="button"
                  onClick={openProblemGuideModal}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:bg-white/10"
                >
                  {t('dashboard.searchPanel.problemCategoriesMoreInfo')}
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
            <p className="text-xs text-gray-400">{t('dashboard.searchPanel.problemCategoriesOneLine')}</p>

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
              max={120}
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
              onClick={() => onRunSearch()}
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

          {shouldShowReliabilityTips ? (
            <div className="rounded-xl border border-amber-300/20 bg-amber-500/10 p-4">
              <p className="text-sm font-semibold text-amber-100">{t('dashboard.searchPanel.reliabilityTipsTitle')}</p>
              <p className="mt-2 text-xs leading-relaxed text-amber-100/90">
                {isGoogleMapsSource
                  ? t('dashboard.searchPanel.reliabilityTipsGoogleMapsLine1')
                  : t('dashboard.searchPanel.reliabilityTipsLinkedInLine1')}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-amber-100/90">
                {isGoogleMapsSource
                  ? t('dashboard.searchPanel.reliabilityTipsGoogleMapsLine2')
                  : t('dashboard.searchPanel.reliabilityTipsLinkedInLine2')}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-amber-100/90">
                {isGoogleMapsSource
                  ? t('dashboard.searchPanel.reliabilityTipsGoogleMapsLine3')
                  : t('dashboard.searchPanel.reliabilityTipsLinkedInLine3')}
              </p>
            </div>
          ) : null}

        </div>
      ) : null}

      <Dialog open={isGuideModalOpen} onOpenChange={onGuideModalOpenChange}>
        <DialogContent
          className="border border-blue-300/25 bg-slate-950 p-0 text-white"
          style={{
            maxWidth: '820px',
            background:
              'linear-gradient(145deg, rgba(29, 78, 216, 0.20), rgba(15, 23, 42, 0.96) 42%, rgba(76, 29, 149, 0.20))',
            boxShadow:
              '0 0 0 1px rgba(56, 189, 248, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 24px 56px rgba(2, 6, 23, 0.45)',
          }}
        >
          <DialogHeader className="border-b border-white/10 px-6 py-5">
            <DialogTitle className="text-xl text-white">
              {t('dashboard.searchPanel.guideModalTitle')}
            </DialogTitle>
            <p className="text-sm text-gray-300">{t('dashboard.searchPanel.guideModalSubtitle')}</p>
          </DialogHeader>
          <div className="overflow-y-auto p-6" style={{ maxHeight: '62vh' }}>
            <div className="space-y-4">
              {searchGuideSteps.map((guideStep) => (
                <div
                  key={guideStep.step}
                  className="rounded-xl border"
                  style={{
                    borderColor: guideStep.borderColor,
                    background: guideStep.accentBackground,
                    boxShadow:
                      'inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 12px 28px rgba(2, 6, 23, 0.28)',
                  }}
                >
                  <div className="p-4">
                    <div
                      className="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-3 text-xs font-semibold text-white"
                      style={{
                        background: guideStep.badgeBackground,
                        boxShadow: '0 0 20px rgba(59, 130, 246, 0.22)',
                      }}
                    >
                      {guideStep.step}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">{guideStep.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-gray-200">{guideStep.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isProblemGuideModalOpen} onOpenChange={setIsProblemGuideModalOpen}>
        <DialogContent
          className="border border-blue-300/25 bg-slate-950 text-white"
          style={{
            maxWidth: '640px',
            background:
              'linear-gradient(145deg, rgba(29, 78, 216, 0.12), rgba(15, 23, 42, 0.96) 42%, rgba(76, 29, 149, 0.16))',
            boxShadow:
              '0 0 0 1px rgba(56, 189, 248, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 24px 56px rgba(2, 6, 23, 0.45)',
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl text-white">{t('dashboard.searchPanel.problemGuideModalTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-blue-100">
            <p>{t('dashboard.searchPanel.guideStep1')}</p>
            <p>{t('dashboard.searchPanel.guideStep2')}</p>
            <p>{t('dashboard.searchPanel.guideStep3')}</p>
            <p>{t('dashboard.searchPanel.guideConclusion')}</p>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
