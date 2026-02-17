import { Sparkles } from 'lucide-react';
import { useI18n } from '../i18n';

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-white/5 bg-white/[0.02] backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold">{t('common.appName')}</span>
            </div>
            <p className="text-sm text-gray-500 max-w-md">{t('footer.disclaimer')}</p>
          </div>

          <div className="flex flex-col md:items-end gap-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                {t('footer.privacyPolicy')}
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                {t('footer.termsOfService')}
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                {t('footer.contact')}
              </a>
            </div>
            <p className="text-sm text-gray-500">{t('footer.copyright')}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
