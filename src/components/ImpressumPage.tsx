export function ImpressumPage() {
  return (
    <main className="relative mx-auto w-full max-w-4xl px-6 pb-20 pt-14">
      <section
        className="rounded-2xl border border-white/10 bg-white/5 p-8"
        style={{ marginTop: '20px', marginBottom: '20px' }}
      >
        <h1 className="mb-4 text-3xl font-semibold text-white">Impressum</h1>
        <p className="mb-6 text-sm text-gray-300">Angaben gemaess § 5 DDG</p>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">Website</h2>
          <p className="text-gray-300">
            Dieses Impressum gilt fuer alle Angebote unter der Domain
            <span className="text-gray-100"> leadgenerator.agency</span> inklusive aller
            Subdomains (Unterseiten).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">Angaben gemaess § 5 DDG</h2>
          <p className="text-gray-300">Kelsey Schmidt</p>
          <p className="text-gray-300">Hauptstrasse 25a</p>
          <p className="text-gray-300">88696 Owingen</p>
          <p className="text-gray-300">Telefon: +491772340195</p>
          <p className="text-gray-300">
            E-Mail:{' '}
            <a
              href="mailto:leadgeneratorlab@gmail.com"
              className="text-blue-300 hover:text-blue-200"
            >
              leadgeneratorlab@gmail.com
            </a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">Vertretungsberechtigte Personen</h2>
          <p className="text-gray-300">Kelsey Schmidt, Inhaberin</p>
        </section>
      </section>
    </main>
  );
}
