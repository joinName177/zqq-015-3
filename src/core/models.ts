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

/** 字段考据完备性标注（缺失 / 存疑 / 无考） */
export type DataGapKind = '缺失' | '存疑' | '无考';

export interface DataGap {
  /** 归属词条；'shared' 表示两词共同相关的缺项（如分叉确年无考） */
  owner: string | 'shared';
  /** 缺项所在栏目 */
  section: '共同祖义' | '分叉时期' | '现代差异' | '词条档案';
  /** 缺项字段名称 */
  field: string;
  kind: DataGapKind;
  reason: string;
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
  /** 档案级缺项标注（由适配器负责标注，核心报告引擎予以汇总） */
  dataGaps?: DataGap[];
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

/* ===================== 语义演化对比报告 ===================== */

export type ConfidenceLevel = '高' | '中' | '低' | '不可考';

/** 演化路径上一个阶段的对齐情况 */
export interface StageAlignment {
  category: '本义' | '引申义' | '比喻义';
  eraA: string;
  eraB: string;
  meaningA: string;
  meaningB: string;
  similarity: number | null; // 0-100；字段缺失时为 null
  aligned: boolean;
  note: string;
}

export interface CommonRootSection {
  summary: string;
  sharedSememes: string[];
  sharedPolarity: boolean;
  rootA: string;
  rootB: string;
  confidence: ConfidenceLevel;
  /** 该栏目涉及的缺项（owner 级标注） */
  gaps: DataGap[];
}

export interface DivergenceSection {
  stageAlignments: StageAlignment[];
  diverged: boolean;
  divergenceEra: string | null;
  divergenceLabel: string;
  divergenceCategory: '本义' | '引申义' | '比喻义' | null;
  exactYearKnown: boolean;
  summary: string;
  gaps: DataGap[];
}

export interface ModernDifferenceSection {
  definitionA: string;
  definitionB: string;
  polarityA: '褒义' | '中性' | '贬义';
  polarityB: '褒义' | '中性' | '贬义';
  polarityCompatible: boolean;
  syntacticRoleA: string;
  syntacticRoleB: string;
  sememesOnlyA: string[];
  sememesOnlyB: string[];
  summary: string;
  gaps: DataGap[];
}

export interface EvolutionComparisonReport {
  id: string;
  generatedAt: string; // ISO 时间戳
  idiomA: IdiomProfile;
  idiomB: IdiomProfile;
  commonRoot: CommonRootSection;
  divergence: DivergenceSection;
  modernDifference: ModernDifferenceSection;
  /** 全报告缺项汇总（含档案级缺项） */
  allGaps: DataGap[];
  overallConfidence: ConfidenceLevel;
}
