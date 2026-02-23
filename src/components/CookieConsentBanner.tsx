import { useEffect, useState } from "react";

type CookieConsentChoice = "essential" | "all";

type CookieConsentBannerProps = {
  onOpenDatenschutz: () => void;
};

type StoredCookieConsent = {
  version: number;
  consent: CookieConsentChoice;
  updatedAt: string;
};

const COOKIE_CONSENT_STORAGE_KEY = "leadgen.cookie-consent.v2";

const readConsent = (): StoredCookieConsent | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredCookieConsent>;
    if (
      parsed.version === 1 &&
      (parsed.consent === "essential" || parsed.consent === "all") &&
      typeof parsed.updatedAt === "string"
    ) {
      return {
        version: 1,
        consent: parsed.consent,
        updatedAt: parsed.updatedAt,
      };
    }
  } catch {
    return null;
  }

  return null;
};

const writeConsent = (consent: CookieConsentChoice): void => {
  if (typeof window === "undefined") {
    return;
  }

  const payload: StoredCookieConsent = {
    version: 1,
    consent,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(payload));
};

export function CookieConsentBanner({ onOpenDatenschutz }: CookieConsentBannerProps) {
  const [visible, setVisible] = useState<boolean>(() => readConsent() === null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed border border-white/10 bg-[#070b18]/95 p-4 backdrop-blur-lg"
      style={{
        zIndex: 12000,
        right: "1rem",
        bottom: "1rem",
        width: "min(92vw, 420px)",
        borderRadius: "14px",
        boxShadow: "0 20px 45px rgba(0, 0, 0, 0.45)",
        transform: entered ? "translateY(0)" : "translateY(18px)",
        opacity: entered ? 1 : 0,
        transition: "transform 220ms ease, opacity 220ms ease",
      }}
    >
      <div className="flex flex-col gap-3">
        <div>
          <p className="mb-1 text-sm font-semibold text-white">Cookie-Hinweis</p>
          <p className="text-sm text-gray-300">
            Wir verwenden notwendige Cookies und Local Storage fuer Login, Sicherheit und
            Grundeinstellungen. Optionale Cookies werden nur mit Ihrer Einwilligung genutzt.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              writeConsent("essential");
              setEntered(false);
              setVisible(false);
            }}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-gray-200 transition hover:bg-white/10 hover:text-white"
          >
            Nur notwendige Cookies
          </button>
          <button
            type="button"
            onClick={() => {
              writeConsent("all");
              setEntered(false);
              setVisible(false);
            }}
            className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-2 text-sm font-medium text-white transition hover:from-blue-600 hover:to-purple-700"
          >
            Alle Cookies akzeptieren
          </button>
          <button
            type="button"
            onClick={onOpenDatenschutz}
            className="rounded-lg border border-cyan-300/35 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/20"
          >
            Datenschutz ansehen
          </button>
        </div>
      </div>
    </div>
  );
}
