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
  aiSummaryLocked?: boolean;
  onNavigateBilling?: () => void;
}

type AiSummarySectionKey = 'businessOverview' | 'strengths' | 'weaknesses' | 'howWeCanHelp';

type AiSummarySection = {
  key: AiSummarySectionKey;
  title: string;
  bullets: string[];
};

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

type FieldInfo = { what: string; ideal: string };

const INFO_EXCLUDED_KEYS = new Set<string>();

const ATTRIBUTE_INFO_EN: Partial<Record<SectionKey, Record<string, FieldInfo>>> = {
  accessibility: {
    reachable: {
      what: 'This tells you whether the analyzer could open the homepage at all. If this is false, many other checks are limited because the page content could not be fetched.',
      ideal: 'Yes',
    },
    status_code: {
      what: 'HTTP status code returned by the homepage request. 200 means success, 3xx means redirects, and 4xx/5xx usually mean errors, blocking, or server problems.',
      ideal: '200',
    },
    uses_https: {
      what: 'Whether the final homepage URL uses HTTPS (encrypted connection). HTTPS is a baseline for trust, browser security warnings, and SEO.',
      ideal: 'Yes',
    },
    valid_ssl: {
      what: 'Whether the SSL/TLS certificate is valid and trusted by browsers. Invalid certificates can trigger browser warnings and reduce user trust immediately.',
      ideal: 'Yes',
    },
    load_time_ms: {
      what: 'Measured response time in milliseconds for the homepage request. Lower is generally better for UX, conversions, and perceived quality.',
      ideal: 'Below 1000 ms',
    },
    proxy_used: {
      what: 'Whether the analyzer used a proxy IP instead of a direct request. This is mainly a data-collection/network detail and does not directly describe website quality.',
      ideal: 'Informational',
    },
    proxy_endpoint: {
      what: 'Which proxy gateway was used for this run (masked). Useful for debugging blocked requests, retries, and network behavior during analysis.',
      ideal: 'Informational',
    },
    request_attempts: {
      what: 'How many request attempts were needed before the analyzer returned a final result. Higher values can indicate unstable hosting, throttling, or anti-bot protection.',
      ideal: '1',
    },
    blocked_or_forbidden: {
      what: 'Flags whether the homepage request was blocked or forbidden (for example 401/403/429 responses or challenge pages).',
      ideal: 'No',
    },
    final_url: {
      what: 'The final homepage URL after redirects. This helps confirm canonical routing (for example www/non-www, http to https, locale redirects).',
      ideal: 'A clean, expected canonical URL',
    },
    total_transfer_kb: {
      what: 'Approximate amount of downloaded data (headers + content) during the accessibility request attempts, measured in kilobytes.',
      ideal: 'As low as practical',
    },
    error: {
      what: 'Technical error message captured when the request failed (for example timeout, DNS, SSL, or blocked access).',
      ideal: 'No error message',
    },
    url: {
      what: 'Input URL that was submitted for analysis before redirects were followed.',
      ideal: 'A valid homepage URL',
    },
  },
  seo: {
    has_title: {
      what: 'Checks whether a <title> tag exists. The title is the main clickable headline in search results and browser tabs.',
      ideal: 'Yes',
    },
    title_length: {
      what: 'Character length of the <title> text. Titles that are too short or too long can reduce clarity in search results.',
      ideal: '30-60 characters',
    },
    has_meta_description: {
      what: 'Checks whether a meta description exists. This often appears as preview text in search results and influences click-through behavior.',
      ideal: 'Yes',
    },
    meta_description_length: {
      what: 'Character length of the meta description text.',
      ideal: '120-160 characters',
    },
    h1_count: {
      what: 'Number of H1 headings on the homepage. H1 is the primary page heading and helps structure content for users and search engines.',
      ideal: '1',
    },
    images_total: {
      what: 'Total number of <img> elements found on the homepage.',
      ideal: 'Informational',
    },
    images_missing_alt: {
      what: 'Number of images missing alt text. Alt text supports accessibility (screen readers) and gives search engines context about images.',
      ideal: '0',
    },
    has_sitemap: {
      what: 'Checks whether `/sitemap.xml` is reachable. A sitemap helps search engines discover and crawl important pages efficiently.',
      ideal: 'Yes',
    },
    has_robots_txt: {
      what: 'Checks whether `/robots.txt` exists. This file communicates crawl guidance to search bots and prevents accidental crawl issues.',
      ideal: 'Yes',
    },
    has_structured_data: {
      what: 'Checks for schema/structured-data markup (JSON-LD). Structured data can improve search understanding and rich-result eligibility.',
      ideal: 'Yes',
    },
  },
  conversion: {
    has_contact_form: {
      what: 'Checks if a usable contact form is present on the homepage (form with interactive fields).',
      ideal: 'Yes',
    },
    has_booking_keyword: {
      what: 'Checks for booking/reservation intent words (for example “book”, “booking”, “reservation”, “termin”) in visible content.',
      ideal: 'Yes, if bookings are part of your sales flow',
    },
    has_phone_number: {
      what: 'Checks whether a phone number is visible or linked (`tel:`), so users can contact the business directly.',
      ideal: 'Yes',
    },
    has_email: {
      what: 'Checks whether an email address is visible or linked (`mailto:`) on the homepage.',
      ideal: 'Yes',
    },
    has_cta_keywords: {
      what: 'Checks for call-to-action wording (for example contact, get offer, book now). CTAs guide visitors toward the next conversion step.',
      ideal: 'Yes',
    },
  },
  trust: {
    has_impressum: {
      what: 'Checks for a visible legal notice (Impressum / provider identification), especially important in German-speaking markets.',
      ideal: 'Yes',
    },
    has_privacy_policy: {
      what: 'Checks for a visible privacy policy (Datenschutz / Privacy Policy), which is essential for legal trust and data transparency.',
      ideal: 'Yes',
    },
    has_dsgvo_reference: {
      what: 'Checks whether GDPR/DSGVO references are present in page text or links.',
      ideal: 'Yes, if GDPR compliance applies',
    },
    has_cookie_banner: {
      what: 'Checks for cookie consent/banner signals (for example Cookiebot, Onetrust, consent wording).',
      ideal: 'Yes',
    },
    has_copyright_notice: {
      what: 'Checks for copyright indicators (for example ©, “All rights reserved”, “Urheberrecht”).',
      ideal: 'Yes',
    },
  },
  performance: {
    page_size_kb: {
      what: 'Approximate homepage payload size in kilobytes, based on response content. Larger payloads often slow down first-load experience.',
      ideal: 'Below 500 KB',
    },
    script_count: {
      what: 'Number of JavaScript tags/resources on the homepage. Too many scripts can increase load time and execution overhead.',
      ideal: 'As low as practical',
    },
    stylesheet_count: {
      what: 'Number of stylesheet resources linked on the homepage. More stylesheets can increase request overhead and render blocking.',
      ideal: 'As low as practical',
    },
  },
  technology: {
    generator_meta: {
      what: 'Value of the HTML generator meta tag (if present), which may reveal CMS/framework/version information.',
      ideal: 'Informational',
    },
    detected_cms: {
      what: 'Detected content management system/platform from HTML and headers (for example WordPress, Shopify, Wix, Webflow). If empty, no reliable CMS fingerprint was found.',
      ideal: 'Informational',
    },
  },
  domain: {
    domain_creation_date: {
      what: 'Domain creation date from WHOIS records for the root domain. Older domains can indicate a longer online presence, but age alone is not a quality guarantee.',
      ideal: 'Informational',
    },
    whois_error: {
      what: 'WHOIS lookup error message when domain registration data could not be retrieved (for example privacy masking, registry limits, or timeout).',
      ideal: 'No error message',
    },
  },
};

const ATTRIBUTE_INFO_DE: Partial<Record<SectionKey, Record<string, FieldInfo>>> = {
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
    proxy_used: {
      what: 'Zeigt, ob der Abruf über eine Proxy-IP lief. Das ist ein technischer Abrufhinweis und kein direktes Qualitätsmerkmal der Website.',
      ideal: 'Informational',
    },
    proxy_endpoint: {
      what: 'Genutzter Proxy-Endpunkt (maskiert) für diesen Lauf. Hilft beim Debuggen von Blockierungen.',
      ideal: 'Informational',
    },
  },
};

const getFallbackFieldInfo = (
  sectionName: SectionKey,
  key: string,
  value: unknown,
  language: 'en' | 'de',
): FieldInfo => {
  const label = labelize(key);

  if (language === 'de') {
    if (key.startsWith('has_')) {
      return {
        what: `Dieses Feld prüft, ob "${labelize(key.slice(4))}" auf der Startseite vorhanden ist.`,
        ideal: 'Ja',
      };
    }
    if (key.endsWith('_count')) {
      return {
        what: `Dieses Feld gibt an, wie viele Elemente bei "${label}" erkannt wurden.`,
        ideal: 'Möglichst niedrig bzw. passend zum Inhalt',
      };
    }
    if (key.endsWith('_length')) {
      return {
        what: `Dieses Feld zeigt die Zeichenlänge von "${label}" an.`,
        ideal: 'Im empfohlenen Bereich',
      };
    }
    if (key.endsWith('_ms')) {
      return {
        what: `Dieses Feld ist eine Zeitmessung in Millisekunden für "${label}".`,
        ideal: 'Möglichst niedrig',
      };
    }
    if (key.endsWith('_kb')) {
      return {
        what: `Dieses Feld ist eine Größenangabe in Kilobyte für "${label}".`,
        ideal: 'Möglichst niedrig',
      };
    }
    if (key.includes('detected')) {
      return {
        what: `Dieses Feld zeigt, was bei "${label}" automatisch erkannt wurde.`,
        ideal: 'Informational',
      };
    }
    return {
      what: `"${label}" ist ein Messwert im Bereich ${SECTION_LABELS[sectionName]}. Er beschreibt den aktuellen technischen Zustand dieses Teilbereichs.`,
      ideal:
        typeof value === 'boolean'
          ? 'Je nach Feld idealerweise Ja'
          : typeof value === 'number'
            ? 'Ein stabiler, nutzerfreundlicher Wert'
            : 'Ein nachvollziehbarer, erwarteter Wert',
    };
  }

  if (key.startsWith('has_')) {
    return {
      what: `This field checks whether "${labelize(key.slice(4))}" is present on the homepage.`,
      ideal: 'Yes',
    };
  }
  if (key.endsWith('_count')) {
    return {
      what: `This field reports how many items were detected for "${label}".`,
      ideal: 'As low as practical or context-appropriate',
    };
  }
  if (key.endsWith('_length')) {
    return {
      what: `This field reports the text length for "${label}" (character count).`,
      ideal: 'Within recommended range',
    };
  }
  if (key.endsWith('_ms')) {
    return {
      what: `This field is a timing metric in milliseconds for "${label}".`,
      ideal: 'Lower is generally better',
    };
  }
  if (key.endsWith('_kb')) {
    return {
      what: `This field is a size metric in kilobytes for "${label}".`,
      ideal: 'Lower is generally better',
    };
  }
  if (key.includes('detected')) {
    return {
      what: `This field lists what was automatically detected for "${label}".`,
      ideal: 'Informational',
    };
  }

  return {
    what: `"${label}" is a metric from the ${SECTION_LABELS[sectionName]} scan and describes the current technical state of this area.`,
    ideal:
      typeof value === 'boolean'
        ? 'For many checks, Yes is preferred'
        : typeof value === 'number'
          ? 'A stable user-friendly value'
          : 'A clear expected value',
  };
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

const AI_SUMMARY_TITLES: Record<'en' | 'de', Record<AiSummarySectionKey, string>> = {
  en: {
    businessOverview: 'Business Overview',
    strengths: 'Strengths',
    weaknesses: 'Weaknesses',
    howWeCanHelp: 'How We Can Help',
  },
  de: {
    businessOverview: 'Unternehmensüberblick',
    strengths: 'Stärken',
    weaknesses: 'Schwächen',
    howWeCanHelp: 'Wie wir direkt helfen können',
  },
};

const AI_SUMMARY_HEADING_ALIASES: Record<AiSummarySectionKey, string[]> = {
  businessOverview: ['Business Overview', 'Overview', 'Unternehmensüberblick', 'Geschäftsüberblick'],
  strengths: ['Strengths', 'Stärken'],
  weaknesses: ['Weaknesses', 'Schwächen'],
  howWeCanHelp: ['How We Can Help', 'Recommendations', 'Wie wir helfen können', 'Wie wir direkt helfen können'],
};

const sanitizeAiBullet = (value: string): string =>
  value
    .replace(/^[-*•]\s+/, '')
    .replace(/^\d+[\.\)]\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();

const parseAiBullets = (raw: string): string[] => {
  const normalizedLines = raw
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const lineBulletCandidates = normalizedLines
    .filter((line) => /^[-*•]\s+/.test(line))
    .map(sanitizeAiBullet)
    .filter((line) => line.length > 0);
  if (lineBulletCandidates.length > 0) {
    return lineBulletCandidates.slice(0, 6);
  }

  const compact = raw.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return [];
  }

  const hyphenSplit = compact
    .split(/\s[-•]\s+/)
    .map(sanitizeAiBullet)
    .filter((item) => item.length > 0);
  if (hyphenSplit.length > 1) {
    return hyphenSplit.slice(0, 6);
  }

  return compact
    .split(/\.\s+/)
    .map((item) => sanitizeAiBullet(item.endsWith('.') ? item : `${item}.`))
    .filter((item) => item.length > 0)
    .slice(0, 4);
};

const formatAiSummaryFallbackText = (rawSummary: string): string => {
  const aliases = Object.values(AI_SUMMARY_HEADING_ALIASES)
    .flat()
    .sort((a, b) => b.length - a.length);

  let formatted = rawSummary.replace(/\r/g, '').trim();

  aliases.forEach((alias) => {
    const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\s*${escapedAlias}\\s*[:\\-]?\\s*`, 'gi');
    formatted = formatted.replace(pattern, (match, offset) => {
      const cleanedHeading = match.replace(/[:\-]\s*$/, '').trim();
      return `${offset === 0 ? '' : '\n\n'}${cleanedHeading}\n`;
    });
  });

  return formatted.replace(/\n{3,}/g, '\n\n').trim();
};

const extractAiSummarySections = (
  aiSummary: string | undefined,
  language: 'en' | 'de',
): AiSummarySection[] => {
  if (typeof aiSummary !== 'string') {
    return [];
  }

  const text = aiSummary.replace(/\r/g, '\n').trim();
  if (!text) {
    return [];
  }

  const sectionOrder: AiSummarySectionKey[] = [
    'businessOverview',
    'strengths',
    'weaknesses',
    'howWeCanHelp',
  ];

  const headingMatches: Array<{
    key: AiSummarySectionKey;
    headingStart: number;
    contentStart: number;
  }> = [];

  sectionOrder.forEach((key) => {
    const aliases = AI_SUMMARY_HEADING_ALIASES[key];
    let bestMatch:
      | {
          index: number;
          contentStart: number;
        }
      | null = null;

    aliases.forEach((alias) => {
      const regex = new RegExp(`(^|\\n|\\s)${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:\\-]?\\s*`, 'i');
      const match = regex.exec(text);
      if (!match || typeof match.index !== 'number') {
        return;
      }

      const headingStart = match.index + match[1].length;
      const contentStart = match.index + match[0].length;
      if (!bestMatch || headingStart < bestMatch.index) {
        bestMatch = { index: headingStart, contentStart };
      }
    });

    if (bestMatch) {
      headingMatches.push({
        key,
        headingStart: bestMatch.index,
        contentStart: bestMatch.contentStart,
      });
    }
  });

  if (headingMatches.length === 0) {
    return [];
  }

  headingMatches.sort((a, b) => a.headingStart - b.headingStart);

  return headingMatches
    .map((heading, index) => {
      const nextHeading = headingMatches[index + 1];
      const rawSection = text
        .slice(heading.contentStart, nextHeading ? nextHeading.headingStart : text.length)
        .trim();
      const bullets = parseAiBullets(rawSection);
      return {
        key: heading.key,
        title: AI_SUMMARY_TITLES[language][heading.key],
        bullets,
      };
    })
    .filter((section) => section.bullets.length > 0);
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
          const info = infoMap[sectionName]?.[key] ?? getFallbackFieldInfo(sectionName, key, value, language);
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
                  <p>{info.what}</p>
                  <p className="mt-1 text-cyan-50/95">
                    {language === 'de' ? 'Ideal:' : 'Ideal:'}{' '}
                    {info.ideal}
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
  aiSummaryLocked = false,
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
  const parsedAiSummarySections = useMemo(
    () => extractAiSummarySections(aiSummary, currentLanguage),
    [aiSummary, currentLanguage],
  );

  useEffect(() => {
    setIsSummaryOpen(true);
    setSummaryError(null);
    setShowUpgradePrompt(false);
  }, [normalizedAnalysis, businessName, currentLanguage, aiSummary]);

  const canGenerateSummary = !!normalizedAnalysis && !!onGenerateAiSummary && !aiSummaryLocked;
  const disabledGenerateMessage = !normalizedAnalysis
    ? currentLanguage === 'de'
      ? 'Führe zuerst eine Website-Analyse aus.'
      : 'Run website analysis first.'
    : aiSummaryLocked
      ? currentLanguage === 'de'
        ? 'AI-Zusammenfassung ist in deinem aktuellen Plan nicht enthalten.'
        : 'AI summary is not included in your current plan.'
    : !onGenerateAiSummary
      ? currentLanguage === 'de'
        ? 'Speichere den Lead zuerst, um die AI-Zusammenfassung zu nutzen.'
        : 'Save this lead first to use AI summary.'
      : undefined;

  const handleGenerateSummary = async () => {
    if (!onGenerateAiSummary || !normalizedAnalysis || aiSummaryLoading || aiSummaryLocked) {
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
              title={!canGenerateSummary ? disabledGenerateMessage : undefined}
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

          {(showUpgradePrompt || aiSummaryLocked) && onNavigateBilling ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={onNavigateBilling}
                className="rounded-lg border border-cyan-300/55 bg-cyan-400/15 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/25"
              >
                {currentLanguage === 'de' ? 'Upgrade für AI-Features' : 'Upgrade for AI features'}
              </button>
            </div>
          ) : null}

          {isSummaryOpen ? (
            <div className="mt-8 mb-2 pr-1">
              <div className="space-y-4 rounded-xl border border-cyan-200/35 bg-slate-950/30 px-6 py-6">
                {typeof aiSummary === 'string' && aiSummary.trim().length > 0 ? (
                  parsedAiSummarySections.length > 0 ? (
                    <div>
                      {parsedAiSummarySections.map((section) => (
                        <section
                          key={`ai-summary-${section.key}`}
                          className="space-y-2"
                          style={{ marginBottom: '20px' }}
                        >
                          <h4 className="text-base font-semibold text-cyan-100">{section.title}</h4>
                          <ul className="list-disc space-y-1 pl-5 text-base leading-relaxed text-slate-50">
                            {section.bullets.map((bullet, index) => (
                              <li key={`ai-summary-${section.key}-${index}`}>{bullet}</li>
                            ))}
                          </ul>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-lg leading-relaxed text-slate-50">
                      {`${formatAiSummaryFallbackText(aiSummary)}\n\n`}
                    </p>
                  )
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
          <div className="pt-4 pb-2" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
