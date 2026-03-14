export type CharacterRole =
  | 'chef'
  | 'gf'
  | 'kaemmerer'
  | 'athos'
  | 'kollege'
  | 'azubi'
  | 'extern';

export interface CharacterTrait {
  id: string;
  name: string;
  probability: number;
  modifiers: {
    eventVariations?: Record<string, string>;
    relationshipDecay?: number;
    skillCheckBonus?: Partial<Record<string, number>>;
  };
}

export interface Character {
  id: string;
  role: CharacterRole;
  namePool: string[];
  traits: CharacterTrait[];
  dialogue: {
    hostile: string[];
    cold: string[];
    neutral: string[];
    friendly: string[];
    trusting: string[];
  };
  asciiAvatar?: string;
  color: string;
}

export interface ActiveCharacter {
  id: string;
  role: CharacterRole;
  name: string;
  activeTraits: string[];
  color: string;
}
