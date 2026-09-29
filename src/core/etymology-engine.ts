import {
  IdiomProfile,
  KinshipResult,
  OracleChar,
  SemanticDNA,
  AllusionSource,
  SemanticEvolutionStep,
  SemanticEvolutionReport,
  ReportSection
} from './models';

export function calculateKinship(a: IdiomProfile, b: IdiomProfile): KinshipResult {
  // 1. DNA Vector distance
  const dOrig = a.dna.originalPercent - b.dna.originalPercent;
  const dExt = a.dna.extendedPercent - b.dna.extendedPercent;
  const dMeta = a.dna.metaphoricalPercent - b.dna.metaphoricalPercent;
  const euclideanDist = Math.sqrt(dOrig * dOrig + dExt * dExt + dMeta * dMeta);
  // Max possible dist is ~141.4
  const dnaVectorSimilarity = Math.max(0, Math.min(100, Math.round(100 - (euclideanDist / 141.4) * 100)));

  // 2. Sememe Jaccard overlap
  const setA = new Set(a.dna.coreSememes);
  const setB = new Set(b.dna.coreSememes);
  const sharedSememes: string[] = [];
  setA.forEach(s => {
    if (setB.has(s)) sharedSememes.push(s);
  });
  const unionCount = a.dna.coreSememes.length + b.dna.coreSememes.length || 1;
  const sememeScore = (sharedSememes.length / unionCount) * 100;

  // 3. Polarity match
  const polarityCompatibility = a.dna.polarity === b.dna.polarity;
  const polarityBonus = polarityCompatibility ? 15 : -10;

  // Composite Kinship Score (0 - 100)
  const rawScore = dnaVectorSimilarity * 0.45 + sememeScore * 0.45 + polarityBonus;
  const kinshipScore = Math.max(5, Math.min(99, Math.round(rawScore)));

  // Label & Verdict
  let relationshipLabel: KinshipResult['relationshipLabel'] = '远房微亲';
  let comparativeAnalysis = '';

  if (kinshipScore >= 80) {
    relationshipLabel = '同源近亲';
    comparativeAnalysis = `《${a.idiom}》与《${b.idiom}》在语义DNA结构和义原图谱上呈现极高度同构性。二者均以【${a.dna.polarity}】为感情基调，核心均指向【${sharedSememes.join('、') || '相近哲理'}】，可在修辞与论述场景中互为镜像互证。`;
  } else if (kinshipScore >= 60) {
    relationshipLabel = '异曲同工';
    comparativeAnalysis = `《${a.idiom}》与《${b.idiom}》在典故外壳上虽朝代与物象迥异，但底层比喻义与引申逻辑存在深度交叠（语义DNA相似度 ${dnaVectorSimilarity}%），呈现“殊途同归”的文化心理投射。`;
  } else if (kinshipScore >= 35) {
    relationshipLabel = '形似神离';
    comparativeAnalysis = `两成语在字面物象或语用场景上可能产生模糊关联，但剖析其语义DNA发现：《${a.idiom}》侧重【${a.dna.metaphoricalPercent}% 比喻义】，而《${b.idiom}》侧重【${b.dna.metaphoricalPercent}% 比喻义】，深层道德训诫重心截然不同。`;
  } else {
    relationshipLabel = '截然对立';
    comparativeAnalysis = `两成语无论在历史出处、义原构成（几乎无交集）还是情感褒贬极性上均处于不同象限。亲缘度仅为 ${kinshipScore}%，属于相去甚远的语义群落。`;
  }

  return {
    idiomA: a,
    idiomB: b,
    kinshipScore,
    dnaVectorSimilarity,
    sharedSememes,
    polarityCompatibility,
    relationshipLabel,
    comparativeAnalysis
  };
}

export function generateGenericIdiom(text: string): IdiomProfile {
  const chars = text.slice(0, 4).split('');
  const seed = chars.reduce((sum, c) => sum + c.charCodeAt(0), 0);

  const oracleChars: OracleChar[] = chars.map((c, i) => {
    return {
      char: c,
      pinyin: `zì-${i + 1}`,
      radical: '部首',
      scriptType: i % 2 === 0 ? '甲骨文' : '金文',
      glyphSvg: `<text x="50" y="65" font-size="44" text-anchor="middle" font-family="'Ma Shan Zheng', serif" fill="#c93b2b">${c}</text>`,
      originalMeaning: `在商周金石文献中，象形表意，指代天地人神之物象。`,
      pictographicExplanation: `构形源自远古刀刻契文或青铜铸范，保留原始象形线条。`
    };
  });

  const origP = 15 + (seed % 20);
  const extP = 25 + ((seed * 7) % 30);
  const metaP = 100 - origP - extP;

  const allusion: AllusionSource = {
    dynasty: ['春秋战国', '秦汉', '两晋', '唐代', '宋代'][seed % 5],
    classicBook: `《典籍辑佚卷·第${(seed % 30) + 1}》`,
    author: '古代佚名学者',
    yearApprox: '约公元前 300 年',
    historicalEvent: `先民观察社会人事变迁与自然物象互动，凝练为四字警策。`,
    originalAncientQuote: `“古之言者曰：${text}，盖取诸此也。”`
  };

  const evolutionPath: SemanticEvolutionStep[] = [
    { era: '先秦商周', meaning: '摹拟原始器物、祭祀或行止具象动作。', semanticCategory: '本义', contextSample: '原始契刻铭文记事' },
    { era: '汉魏晋唐', meaning: '文人敷衍成篇，自具体行为引申为处世策略或心理情状。', semanticCategory: '引申义', contextSample: '魏晋笔记志怪' },
    { era: '宋明现代', meaning: '泛化为成熟定型成语，高度抽象为人生哲理与社会讽喻。', semanticCategory: '比喻义', contextSample: '白话文与现代语篇' }
  ];

  const dna: SemanticDNA = {
    originalPercent: origP,
    extendedPercent: extP,
    metaphoricalPercent: metaP,
    polarity: seed % 3 === 0 ? '褒义' : seed % 3 === 1 ? '贬义' : '中性',
    coreSememes: ['行动', '警诫', '变化', '心境', '哲思']
  };

  return {
    id: `custom-${Date.now()}`,
    idiom: text,
    pinyin: 'chéng yǔ zhòng shēng',
    characters: oracleChars,
    allusion,
    evolutionPath,
    dna,
    modernDefinition: `四字结构凝炼凝缩了东方思维智慧，蕴含深厚的文化心智密码。`,
    syntacticRole: '常作宾语、定语或分句，具较强修辞概括力',
    dataVerified: false
  };
}

/* ===================== 语义演化对比报告 ===================== */

const STATUS_LABEL: Record<ReportSection['status'], string> = {
  verified: '已考证',
  derived: '推演',
  missing: '缺失'
};

/** 返回未通过考据验证的词条名称（带书名号），用于缺失原因措辞。 */
function unverifiedNames(a: IdiomProfile, b: IdiomProfile): string {
  if (!a.dataVerified && !b.dataVerified) return `《${a.idiom}》与《${b.idiom}》`;
  if (!a.dataVerified) return `《${a.idiom}》`;
  return `《${b.idiom}》`;
}

/** 取演化路径中首个脱离「本义」的 era，作为该词条的分叉时期。 */
function findDivergenceEra(profile: IdiomProfile): string | null {
  const path = profile.evolutionPath;
  if (!path || path.length < 2) return null;
  const diverge = path.find(s => s.semanticCategory === '引申义' || s.semanticCategory === '比喻义');
  return diverge ? diverge.era : null;
}

function buildAncestralSection(a: IdiomProfile, b: IdiomProfile, missingFields: string[]): ReportSection {
  if (!a.dataVerified || !b.dataVerified) {
    return {
      key: 'ancestral',
      title: '共同祖义',
      status: 'missing',
      content: '',
      missingReason: `${unverifiedNames(a, b)}为生成条目，考据字段缺失，无法推定共同祖义。`,
      evidence: []
    };
  }
  const shared = a.dna.coreSememes.filter(s => b.dna.coreSememes.includes(s));
  if (shared.length === 0) {
    return {
      key: 'ancestral',
      title: '共同祖义',
      status: 'missing',
      content: '',
      missingReason: '两词条核心义原无交叠，语义群落相距甚远，无法推定共同祖义。',
      evidence: [
        `《${a.idiom}》义原：${a.dna.coreSememes.join('、')}`,
        `《${b.idiom}》义原：${b.dna.coreSememes.join('、')}`
      ]
    };
  }
  return {
    key: 'ancestral',
    title: '共同祖义',
    status: 'derived',
    content: `二者在语义底层存在交叠，共同指向【${shared.join('、')}】这一语义内核。溯其本义，皆由具体物象或行为生发，后经引申而趋于抽象哲理，呈现“具象→抽象”的同源演化逻辑。`,
    evidence: [
      `共现义原：${shared.join('、')}`,
      `《${a.idiom}》本义：${a.evolutionPath[0]?.meaning ?? ''}`,
      `《${b.idiom}》本义：${b.evolutionPath[0]?.meaning ?? ''}`
    ]
  };
}

function buildDivergenceSection(a: IdiomProfile, b: IdiomProfile, missingFields: string[]): ReportSection {
  if (!a.dataVerified || !b.dataVerified) {
    return {
      key: 'divergence',
      title: '分叉时期',
      status: 'missing',
      content: '',
      missingReason: `${unverifiedNames(a, b)}为生成条目，演化路径不完整，无法判定分叉时期。`,
      evidence: []
    };
  }
  const eraA = findDivergenceEra(a);
  const eraB = findDivergenceEra(b);
  if (!eraA || !eraB) {
    return {
      key: 'divergence',
      title: '分叉时期',
      status: 'missing',
      content: '',
      missingReason: '两词条演化路径缺少「引申义/比喻义」节点，无法判定分叉时期。',
      evidence: [
        `《${a.idiom}》路径：${a.evolutionPath.map(s => s.era).join(' → ')}`,
        `《${b.idiom}》路径：${b.evolutionPath.map(s => s.era).join(' → ')}`
      ]
    };
  }
  return {
    key: 'divergence',
    title: '分叉时期',
    status: 'derived',
    content: `《${a.idiom}》于【${eraA}】由本义引申，《${b.idiom}》于【${eraB}】由本义引申。二者在本义阶段尚属同质（皆为具体物象或行为），进入引申阶段后分道扬镳，各自形成独立的语义脉络。`,
    evidence: [
      `《${a.idiom}》分叉节点：${eraA}（${a.evolutionPath.find(s => s.era === eraA)?.semanticCategory ?? ''}）`,
      `《${b.idiom}》分叉节点：${eraB}（${b.evolutionPath.find(s => s.era === eraB)?.semanticCategory ?? ''}）`
    ]
  };
}

function buildModernSection(a: IdiomProfile, b: IdiomProfile, missingFields: string[]): ReportSection {
  if (!a.dataVerified || !b.dataVerified) {
    return {
      key: 'modern',
      title: '现代差异',
      status: 'missing',
      content: '',
      missingReason: `${unverifiedNames(a, b)}为生成条目，现代释义与句法功能为占位推演，无法比对现代差异。`,
      evidence: []
    };
  }
  const samePolarity = a.dna.polarity === b.dna.polarity;
  const diffs = [
    `感情色彩：《${a.idiom}》为【${a.dna.polarity}】，《${b.idiom}》为【${b.dna.polarity}】（${samePolarity ? '相同' : '迥异'}）。`,
    `句法功能：《${a.idiom}》${a.syntacticRole}；《${b.idiom}》${b.syntacticRole}。`,
    `现代释义：《${a.idiom}》${a.modernDefinition}；《${b.idiom}》${b.modernDefinition}。`
  ];
  return {
    key: 'modern',
    title: '现代差异',
    status: 'verified',
    content: `二者在现代语用中呈现显著差异。${diffs.join('')}`,
    evidence: [
      `《${a.idiom}》现代释义：${a.modernDefinition}`,
      `《${b.idiom}》现代释义：${b.modernDefinition}`
    ]
  };
}

export function buildEvolutionReport(a: IdiomProfile, b: IdiomProfile): SemanticEvolutionReport {
  const missingFields: string[] = [];

  const ancestral = buildAncestralSection(a, b, missingFields);
  const divergence = buildDivergenceSection(a, b, missingFields);
  const modern = buildModernSection(a, b, missingFields);

  // 汇总缺失字段标签
  [ancestral, divergence, modern].forEach(s => {
    if (s.status === 'missing') missingFields.push(s.title);
  });

  const overallConfidence: SemanticEvolutionReport['overallConfidence'] =
    missingFields.length === 0 ? '高' : missingFields.length === 1 ? '中' : '低';

  return {
    id: `report-${Date.now()}`,
    idiomA: a,
    idiomB: b,
    generatedAt: new Date().toISOString(),
    sections: { ancestral, divergence, modern },
    missingFields,
    overallConfidence,
    commonAncestralMeaning: ancestral.status === 'missing' ? '（缺失）' : ancestral.content,
    divergencePeriod: divergence.status === 'missing' ? '（缺失）' : divergence.content,
    modernDifferences: modern.status === 'missing' ? ['（缺失）'] : [modern.content]
  };
}

/* ===================== 报告序列化导出 ===================== */

function formatSectionForExport(section: ReportSection): string[] {
  const statusLabel = STATUS_LABEL[section.status];
  const lines: string[] = [];
  lines.push(`> 可信状态：${statusLabel}`);
  lines.push('');
  if (section.status === 'missing') {
    lines.push(`【缺失】${section.missingReason ?? '该字段考据数据缺失。'}`);
  } else {
    lines.push(section.content);
  }
  if (section.evidence.length > 0) {
    lines.push('');
    lines.push('支撑证据：');
    section.evidence.forEach(e => lines.push(`  - ${e}`));
  }
  return lines;
}

export function reportToMarkdown(report: SemanticEvolutionReport): string {
  const lines: string[] = [];
  lines.push('# 语义演化对比报告');
  lines.push('');
  lines.push(`- 词条 A：《${report.idiomA.idiom}》（${report.idiomA.pinyin}）`);
  lines.push(`- 词条 B：《${report.idiomB.idiom}》（${report.idiomB.pinyin}）`);
  lines.push(`- 生成时间：${new Date(report.generatedAt).toLocaleString('zh-CN')}`);
  lines.push(`- 整体可信度：${report.overallConfidence}`);
  if (report.missingFields.length > 0) {
    lines.push(`- ⚠️ 缺失字段：${report.missingFields.join('、')}（已在正文中明确标注）`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 一、共同祖义');
  lines.push(...formatSectionForExport(report.sections.ancestral));
  lines.push('');
  lines.push('## 二、分叉时期');
  lines.push(...formatSectionForExport(report.sections.divergence));
  lines.push('');
  lines.push('## 三、现代差异');
  lines.push(...formatSectionForExport(report.sections.modern));
  lines.push('');
  lines.push('---');
  lines.push('*本报告由「华夏成语字源与语义DNA图谱」系统生成。标注「缺失」的字段表示该词条考据数据不足，结论仅供参考。*');
  return lines.join('\n');
}

export function reportToJson(report: SemanticEvolutionReport): string {
  return JSON.stringify(report, null, 2);
}
