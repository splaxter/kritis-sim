import { LearningTrack } from '@kritis/shared';

export const LEARNING_TRACKS: LearningTrack[] = [
  {
    id: 'foundations',
    title: 'Grundlagen',
    description: 'Terminal, Navigation, Dateien, einfache Suche. Der Pflicht-Einstieg.',
    icon: '🌱',
    order: 0,
    isFoundations: true,
    levels: [
      { eventId: 'learn_01_awakening' },
      { eventId: 'learn_02_hidden_notes' },
      { eventId: 'learn_03_forensics' },
      { eventId: 'learn_04_grep_hunter' },
    ],
  },
  {
    id: 'linux_services',
    title: 'Linux & Services',
    description: 'Pipes, Prozesse, Dienste — den Server im Griff.',
    icon: '🐧',
    order: 1,
    levels: [
      { eventId: 'learn_05_pipe_filter' },
      { eventId: 'learn_06_zombie_hunt' },
      { eventId: 'learn_07_necromancer' },
      { eventId: 'learn_adv_phantom_storage', optional: true },
    ],
  },
  {
    id: 'network_dns',
    title: 'Netzwerk & DNS',
    description: 'Verbindungen, Namensauflösung und Vertrauen (TLS).',
    icon: '🌐',
    order: 2,
    levels: [
      { eventId: 'learn_08_network_recon' },
      { eventId: 'learn_adv_dns_splitbrain', optional: true },
      { eventId: 'gui_eventviewer_cert_expiry', optional: true },
    ],
  },
  {
    id: 'windows_security',
    title: 'Windows-Sicherheit',
    description: 'Prozesse, Protokolle, UAC und Härtung in der Windows-GUI.',
    icon: '🪟',
    order: 3,
    levels: [
      { eventId: 'learn_09_windows_realm', optional: true },
      { eventId: 'gui_taskmanager_rogue' },
      { eventId: 'gui_taskmanager_doppelganger' },
      { eventId: 'gui_eventviewer_bruteforce' },
      { eventId: 'gui_eventviewer_persistence' },
      { eventId: 'gui_uac_unsigned_exe' },
      { eventId: 'gui_uac_legit_install' },
      { eventId: 'gui_settings_reharden' },
    ],
  },
  {
    id: 'access_hardening',
    title: 'Access & Hardening',
    description: 'Wer darf was? Berechtigungen, Least Privilege, Access-Lifecycle.',
    icon: '🔑',
    order: 4,
    levels: [
      { eventId: 'gui_explorer_open_share' },
      { eventId: 'gui_explorer_auth_users' },
      { eventId: 'learn_adv_ssh_orphan' },
      { eventId: 'learn_adv_cron_privesc' },
    ],
  },
  {
    id: 'incident_response',
    title: 'Incident Response',
    description: 'Wenn es brennt: Triage, Beweissicherung, Eindämmung.',
    icon: '🚨',
    order: 5,
    levels: [
      { eventId: 'learn_10_incident_boss' },
      { eventId: 'learn_adv_evidence_first', optional: true },
    ],
  },
  {
    id: 'blackout',
    title: 'Blackout: Operation Dunkelkammer',
    description: 'Ein Incident am Leitstand — vom EDR-Alert bis zur Firewall-Panik. Linearer Slice.',
    icon: '🌑',
    order: 6,
    levels: [
      { eventId: 'blk_c1_logread' },
      { eventId: 'blk_c1_hunt_gui' },
      { eventId: 'blk_c1_hunt_cli' },
      { eventId: 'blk_c2_jumpserver' },
      { eventId: 'blk_c3_firewall' },
    ],
  },
  {
    id: 'ssh_remote',
    title: 'SSH & Remote-Zugriff',
    description: 'Schlüssel statt Passwörter: sichere Fernzugriffe über Zonen hinweg.',
    icon: '🗝️',
    order: 7,
    levels: [
      { eventId: 'learn_ssh_01_first_key' },
      { eventId: 'learn_ssh_02_open_door' },
      { eventId: 'learn_ssh_03_jumphost' },
      { eventId: 'learn_ssh_04_key_graveyard', optional: true },
    ],
  },
  {
    id: 'systemd_journal',
    title: 'systemd & Journal',
    description: 'Dienste verstehen, Logs lesen, Ursachen statt Symptome.',
    icon: '⚙️',
    order: 8,
    levels: [
      { eventId: 'learn_sysd_01_silent_service' },
      { eventId: 'learn_sysd_02_time_travel' },
      { eventId: 'learn_sysd_03_revenant' },
      { eventId: 'learn_sysd_04_chain_reaction' },
    ],
  },
  // B4/B5 will register the remaining tracks once their levels are authored.
  // Registering them now would list eventIds the LearningHub cannot resolve.
  {
    id: 'finale',
    title: 'Finale: Root Awakening',
    description: 'Die Abschlussprüfung. Schalte 3 Tracks frei.',
    icon: '🎓',
    order: 11,
    isFinale: true,
    unlockAfterTracksCompleted: 3,
    levels: [{ eventId: 'learn_11_final_boss' }],
  },
];

/** Last level id of the Foundations track — the gate all other tracks open after. */
export function getFoundationsExitLevelId(tracks: LearningTrack[]): string {
  const f = tracks.find((t) => t.isFoundations);
  if (!f || f.levels.length === 0) throw new Error('No foundations track defined');
  return f.levels[f.levels.length - 1].eventId;
}
