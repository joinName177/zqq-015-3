export interface OracleChar {
  char: string;
  pinyin: string;
  radical: string;
  scriptType: '甲骨文' | '金文' | '小篆';
  glyphSvg: string; // SVG path or stroke representation
  originalMeaning: string;
  pictographicExplanation: string;
}

export interface AllusionSource {
  dynasty: string;
  classicBook: string;
  author: string;
  yearApprox: string;
  historicalEvent: string;
  originalAncientQuote: string;
}

export interface SemanticEvolutionStep {
  era: string;
  meaning: string;
  semanticCategory: '本义' | '引申义' | '比喻义';
  contextSample: string;
}

export interface SemanticDNA {
  originalPercent: number;     // 本义占比
  extendedPercent: number;     // 引申义占比
  metaphoricalPercent: number; // 比喻义占比
  polarity: '褒义' | '中性' | '贬义';
  coreSememes: string[];
}

export interface IdiomProfile {
  id: string;
  idiom: string;
  pinyin: string;
  characters: OracleChar[];
  allusion: AllusionSource;
  evolutionPath: SemanticEvolutionStep[];
  dna: SemanticDNA;
  modernDefinition: string;
  syntacticRole: string;
  /** 是否经过典籍考据验证。true=内置富条目（有真实出处/释义）；false=生成条目（字段为占位推演，报告中须标注缺失）。 */
  dataVerified: boolean;
}

/** 报告字段的可信状态：verified=直接出自考据；derived=由多个字段推演；missing=数据缺失，已明确标注。 */
export type ReportFieldStatus = 'verified' | 'derived' | 'missing';

export interface ReportSection {
  key: 'ancestral' | 'divergence' | 'modern';
  title: string;
  status: ReportFieldStatus;
  /** 正文内容；status 为 missing 时为空字符串。 */
  content: string;
  /** 缺失原因（仅 status=missing 时存在）。 */
  missingReason?: string;
  /** 支撑证据（如共现义原、分叉 era、现代释义原文等）。 */
  evidence: string[];
}

export interface SemanticEvolutionReport {
  id: string;
  idiomA: IdiomProfile;
  idiomB: IdiomProfile;
  generatedAt: string; // ISO 时间戳
  sections: {
    ancestral: ReportSection;
    divergence: ReportSection;
    modern: ReportSection;
  };
  /** 缺失字段的人类可读标签集合，用于报告顶部提示与导出。 */
  missingFields: string[];
  /** 整体可信度：缺失 0 项=高，1 项=中，≥2 项=低。 */
  overallConfidence: '高' | '中' | '低';
  // —— 以下为导出用的结构化扁平字段 ——
  commonAncestralMeaning: string;
  divergencePeriod: string;
  modernDifferences: string[];
}

export interface KinshipResult {
  idiomA: IdiomProfile;
  idiomB: IdiomProfile;
  kinshipScore: number; // 0 - 100
  dnaVectorSimilarity: number;
  sharedSememes: string[];
  polarityCompatibility: boolean;
  relationshipLabel: '同源近亲' | '异曲同工' | '形似神离' | '截然对立' | '远房微亲';
  comparativeAnalysis: string;
}
