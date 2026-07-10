// client/src/components/LegalPages/index.tsx
import { useState } from 'react';
import { LEGAL_OWNER, LEGAL_DATA_IS_PLACEHOLDER } from '../../config/legal';

interface LegalPagesProps {
  initialPage?: 'impressum' | 'datenschutz';
  onClose: () => void;
}

export function LegalPages({ initialPage = 'impressum', onClose }: LegalPagesProps) {
  const [activePage, setActivePage] = useState<'impressum' | 'datenschutz'>(initialPage);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-terminal-bg border border-terminal-border max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-terminal-border">
          <div className="flex gap-4">
            <button
              onClick={() => setActivePage('impressum')}
              className={`px-3 py-1 border ${
                activePage === 'impressum'
                  ? 'border-terminal-green text-terminal-green'
                  : 'border-terminal-border text-terminal-green-dim hover:border-terminal-green'
              }`}
            >
              Impressum
            </button>
            <button
              onClick={() => setActivePage('datenschutz')}
              className={`px-3 py-1 border ${
                activePage === 'datenschutz'
                  ? 'border-terminal-green text-terminal-green'
                  : 'border-terminal-border text-terminal-green-dim hover:border-terminal-green'
              }`}
            >
              Datenschutz
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-terminal-danger hover:underline"
          >
            [X] Schliessen
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 text-sm leading-relaxed">
          {activePage === 'impressum' ? <Impressum /> : <Datenschutz />}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-terminal-border text-center text-terminal-green-dim text-xs">
          [ESC] Schliessen
        </div>
      </div>
    </div>
  );
}

function Impressum() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl text-terminal-green border-b border-terminal-border pb-2">
        Impressum
      </h2>

      <section>
        <h3 className="text-terminal-info mb-2">Angaben gemäß § 5 TMG</h3>
        <div className="text-terminal-green-dim">
          {LEGAL_DATA_IS_PLACEHOLDER && (
            <p className="text-terminal-warning mb-2">
              [BITTE AUSFÜLLEN - Pflichtangaben nach § 5 TMG]
            </p>
          )}
          <p>{LEGAL_OWNER.name}</p>
          <p>{LEGAL_OWNER.street}</p>
          <p>{LEGAL_OWNER.city}</p>
          <p>{LEGAL_OWNER.country}</p>
        </div>
      </section>

      <section>
        <h3 className="text-terminal-info mb-2">Kontakt</h3>
        <div className="text-terminal-green-dim">
          <p>E-Mail: {LEGAL_OWNER.email}</p>
          {LEGAL_OWNER.phone && <p>Telefon: {LEGAL_OWNER.phone} (optional)</p>}
        </div>
      </section>

      <section>
        <h3 className="text-terminal-info mb-2">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h3>
        <div className="text-terminal-green-dim">
          <p>{LEGAL_OWNER.name}</p>
          <p>Adresse wie oben</p>
        </div>
      </section>

      <section>
        <h3 className="text-terminal-info mb-2">EU-Streitschlichtung</h3>
        <p className="text-terminal-green-dim">
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-terminal-info underline"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
        </p>
        <p className="text-terminal-green-dim mt-2">
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>

      <section>
        <h3 className="text-terminal-info mb-2">Haftung für Inhalte</h3>
        <p className="text-terminal-green-dim">
          Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten
          nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als
          Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
          Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
          Tätigkeit hinweisen.
        </p>
      </section>

      <section>
        <h3 className="text-terminal-info mb-2">Haftung für Links</h3>
        <p className="text-terminal-green-dim">
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
          Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
          Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
          Seiten verantwortlich.
        </p>
      </section>

      <section>
        <h3 className="text-terminal-info mb-2">Urheberrecht</h3>
        <p className="text-terminal-green-dim">
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
          dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art
          der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen
          Zustimmung des jeweiligen Autors bzw. Erstellers.
        </p>
      </section>
    </div>
  );
}

function Datenschutz() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl text-terminal-green border-b border-terminal-border pb-2">
        Datenschutzerklärung
      </h2>

      <section>
        <h3 className="text-terminal-info mb-2">1. Datenschutz auf einen Blick</h3>
        <h4 className="text-terminal-green mb-1">Allgemeine Hinweise</h4>
        <p className="text-terminal-green-dim">
          Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren
          personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene
          Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
        </p>
      </section>

      <section>
        <h3 className="text-terminal-info mb-2">2. Verantwortliche Stelle</h3>
        <div className="text-terminal-green-dim">
          {LEGAL_DATA_IS_PLACEHOLDER && (
            <p className="text-terminal-warning mb-2">
              [BITTE AUSFÜLLEN - Gleiche Daten wie Impressum]
            </p>
          )}
          <p>{LEGAL_OWNER.name}</p>
          <p>{LEGAL_OWNER.street}</p>
          <p>{LEGAL_OWNER.city}</p>
          <p>E-Mail: {LEGAL_OWNER.email}</p>
        </div>
      </section>

      <section>
        <h3 className="text-terminal-info mb-2">3. Datenerfassung auf dieser Website</h3>

        <h4 className="text-terminal-green mb-1 mt-4">Spieler-ID und Spielstände (nur im Browser)</h4>
        <ul className="text-terminal-green-dim list-disc list-inside space-y-1">
          <li>
            <strong>Spieler-ID:</strong> Eine zufällig generierte, pseudonyme ID wird in Ihrem
            Browser (localStorage) gespeichert. Sie enthält keine persönlichen Informationen.
          </li>
          <li>
            <strong>Spielstände:</strong> Ihr Spielfortschritt (Speicherstände, Fortschritt)
            wird ausschließlich lokal in Ihrem Browser gespeichert und <strong>nicht</strong> an
            den Server übermittelt.
          </li>
        </ul>
        <p className="text-terminal-green-dim mt-2">
          Der localStorage-Einsatz ist technisch notwendig und erfordert keine Einwilligung nach
          § 25 TTDSG.
        </p>

        <h4 className="text-terminal-green mb-1 mt-4">Team-Statistik (Übermittlung an den Server)</h4>
        <p className="text-terminal-green-dim mb-2">
          Zur internen Auswertung, wer das Spiel wie gespielt hat, übermittelt die Anwendung
          folgende Daten an unseren Server, verknüpft mit Ihrer pseudonymen Spieler-ID:
        </p>
        <ul className="text-terminal-green-dim list-disc list-inside space-y-1">
          <li>
            <strong>Optionaler Name:</strong> Wenn Sie im Menü freiwillig einen Namen angeben,
            wird dieser gespeichert und in der Statistik angezeigt. Die Angabe ist optional; ohne
            sie bleiben Sie unter „Spieler-…“ pseudonym.
          </li>
          <li>
            <strong>Spielverläufe:</strong> Beginn und Abschluss von Durchläufen samt Modus,
            Ergebnis (bestanden/Burnout/…), erreichter Woche, Punktzahl/Ende sowie den in diesem
            Durchlauf getroffenen Entscheidungen.
          </li>
          <li>
            <strong>Lernfortschritt:</strong> Welche Lernlektionen abgeschlossen wurden.
          </li>
        </ul>
        <p className="text-terminal-green-dim mt-2">
          <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
          an interner Auswertung und Sicherheitsschulung des Teams). Es findet kein
          Profiling und keine automatisierte Entscheidungsfindung statt.
        </p>
        <p className="text-terminal-green-dim mt-2">
          <strong>Speicherdauer / Löschung:</strong> Die Daten werden gespeichert, solange die
          interne Auswertung erforderlich ist. Sie können jederzeit die Löschung aller mit Ihrer
          Spieler-ID verknüpften Daten verlangen – per E-Mail an die im Impressum genannte
          Adresse.
        </p>

        <h4 className="text-terminal-green mb-1 mt-4">Server-Log-Dateien</h4>
        <p className="text-terminal-green-dim">
          Der Provider der Seiten erhebt und speichert automatisch Informationen in
          Server-Log-Dateien, die Ihr Browser automatisch übermittelt (IP-Adresse, Browsertyp,
          Betriebssystem, Referrer URL, Uhrzeit der Anfrage). Diese Daten werden nicht mit
          anderen Datenquellen zusammengeführt.
        </p>
      </section>

      <section>
        <h3 className="text-terminal-info mb-2">4. Externe Dienste</h3>

        <h4 className="text-terminal-green mb-1 mt-4">Google Fonts</h4>
        <p className="text-terminal-green-dim">
          Diese Seite nutzt zur Darstellung von Schriftarten Google Fonts. Beim Aufruf einer
          Seite lädt Ihr Browser die benötigten Fonts direkt von Google. Dabei wird Ihre
          IP-Adresse an Google übermittelt.
        </p>
        <p className="text-terminal-green-dim mt-2">
          Anbieter: Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland.
        </p>
        <p className="text-terminal-green-dim mt-2">
          Mehr Informationen:{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-terminal-info underline"
          >
            Google Datenschutzerklärung
          </a>
        </p>
        <p className="text-terminal-green-dim mt-2">
          <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
          an einer ansprechenden Darstellung).
        </p>
      </section>

      <section>
        <h3 className="text-terminal-info mb-2">5. Ihre Rechte</h3>
        <p className="text-terminal-green-dim mb-2">Sie haben jederzeit das Recht:</p>
        <ul className="text-terminal-green-dim list-disc list-inside space-y-1">
          <li>Auskunft über Ihre gespeicherten Daten zu erhalten (Art. 15 DSGVO)</li>
          <li>Berichtigung unrichtiger Daten zu verlangen (Art. 16 DSGVO)</li>
          <li>Löschung Ihrer Daten zu verlangen (Art. 17 DSGVO)</li>
          <li>Einschränkung der Verarbeitung zu verlangen (Art. 18 DSGVO)</li>
          <li>Datenübertragbarkeit zu verlangen (Art. 20 DSGVO)</li>
          <li>Widerspruch gegen die Verarbeitung einzulegen (Art. 21 DSGVO)</li>
          <li>
            Sich bei einer Aufsichtsbehörde zu beschweren (Art. 77 DSGVO) – z.B. beim
            Landesbeauftragten für Datenschutz Ihres Bundeslandes
          </li>
        </ul>
      </section>

      <section>
        <h3 className="text-terminal-info mb-2">6. Datenlöschung</h3>
        <p className="text-terminal-green-dim">
          Spielstände werden gespeichert, bis Sie diese manuell löschen oder eine Löschung
          beantragen. Um Ihre Daten vollständig zu löschen:
        </p>
        <ul className="text-terminal-green-dim list-disc list-inside space-y-1 mt-2">
          <li>Löschen Sie die Spieler-ID aus Ihrem Browser (localStorage leeren)</li>
          <li>
            Kontaktieren Sie uns per E-Mail zur Löschung serverseitiger Spielstände
          </li>
        </ul>
      </section>

      <section>
        <h3 className="text-terminal-info mb-2">7. Aktualität dieser Datenschutzerklärung</h3>
        <p className="text-terminal-green-dim">
          Stand: März 2026
        </p>
        <p className="text-terminal-green-dim mt-2">
          Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den
          aktuellen rechtlichen Anforderungen entspricht.
        </p>
      </section>
    </div>
  );
}
