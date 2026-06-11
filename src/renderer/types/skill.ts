// Skill type definition
export interface Skill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;       // Whether visible in popover
  isOfficial: boolean;    // "官方" badge
  isBuiltIn: boolean;     // Bundled with app, cannot be deleted
  updatedAt: number;      // Timestamp
  prompt: string;         // SKILL.md body for management; do not inline into Cowork prompts
  skillPath: string;      // Absolute path to SKILL.md
  version?: string;       // Skill version from SKILL.md frontmatter
}

export type LocalizedText = { en: string; zh: string };

export interface MarketTag {
  id: string;
  en: string;
  zh: string;
}

export interface LocalSkillInfo {
  id: string;
  name: string;
  description: string | LocalizedText;
  version: string;
}

export interface MarketplaceSkill {
  id: string;
  name: string;
  description: string | LocalizedText;
  tags?: string[];
  url: string;              // Download URL (.zip)
  version: string;
  source: {
    from: string;           // e.g. "Github"
    url: string;            // Source repo URL
    author?: string;        // Author name
  };
}

export interface HiMarketCategory {
  categoryId: string;
  name: string;
  description: string;
}

export interface HiMarketSkill {
  productId: string;
  name: string;
  description: string;
  skillName: string;
  skillConfig: {
    skillTags: string[] | null;
    downloadCount: number;
    skillName: string;
  };
}

export interface HiMarketSkillDetail {
  productId: string;
  name: string;
  description: string;
  status: string;
  type: string;
  categories: HiMarketCategory[];
  createAt: string;
  updatedAt: string;
  skillName: string;
  skillConfig: {
    skillTags: string[] | null;
    downloadCount: number;
    skillName: string;
  };
}
