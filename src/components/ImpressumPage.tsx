import { LEGAL_CONTACT } from "../legal/legalConfig";

export function ImpressumPage() {
  return (
    <main className="relative mx-auto w-full max-w-4xl px-6 pb-20 pt-14">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="mb-4 text-3xl font-semibold text-white">Impressum</h1>
        <p className="mb-6 text-sm text-gray-300">Angaben gemaess Paragraf 5 TMG</p>

        <div className="mb-8 rounded-xl border border-white/10 bg-black/20 p-5 text-sm text-amber-200">
          Wichtig: Bitte alle Platzhalterdaten vor Veroeffentlichung mit Ihren echten Unternehmensdaten ersetzen.
        </div>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">Anbieter</h2>
          <p className="text-gray-200">{LEGAL_CONTACT.companyName}</p>
          <p className="text-gray-300">{LEGAL_CONTACT.legalForm}</p>
          <p className="text-gray-300">{LEGAL_CONTACT.street}</p>
          <p className="text-gray-300">
            {LEGAL_CONTACT.postalCode} {LEGAL_CONTACT.city}
          </p>
          <p className="text-gray-300">{LEGAL_CONTACT.country}</p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">Vertreten durch</h2>
          <p className="text-gray-300">{LEGAL_CONTACT.managingDirector}</p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">Kontakt</h2>
          <p className="text-gray-300">Telefon: {LEGAL_CONTACT.phone}</p>
          <p className="text-gray-300">
            E-Mail:{" "}
            <a href={`mailto:${LEGAL_CONTACT.email}`} className="text-blue-300 hover:text-blue-200">
              {LEGAL_CONTACT.email}
            </a>
          </p>
          <p className="text-gray-300">
            Website:{" "}
            <a
              href={LEGAL_CONTACT.website}
              target="_blank"
              rel="noreferrer"
              className="text-blue-300 hover:text-blue-200"
            >
              {LEGAL_CONTACT.website}
            </a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">Registereintrag</h2>
          <p className="text-gray-300">Registergericht: {LEGAL_CONTACT.commercialRegisterCourt}</p>
          <p className="text-gray-300">Registernummer: {LEGAL_CONTACT.commercialRegisterNumber}</p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">Umsatzsteuer-ID</h2>
          <p className="text-gray-300">
            Umsatzsteuer-Identifikationsnummer gemaess Paragraf 27a UStG: {LEGAL_CONTACT.vatId}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">Inhaltlich verantwortlich</h2>
          <p className="text-gray-300">{LEGAL_CONTACT.responsibleForContent}</p>
        </section>

        <section className="mb-2">
          <h2 className="mb-3 text-xl font-semibold text-white">EU-Streitschlichtung</h2>
          <p className="text-gray-300">
            Die Europaeische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
          </p>
          <p className="text-gray-300">
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noreferrer"
              className="text-blue-300 hover:text-blue-200"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
          </p>
          <p className="mt-2 text-gray-300">Unsere E-Mail-Adresse finden Sie oben im Impressum.</p>
        </section>
      </section>
    </main>
  );
}

