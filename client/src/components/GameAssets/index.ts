/**
 * Game Assets - Visual components for KRITIS Admin Simulator
 *
 * This module provides reusable visual components that gracefully
 * degrade to ASCII/emoji fallbacks when images aren't available.
 */

// Components
export { Portrait } from './Portrait';
export { CategoryIcon } from './CategoryIcon';
export { UrgencyBadge, UrgencyText } from './UrgencyBadge';
export { OutcomeBadge, OutcomeText } from './OutcomeBadge';
export { SceneBackground, LocationIndicator } from './SceneBackground';

// Types
export type {
  NpcId,
  NpcEmotion,
  SceneId,
  CategoryIconId,
  UrgencyLevel,
  OutcomeType,
} from './types';

// Constants
export { NPC_DISPLAY_NAMES, CATEGORY_TO_ICON } from './types';
