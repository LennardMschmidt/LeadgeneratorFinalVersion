import { LEGAL_CONTACT } from "../legal/legalConfig";

export function DatenschutzPage() {
  return (
    <main className="relative mx-auto w-full max-w-4xl px-6 pb-20 pt-14">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="mb-4 text-3xl font-semibold text-white">Datenschutzverordnung</h1>
        <p className="mb-6 text-sm text-gray-300">
          Diese Datenschutzhinweise informieren Sie ueber Art, Umfang und Zweck der Verarbeitung
          personenbezogener Daten auf dieser Website.
        </p>

        <div className="mb-8 rounded-xl border border-white/10 bg-black/20 p-5 text-sm text-amber-200">
          Wichtig: Bitte diese Vorlage rechtlich pruefen lassen und mit Ihren echten Daten finalisieren.
        </div>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">1. Verantwortlicher</h2>
          <p className="text-gray-300">{LEGAL_CONTACT.companyName}</p>
          <p className="text-gray-300">{LEGAL_CONTACT.street}</p>
          <p className="text-gray-300">
            {LEGAL_CONTACT.postalCode} {LEGAL_CONTACT.city}, {LEGAL_CONTACT.country}
          </p>
          <p className="text-gray-300">E-Mail: {LEGAL_CONTACT.email}</p>
          <p className="text-gray-300">Telefon: {LEGAL_CONTACT.phone}</p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">
            2. Datenschutzkontakt / Datenschutzbeauftragte Stelle
          </h2>
          <p className="text-gray-300">{LEGAL_CONTACT.dataProtectionContactName}</p>
          <p className="text-gray-300">{LEGAL_CONTACT.dataProtectionContactAddress}</p>
          <p className="text-gray-300">
            E-Mail:{" "}
            <a
              href={`mailto:${LEGAL_CONTACT.dataProtectionContactEmail}`}
              className="text-blue-300 hover:text-blue-200"
            >
              {LEGAL_CONTACT.dataProtectionContactEmail}
            </a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">3. Hosting und Server-Logfiles</h2>
          <p className="text-gray-300">
            Beim Besuch unserer Website werden durch den Hosting-Anbieter technische Zugriffsdaten
            (z. B. IP-Adresse, Datum/Uhrzeit, aufgerufene URL, Browser-Informationen) verarbeitet,
            um den sicheren Betrieb der Website zu gewaehrleisten.
          </p>
          <p className="mt-2 text-gray-300">
            Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am sicheren und
            stabilen Betrieb).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">4. Authentifizierung und Konto</h2>
          <p className="text-gray-300">
            Fuer Registrierung, Login und Passwort-Reset verarbeiten wir die von Ihnen eingegebenen
            Kontodaten (z. B. E-Mail-Adresse, verschluesseltes Passwort, technische Session-Daten).
          </p>
          <p className="mt-2 text-gray-300">
            Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfuellung) sowie Art. 6 Abs. 1
            lit. f DSGVO (Sicherheit).
          </p>
        </section>

        <section className="mb-8" id="cookies">
          <h2 className="mb-3 text-xl font-semibold text-white">5. Cookies und Local Storage</h2>
          <p className="text-gray-300">
            Diese Website verwendet notwendige Speichertechnologien (Cookies/Local Storage), um
            sicherheitsrelevante und funktionale Einstellungen zu speichern, z. B. Session-Status,
            Sprachwahl und Einwilligungsstatus.
          </p>
          <p className="mt-2 text-gray-300">
            Optional einsetzbare Dienste (z. B. Analyse/Marketing) werden nur nach entsprechender
            Einwilligung aktiviert.
          </p>
          <p className="mt-2 text-gray-300">
            Rechtsgrundlage: Art. 6 Abs. 1 lit. c DSGVO i. V. m. nationalen Vorgaben fuer
            notwendige Cookies und Art. 6 Abs. 1 lit. a DSGVO fuer einwilligungsbeduerftige
            Cookies.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">6. Kontaktanfragen</h2>
          <p className="text-gray-300">
            Wenn Sie uns per E-Mail kontaktieren, verarbeiten wir Ihre Angaben zur Bearbeitung der
            Anfrage und fuer moegliche Anschlussfragen.
          </p>
          <p className="mt-2 text-gray-300">
            Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Massnahmen) oder Art. 6
            Abs. 1 lit. f DSGVO.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">7. Speicherdauer</h2>
          <p className="text-gray-300">
            Wir speichern personenbezogene Daten nur so lange, wie dies fuer die jeweiligen Zwecke
            erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">8. Ihre Rechte</h2>
          <p className="text-gray-300">
            Sie haben das Recht auf Auskunft, Berichtigung, Loeschung, Einschraenkung der
            Verarbeitung, Datenuertragbarkeit sowie Widerspruch (Art. 15-21 DSGVO). Erteilte
            Einwilligungen koennen Sie jederzeit mit Wirkung fuer die Zukunft widerrufen.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-white">9. Beschwerderecht</h2>
          <p className="text-gray-300">
            Sie haben das Recht, sich bei einer Datenschutzaufsichtsbehoerde zu beschweren, wenn
            Sie der Ansicht sind, dass die Verarbeitung Ihrer personenbezogenen Daten gegen die
            DSGVO verstoesst.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-white">10. Stand und Aenderungen</h2>
          <p className="text-gray-300">
            Stand: {new Date().toLocaleDateString("de-DE")}. Wir passen diese Datenschutzhinweise
            an, sobald sich rechtliche oder technische Anforderungen aendern.
          </p>
        </section>
      </section>
    </main>
  );
}

