// Deutsche Telekom Business - Content Pack Manifest
import { ContentPackManifest } from '@kritis/shared';

export const telekomManifest: ContentPackManifest = {
  id: 'telekom-business',
  name: 'Deutsche Telekom Business',
  version: '1.0.0',
  description: 'WAN-Provider Szenarien: Leitungsstörungen, SLA-Verhandlungen, Backbone-Wartungen, Redundanzplanung. Die Realität der deutschen Telekommunikation.',
  author: 'KRITIS Game',
  tags: ['provider', 'wan', 'telekom', 'connectivity', 'sla'],
  contentTypes: ['npc_vendor', 'scenario_pack'],
  difficulty: {
    min: 2,
    max: 4,
    average: 3,
  },
  categories: ['troubleshooting', 'vendor_management', 'crisis_management'],
  requirements: {
    minWeek: 2,
    suggestedSkills: {
      netzwerk: 30,
    },
  },
  educationalFocus: [
    'Provider-SLA verstehen und einfordern',
    'Eigenes Netzwerk-Monitoring aufbauen',
    'Redundanz und Ausfallsicherheit planen',
    'Entstörungs-Kommunikation optimieren',
    'Business-Continuity bei WAN-Ausfällen',
  ],
};
