// Cloud365 GmbH - Microsoft Partner - Content Pack Manifest
import { ContentPackManifest } from '@kritis/shared';

export const cloud365Manifest: ContentPackManifest = {
  id: 'cloud365-microsoft',
  name: 'Cloud365 GmbH - Microsoft Partner',
  version: '1.0.0',
  description: 'Microsoft 365 & Azure Szenarien: Cloud-Migrationen, Lizenzmanagement, Teams-Telefonie, KI-Rollout. Die Realität der Cloud-Transformation.',
  author: 'KRITIS Game',
  tags: ['microsoft', 'azure', 'm365', 'cloud', 'teams'],
  contentTypes: ['npc_vendor', 'scenario_pack'],
  difficulty: {
    min: 2,
    max: 4,
    average: 3,
  },
  categories: ['vendor_management', 'troubleshooting', 'compliance', 'security_incident'],
  requirements: {
    minWeek: 3,
    suggestedSkills: {
      windows: 25,
      security: 20,
    },
  },
  educationalFocus: [
    'Cloud-Kosten verstehen und optimieren',
    'Microsoft 365 Administration selbst können',
    'Migrations-Risiken minimieren',
    'Shared Responsibility Model verstehen',
    'KI-Rollout mit Datenschutz vereinen',
  ],
};
