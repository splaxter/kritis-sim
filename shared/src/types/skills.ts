export interface Skills {
  netzwerk: number;
  linux: number;
  windows: number;
  security: number;
  troubleshooting: number;
  softSkills: number;
}

export interface SkillCheck {
  skill: keyof Skills;
  threshold: number;
  bonus?: number;
}

export const DEFAULT_SKILLS: Skills = {
  netzwerk: 20,
  linux: 20,
  windows: 20,
  security: 20,
  troubleshooting: 20,
  softSkills: 20,
};
