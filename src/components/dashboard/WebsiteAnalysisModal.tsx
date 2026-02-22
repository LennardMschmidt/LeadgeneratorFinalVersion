import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Check, ChevronDown, Sparkles, X as CloseX } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

interface WebsiteAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  analysis: Record<string, unknown> | null;
  businessName?: string;
  aiSummary?: string;
  onGenerateAiSummary?: () => Promise<void> | void;
  aiSummaryLoading?: boolean;
  onNavigateBilling?: () => void;
}

const SECTION_KEYS = [
  'accessibility',
  'seo',
  'conversion',
  'trust',
  'performance',
  'technology',
  'domain',
] as const;

type SectionKey = (typeof SECTION_KEYS)[number];

const SECTION_LABELS: Record<SectionKey, string> = {
  accessibility: 'Accessibility',
  seo: 'SEO',
  conversion: 'Conversion',
  trust: 'Trust',
  performance: 'Performance',
  technology: 'Technology',
  domain: 'Domain',
};

const INFO_EXCLUDED_KEYS = new Set(['final_url', 'total_transfer_kb', 'domain_creation_date']);

const ATTRIBUTE_INFO_EN: Partial<Record<SectionKey, Record<string, { what: string; ideal: string }>>> = {
  accessibility: {
    reachable: {
      what: 'Means the website could actually be reached during this check. In practical terms: the domain is live and users can open the homepage in a browser.',
      ideal: 'Yes',
    },
    status_code: {
      what: 'The HTTP response code from the homepage. It tells whether the page was delivered successfully or blocked/errored.',
      ideal: '200',
    },
    uses_https: {
      what: 'Checks if the site uses HTTPS (secure connection). HTTPS protects user data and is a trust/SEO baseline.',
      ideal: 'Yes',
    },
    valid_ssl: {
      what: 'SSL is the security certificate behind HTTPS. This checks whether that certificate is valid and trusted. Invalid SSL can show browser warnings and reduce trust.',
      ideal: 'Yes',
    },
    load_time_ms: {
      what: 'How long the homepage needed to respond in this scan. Higher values usually mean slower user experience.',
      ideal: 'Below 1000 ms',
    },
    proxy_used: {
      what: 'Shows whether the request used a proxy server. A proxy is an intermediate server/IP used to fetch the page when direct requests may be blocked.',
      ideal: 'Informational (either is acceptable)',
    },
    proxy_endpoint: {
      what: 'The proxy endpoint used for this run (if any). Helpful for debugging blocked requests and comparing proxy performance.',
      ideal: 'Informational',
    },
    request_attempts: {
      what: 'How many tries were needed to get a response. Multiple attempts can indicate instability or anti-bot protection.',
      ideal: '1',
    },
    blocked_or_forbidden: {
      what: 'Indicates the site refused access (for example 403, challenge page, or anti-bot block).',
      ideal: 'No',
    },
  },
  seo: {
    has_title: {
      what: 'Checks whether the homepage has a title tag for search results.',
      ideal: 'Yes',
    },
    title_length: {
      what: 'Length of the page title text.',
      ideal: '30-60 characters',
    },
    has_meta_description: {
      what: 'Checks if a meta description is present for search previews.',
      ideal: 'Yes',
    },
    meta_description_length: {
      what: 'Length of the meta description.',
      ideal: '120-160 characters',
    },
    h1_count: {
      what: 'How many main headings (H1) exist on the homepage.',
      ideal: '1',
    },
    images_missing_alt: {
      what: 'How many images are missing alt text.',
      ideal: '0',
    },
    has_sitemap: {
      what: 'Checks if sitemap.xml exists so search engines can discover pages.',
      ideal: 'Yes',
    },
    has_robots_txt: {
      what: 'robots.txt is a small file for search engines. It tells crawlers which parts of the site may or may not be crawled.',
      ideal: 'Yes',
    },
    has_structured_data: {
      what: 'Checks if structured data/schema markup is present.',
      ideal: 'Yes',
    },
  },
  conversion: {
    has_contact_form: {
      what: 'Checks if users can contact the business via a form.',
      ideal: 'Yes',
    },
    has_phone_number: {
      what: 'Checks if a visible phone number is present.',
      ideal: 'Yes',
    },
    has_email: {
      what: 'Checks if a visible email contact is present.',
      ideal: 'Yes',
    },
    has_cta_keywords: {
      what: 'Checks if clear call-to-action wording is present.',
      ideal: 'Yes',
    },
  },
  trust: {
    has_impressum: {
      what: 'Checks if an Impressum/legal notice is visible.',
      ideal: 'Yes',
    },
    has_privacy_policy: {
      what: 'Checks if a privacy policy is visible.',
      ideal: 'Yes',
    },
    has_cookie_banner: {
      what: 'Checks if cookie consent appears when needed.',
      ideal: 'Yes',
    },
  },
  performance: {
    page_size_kb: {
      what: 'Estimated amount of data loaded by the homepage.',
      ideal: 'Below 500 KB',
    },
    script_count: {
      what: 'Number of JavaScript resources on the homepage.',
      ideal: 'As low as practical',
    },
    stylesheet_count: {
      what: 'Number of stylesheet resources on the homepage.',
      ideal: 'As low as practical',
    },
  },
};

const ATTRIBUTE_INFO_DE: Partial<Record<SectionKey, Record<string, { what: string; ideal: string }>>> = {
  accessibility: {
    reachable: {
      what: 'Zeigt, ob die Startseite überhaupt geöffnet werden konnte.',
      ideal: 'Ja',
    },
    status_code: {
      what: 'HTTP-Statuscode der Startseite.',
      ideal: '200',
    },
    uses_https: {
      what: 'Prüft, ob die Website eine sichere HTTPS-Verbindung nutzt.',
      ideal: 'Ja',
    },
    valid_ssl: {
      what: 'Prüft, ob das SSL-Zertifikat gültig und vertrauenswürdig ist.',
      ideal: 'Ja',
    },
    load_time_ms: {
      what: 'Antwortzeit der Startseite bei diesem Check.',
      ideal: 'Unter 1000 ms',
    },
  },
};

const labelize = (value: string): string =>
  value
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());

const toRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const asBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'N/A';
  if (typeof value === 'string') return value.trim().length > 0 ? value : 'N/A';
  if (Array.isArray(value)) return value.length ? JSON.stringify(value) : '[]';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const buildSummary = (analysis: Record<string, unknown> | null, businessName: string | undefined, language: 'en' | 'de') => {
  if (!analysis) {
    return {
      overview:
        language === 'de'
          ? 'Noch keine Analyse vorhanden. Starte zuerst eine Website-Analyse.'
          : 'No analysis available yet. Run a website analysis first.',
      improvements: [
        language === 'de'
          ? 'Analyse ausführen, damit konkrete Empfehlungen erstellt werden können.'
          : 'Run analysis so concrete recommendations can be generated.',
      ],
    };
  }

  const seo = toRecord(analysis.seo);
  const conversion = toRecord(analysis.conversion);
  const trust = toRecord(analysis.trust);
  const accessibility = toRecord(analysis.accessibility);
  const performance = toRecord(analysis.performance);

  const positives: string[] = [];
  const weaknesses: string[] = [];
  const improvements: string[] = [];

  if (asBoolean(accessibility?.reachable) === true) positives.push(language === 'de' ? 'die Startseite ist erreichbar' : 'the homepage is reachable');
  if (asBoolean(accessibility?.uses_https) === true) positives.push(language === 'de' ? 'HTTPS ist aktiv' : 'HTTPS is active');
  if (asBoolean(seo?.has_title) === true) positives.push(language === 'de' ? 'ein Seitentitel ist vorhanden' : 'a page title is present');

  if (asBoolean(seo?.has_meta_description) === false) {
    weaknesses.push(language === 'de' ? 'Meta Description fehlt' : 'meta description is missing');
    improvements.push(language === 'de' ? 'Meta Description ergänzen, damit Google-Snippets klarer werden.' : 'Add a meta description for better search snippets.');
  }

  if ((asNumber(seo?.h1_count) ?? 0) === 0) {
    weaknesses.push(language === 'de' ? 'keine klare H1-Überschrift' : 'no clear H1 heading');
    improvements.push(language === 'de' ? 'Eine klare H1 auf der Startseite setzen.' : 'Add one clear H1 heading on the homepage.');
  }

  if (asBoolean(conversion?.has_contact_form) === false) {
    weaknesses.push(language === 'de' ? 'kein Kontaktformular' : 'no contact form');
    improvements.push(language === 'de' ? 'Ein sichtbares Kontaktformular einbauen.' : 'Add a visible contact form.');
  }

  if (asBoolean(trust?.has_impressum) === false) {
    weaknesses.push(language === 'de' ? 'Impressum fehlt' : 'Impressum is missing');
    improvements.push(language === 'de' ? 'Impressum klar verlinken (Footer + ggf. Header).' : 'Add a clearly linked Impressum page.');
  }

  if (asBoolean(trust?.has_privacy_policy) === false) {
    weaknesses.push(language === 'de' ? 'Datenschutzerklärung fehlt' : 'privacy policy is missing');
    improvements.push(language === 'de' ? 'Datenschutzseite ergänzen und sichtbar verlinken.' : 'Add and clearly link a privacy policy page.');
  }

  if ((asNumber(performance?.page_size_kb) ?? 0) > 900) {
    weaknesses.push(language === 'de' ? 'Startseite ist zu groß' : 'homepage payload is too large');
    improvements.push(language === 'de' ? 'Bilder und Skripte komprimieren, um Ladezeit zu senken.' : 'Compress images/scripts to reduce load time.');
  }

  if (improvements.length === 0) {
    improvements.push(
      language === 'de'
        ? 'Der Auftritt wirkt bereits solide. Fokus auf laufende UX- und Conversion-Optimierung.'
        : 'The website already looks solid. Focus on ongoing UX and conversion optimization.',
    );
  }

  const name = businessName?.trim() || (language === 'de' ? 'Diese Website' : 'This website');
  const goodPart =
    positives.length > 0
      ? language === 'de'
        ? `Positiv: ${positives.slice(0, 3).join(', ')}.`
        : `Good signs: ${positives.slice(0, 3).join(', ')}.`
      : language === 'de'
        ? 'Es wurden nur wenige starke Signale erkannt.'
        : 'Only a few strong signals were detected.';
  const weakPart =
    weaknesses.length > 0
      ? language === 'de'
        ? `Schwächen: ${weaknesses.slice(0, 4).join(', ')}.`
        : `Main weaknesses: ${weaknesses.slice(0, 4).join(', ')}.`
      : language === 'de'
        ? 'Keine größeren Schwächen auf der Startseite erkannt.'
        : 'No major homepage weaknesses detected.';

  const overview =
    language === 'de'
      ? `${name}: ${goodPart} ${weakPart} Diese Punkte beeinflussen Vertrauen, Sichtbarkeit und Anfragen.`
      : `${name}: ${goodPart} ${weakPart} These points influence trust, visibility, and lead conversion.`;

  return { overview, improvements: improvements.slice(0, 6) };
};

const renderSection = (
  sectionName: SectionKey,
  rawSection: unknown,
  openInfoKey: string | null,
  setOpenInfoKey: (value: string | null) => void,
  language: 'en' | 'de',
) => {
  if (typeof rawSection !== 'object' || rawSection === null || Array.isArray(rawSection)) {
    return (
      <section key={sectionName} className="rounded-2xl border border-white/20 bg-white/[0.05] p-8">
        <h3 className="mb-10 text-2xl font-semibold text-white">{SECTION_LABELS[sectionName]}</h3>
        <p className="text-lg text-slate-300">No structured data available.</p>
      </section>
    );
  }

  const entries = Object.entries(rawSection as Record<string, unknown>);
  if (entries.length === 0) {
    return (
      <section key={sectionName} className="rounded-2xl border border-white/20 bg-white/[0.05] p-8">
        <h3 className="mb-10 text-2xl font-semibold text-white">{SECTION_LABELS[sectionName]}</h3>
        <p className="text-lg text-slate-300">No data.</p>
      </section>
    );
  }

  const infoMap = language === 'de' ? ATTRIBUTE_INFO_DE : ATTRIBUTE_INFO_EN;

  return (
    <section key={sectionName} className="rounded-2xl border border-white/20 bg-white/[0.05] p-8">
      <h3 className="mb-10 text-2xl font-semibold text-white">{SECTION_LABELS[sectionName]}</h3>
      <div className="space-y-2 rounded-xl bg-white/[0.02] px-2 py-2">
        {entries.map(([key, value], index) => {
          const rowKey = `${sectionName}-${key}`;
          const isOpen = openInfoKey === rowKey;
          const info = infoMap[sectionName]?.[key];
          return (
            <div key={rowKey}>
              <div
                className="relative flex items-start justify-between gap-6 rounded-lg border px-6 py-4 text-lg transition-all duration-200"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0)',
                  backgroundColor:
                    index % 2 === 0
                      ? 'rgba(255, 255, 255, 0.035)'
                      : 'rgba(34, 211, 238, 0.11)',
                }}
              >
                <span className="inline-flex items-center gap-3 text-slate-200">
                  {INFO_EXCLUDED_KEYS.has(key) ? null : (
                    <button
                      type="button"
                      aria-label={`Explain ${labelize(key)}`}
                      onClick={() => setOpenInfoKey(isOpen ? null : rowKey)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm font-bold transition-all duration-200"
                      style={{
                        borderColor: 'rgba(34, 211, 238, 0.6)',
                        color: 'rgba(165, 243, 252, 0.95)',
                        boxShadow: '0 0 0 0 rgba(34,211,238,0)',
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.95)';
                        event.currentTarget.style.color = 'rgba(236, 254, 255, 1)';
                        event.currentTarget.style.boxShadow =
                          '0 0 0 1px rgba(34,211,238,0.9), 0 0 12px rgba(34,211,238,0.55)';
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.6)';
                        event.currentTarget.style.color = 'rgba(165, 243, 252, 0.95)';
                        event.currentTarget.style.boxShadow = '0 0 0 0 rgba(34,211,238,0)';
                      }}
                    >
                      !
                    </button>
                  )}
                  {labelize(key)}
                </span>
                {typeof value === 'boolean' ? (
                  value ? (
                    <Check className="h-8 w-8" style={{ color: '#22c55e', filter: 'drop-shadow(0 0 6px rgba(34,197,94,0.75))' }} />
                  ) : (
                    <CloseX className="h-8 w-8" style={{ color: '#ef4444', filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.75))' }} />
                  )
                ) : (
                  <span className="max-w-[60%] break-words text-right text-slate-100">{formatValue(value)}</span>
                )}
              </div>
              {isOpen ? (
                <div className="mx-2 mt-2 rounded-lg border border-cyan-300/35 bg-cyan-500/[0.09] px-4 py-3 text-sm text-cyan-100">
                  <p>
                    {info?.what ??
                      (language === 'de'
                        ? 'Dieser Wert zeigt, wie stark dieser Bereich auf der Startseite aktuell ist.'
                        : 'This value shows how strong this homepage area currently is.')}
                  </p>
                  <p className="mt-1 text-cyan-50/95">
                    {language === 'de' ? 'Ideal:' : 'Ideal:'}{' '}
                    {info?.ideal ?? (typeof value === 'boolean' ? (language === 'de' ? 'Ja' : 'Yes') : language === 'de' ? 'ein starker nutzerfreundlicher Wert' : 'a strong user-friendly value')}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export function WebsiteAnalysisModal({
  open,
  onClose,
  analysis,
  businessName,
  aiSummary,
  onGenerateAiSummary,
  aiSummaryLoading = false,
  onNavigateBilling,
}: WebsiteAnalysisModalProps) {
  const { language } = useI18n();
  const currentLanguage = language === 'de' ? 'de' : 'en';

  const [openInfoKey, setOpenInfoKey] = useState<string | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const overlayStyle: CSSProperties = {
    zIndex: 340,
    backgroundColor: 'rgba(2, 6, 23, 0.84)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  };
  const contentStyle: CSSProperties = {
    zIndex: 350,
    boxShadow: '0 28px 80px rgba(2, 6, 23, 0.72)',
  };

  const normalizedAnalysis =
    analysis && typeof analysis === 'object' && !Array.isArray(analysis) ? analysis : null;

  useEffect(() => {
    setIsSummaryOpen(true);
    setSummaryError(null);
    setShowUpgradePrompt(false);
  }, [normalizedAnalysis, businessName, currentLanguage, aiSummary]);

  const canGenerateSummary = !!normalizedAnalysis && !!onGenerateAiSummary;
  const missingAnalysisMessage =
    currentLanguage === 'de'
      ? 'Führe zuerst eine Website-Analyse aus.'
      : 'Run website analysis first.';

  const handleGenerateSummary = async () => {
    if (!onGenerateAiSummary || !normalizedAnalysis || aiSummaryLoading) {
      return;
    }

    setSummaryError(null);
    setShowUpgradePrompt(false);
    try {
      await onGenerateAiSummary();
      setIsSummaryOpen(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : currentLanguage === 'de' ? 'Fehlgeschlagen.' : 'Failed.';
      setSummaryError(message);
      if (/insufficient|remaining|token|limit/i.test(message)) {
        setShowUpgradePrompt(true);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        overlayStyle={overlayStyle}
        style={contentStyle}
        hideCloseButton
        className="max-h-[90vh] overflow-y-auto border-white/25 bg-slate-950/98 text-white sm:max-w-[980px]"
      >
        <DialogClose
          aria-label="Close website analysis"
          className="absolute right-4 top-4 z-[360] p-1 text-slate-200/90 transition-colors hover:text-white focus:outline-none"
          style={{ right: '1rem', left: 'auto', top: '1rem' }}
        >
          <CloseX className="h-8 w-8 transition-transform duration-300 ease-out hover:rotate-90 hover:scale-110" />
        </DialogClose>

        <DialogHeader>
          <DialogTitle className="pr-14 leading-tight">
            <span
              className="block font-semibold text-slate-200"
              style={{ fontSize: '3rem', lineHeight: 1.08 }}
            >
              {currentLanguage === 'de' ? 'Website-Analyse' : 'Website Analysis'}
            </span>
            {businessName ? (
              <span
                className="mt-2 block font-bold text-white"
                style={{ fontSize: '3.2rem', lineHeight: 1.06 }}
              >
                {businessName}
              </span>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        <section className="rounded-xl border border-amber-300/35 bg-amber-500/10 px-6 py-4">
          <p className="text-base font-semibold text-amber-100">
            {currentLanguage === 'de' ? 'Wichtiger Hinweis' : 'Important note'}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-50/95">
            {currentLanguage === 'de'
              ? 'Diese Auswertung basiert nur auf der Startseite (Homepage). Weitere Unterseiten wie Kontakt, Leistungen, Impressum oder Datenschutz wurden hier nicht mitgeprüft.'
              : 'This analysis is based on the homepage only. Other pages such as contact, services, legal notice, or privacy policy pages are not included in this result.'}
          </p>
        </section>

        <section
          className="rounded-2xl px-8 pb-10 pt-14"
          style={{
            border: '1px solid rgba(34, 211, 238, 0.75)',
            background:
              'linear-gradient(120deg, rgba(14, 116, 144, 0.24), rgba(59, 130, 246, 0.16), rgba(217, 70, 239, 0.16))',
            boxShadow:
              '0 0 0 1px rgba(34,211,238,0.55), 0 0 30px rgba(34,211,238,0.32), inset 0 0 24px rgba(34,211,238,0.08)',
          }}
        >
          <div className="flex items-center justify-between gap-8" style={{ marginTop: '20px', marginBottom: '20px' }}>
            <h3 className="text-2xl font-semibold text-cyan-50">AI Summary</h3>
            {typeof aiSummary === 'string' && aiSummary.trim().length > 0 ? (
              <button
                type="button"
                onClick={() => setIsSummaryOpen((current) => !current)}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/60 bg-cyan-400/10 px-3 py-1.5 text-sm font-medium text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-400/20"
              >
                {isSummaryOpen ? (currentLanguage === 'de' ? 'Ausblenden' : 'Hide') : currentLanguage === 'de' ? 'Anzeigen' : 'Show'}
                <ChevronDown
                  className={`h-5 w-5 transition-transform duration-200 ${
                    isSummaryOpen ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </button>
            ) : null}
          </div>

          <div className="ml-1" style={{ marginTop: '20px', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => {
                void handleGenerateSummary();
              }}
              disabled={!canGenerateSummary || aiSummaryLoading}
              title={!canGenerateSummary ? missingAnalysisMessage : undefined}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                border: '1px solid rgba(103, 232, 249, 0.86)',
                backgroundColor: 'rgba(34, 211, 238, 0.2)',
                color: 'rgba(240, 253, 250, 1)',
                boxShadow: '0 0 0 1px rgba(34,211,238,0.35), 0 0 18px rgba(34,211,238,0.28)',
              }}
              onMouseEnter={(event) => {
                if (!canGenerateSummary || aiSummaryLoading) {
                  return;
                }
                event.currentTarget.style.backgroundColor = 'rgba(34, 211, 238, 0.32)';
                event.currentTarget.style.borderColor = 'rgba(165, 243, 252, 0.98)';
                event.currentTarget.style.boxShadow =
                  '0 0 0 1px rgba(34,211,238,0.55), 0 0 24px rgba(34,211,238,0.48)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = 'rgba(34, 211, 238, 0.2)';
                event.currentTarget.style.borderColor = 'rgba(103, 232, 249, 0.86)';
                event.currentTarget.style.boxShadow =
                  '0 0 0 1px rgba(34,211,238,0.35), 0 0 18px rgba(34,211,238,0.28)';
              }}
            >
              <Sparkles className="h-4 w-4" />
              {aiSummaryLoading
                ? currentLanguage === 'de'
                  ? 'Generiere...'
                  : 'Generating...'
                : currentLanguage === 'de'
                  ? 'AI-Zusammenfassung generieren'
                  : 'Generate AI Summary'}
            </button>
          </div>

          {summaryError ? (
            <div className="mt-4 rounded-lg border border-rose-300/30 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
              {summaryError}
            </div>
          ) : null}

          {showUpgradePrompt && onNavigateBilling ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={onNavigateBilling}
                className="rounded-lg border border-cyan-300/55 bg-cyan-400/15 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/25"
              >
                {currentLanguage === 'de' ? 'Upgrade für mehr AI-Tokens' : 'Upgrade for more AI tokens'}
              </button>
            </div>
          ) : null}

          {isSummaryOpen ? (
            <div className="mt-8 mb-2 pr-1">
              <div className="space-y-4 rounded-xl border border-cyan-200/35 bg-slate-950/30 px-6 py-6">
                {typeof aiSummary === 'string' && aiSummary.trim().length > 0 ? (
                  <p className="whitespace-pre-wrap text-lg leading-relaxed text-slate-50">{aiSummary}</p>
                ) : (
                  <p className="text-base text-slate-200">
                    {currentLanguage === 'de'
                      ? 'Noch keine AI-Zusammenfassung vorhanden.'
                      : 'No AI summary generated yet.'}
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </section>

        {!normalizedAnalysis ? (
          <div className="rounded-2xl border border-white/20 bg-white/[0.05] p-8 text-lg text-slate-300">
            No analysis data is available.
          </div>
        ) : (
          <div className="space-y-12 pt-4 pb-2">
            {SECTION_KEYS.map((sectionKey) =>
              renderSection(
                sectionKey,
                normalizedAnalysis[sectionKey],
                openInfoKey,
                setOpenInfoKey,
                currentLanguage,
              ),
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
