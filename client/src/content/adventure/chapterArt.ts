/**
 * Artwork für Kapitel-Titelkarten und Kino-Events (Vollbild-Beat).
 * Bilder liegen in client/public/images/events/.
 */

export const CHAPTER_ART: Record<string, string> = {
  ch01_first_day: '/images/events/evt_erster_arbeitstag.webp',
  ch02_settling_in: '/images/events/19_it-buero-drei-arbeitsplaetze.webp',
  ch03_first_crisis: '/images/events/28_stau-am-drucker.webp',
  ch04_the_file: '/images/events/20_serverraum-kritis-warnschild.webp',
  ch05_coincidence: '/images/events/01_wasserwerk-luftaufnahme-nacht.webp',
  ch06_trust_no_one: '/images/events/11_usb-uebergabe-treppenhaus.webp',
  ch07_escalation: '/images/events/05_verdaechtige-email-am-monitor.webp',
  ch08_calm_before: '/images/events/07_verlassenes-buero-server-led.webp',
  ch09_attack: '/images/events/06_leitwarte-monitore-ausfall.webp',
  ch10_72_hours: '/images/events/02_it-admin-leitwarte-nacht.webp',
  ch11_truth: '/images/events/25_vermisster-mitarbeiter-pinnwand.webp',
  ch12_finale: '/images/events/16_rechenzentrum-gang.webp',
};

/** Schlüssel-Events mit Vollbild-Beat vor der Event-Card. */
export const CINEMATIC_EVENTS: Record<string, string> = {
  adv_ransomware_strike: '/images/events/06_leitwarte-monitore-ausfall.webp',
  adv_attacker_identity: '/images/events/13_handschriftliche-notiz-am-monitor.webp',
  adv_climax: '/images/events/02_it-admin-leitwarte-nacht.webp',
};
