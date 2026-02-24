import { useI18n } from '../i18n';

interface FooterProps {
  onNavigateDatenschutz: () => void;
  onNavigateImpressum: () => void;
}

export function Footer({ onNavigateDatenschutz, onNavigateImpressum }: FooterProps) {
  const { t } = useI18n();
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;

  return (
    <footer className="border-t border-white/5 bg-white/[0.02] backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img
                src={logoSrc}
                alt="Lead Generator logo"
                className="shrink-0 rounded-lg object-cover"
                style={{ width: '2.5rem', height: '2.5rem' }}
              />
              <span className="text-xl font-semibold">{t('common.appName')}</span>
            </div>
            <p className="text-sm text-gray-500 max-w-md">{t('footer.disclaimer')}</p>
          </div>

          <div className="flex flex-col md:items-end gap-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <button
                type="button"
                onClick={onNavigateDatenschutz}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {t('footer.privacyPolicy')}
              </button>
              <button
                type="button"
                onClick={onNavigateImpressum}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {t('footer.termsOfService')}
              </button>
            </div>
            <p className="text-sm text-gray-500">{t('footer.copyright')}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
