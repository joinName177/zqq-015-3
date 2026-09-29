import {
  CommonRootSection,
  ConfidenceLevel,
  DataGap,
  DivergenceSection,
  EvolutionComparisonReport,
  IdiomProfile,
  ModernDifferenceSection,
  SemanticEvolutionStep,
  StageAlignment
} from './models';

const STAGE_CATEGORIES = ['本义', '引申义', '比喻义'] as const;
const MISSING_TOKEN = '【缺失】';
const UNVERIFIED_TOKEN = '【存疑】';
const UNKNOWN_TOKEN = '【无考】';
/** 引申 / 比喻阶段文本相似度低于此值视为语义分叉（字符 bigram Jaccard） */
const DIVERGENCE_SIMILARITY_THRESHOLD = 0.12;

function isBlank(value: string | undefined | null): boolean {
  return !value || value.trim().length === 0;
}

/** 以字段是否含占位符判定其考据可靠性（通用适配器产出的字段带有明显套语特征） */
function isBoilerplate(value: string): boolean {
  return /典籍辑佚|古代佚名|zì-|chéng yǔ zhòng shēng|四字结构凝炼|东方思维智慧/.test(value);
}

/** 字符二元组 Jaccard 相似度（0-1），用于无词库条件下估算两个义项文本的亲缘 */
function bigramJaccard(a: string, b: string): number {
  const grams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const ga = grams(a);
  const gb = grams(b);
  if (ga.size === 0 || gb.size === 0) return 0;
  let inter = 0;
  ga.forEach(g => {
    if (gb.has(g)) inter++;
  });
  return inter / (ga.size + gb.size - inter);
}

function sharedSememesOf(a: IdiomProfile, b: IdiomProfile): string[] {
  const setB = new Set(b.dna.coreSememes);
  return a.dna.coreSememes.filter(s => setB.has(s));
}

function stepOf(profile: IdiomProfile, category: (typeof STAGE_CATEGORIES)[number]): SemanticEvolutionStep | undefined {
  return profile.evolutionPath.find(s => s.semanticCategory === category);
}

function eraRange(a: IdiomProfile, b: IdiomProfile, category: (typeof STAGE_CATEGORIES)[number]): string {
  const sa = stepOf(a, category);
  const sb = stepOf(b, category);
  return `${sa?.era ?? UNKNOWN_TOKEN} ／ ${sb?.era ?? UNKNOWN_TOKEN}`;
}

/* ---------------- 共同祖义 ---------------- */

function buildCommonRoot(a: IdiomProfile, b: IdiomProfile, shared: string[], gaps: DataGap[]): CommonRootSection {
  const sectionGaps = gaps.filter(g => g.section === '共同祖义');
  const polarSame = a.dna.polarity === b.dna.polarity;

  // 祖义取本义义项；本义缺失时回退至首字原始构意
  let rootA = stepOf(a, '本义')?.meaning ?? '';
  let rootB = stepOf(b, '本义')?.meaning ?? '';
  if (isBlank(rootA)) rootA = a.characters[0]?.originalMeaning ?? '';
  if (isBlank(rootB)) rootB = b.characters[0]?.originalMeaning ?? '';

  const missingA = isBlank(rootA);
  const missingB = isBlank(rootB);
  const suspectA = !missingA && isBoilerplate(rootA);
  const suspectB = !missingB && isBoilerplate(rootB);

  if (missingA) rootA = MISSING_TOKEN;
  if (missingB) rootB = MISSING_TOKEN;

  // 置信度：共本义原数量 + 极性一致 + 硬缺项
  let confidence: ConfidenceLevel;
  if ((missingA || missingB) && shared.length === 0) {
    confidence = '不可考';
  } else if (shared.length >= 2 && polarSame && !missingA && !missingB && !suspectA && !suspectB) {
    confidence = '高';
  } else if (shared.length >= 1 && !missingA && !missingB) {
    confidence = '中';
  } else {
    confidence = '低';
  }

  let summary: string;
  if (confidence === '不可考') {
    summary =
      `《${a.idiom}》与《${b.idiom}》的本义材料不完整（${missingA ? `《${a.idiom}》本义${MISSING_TOKEN}` : ''}${missingA && missingB ? '；' : ''}${missingB ? `《${b.idiom}》本义${MISSING_TOKEN}` : ''}），且核心义原无交集，二者的共同祖义${UNKNOWN_TOKEN}，不宜强行同源。`;
  } else if (shared.length >= 2) {
    summary =
      `两词在本义层面同属“${shared.join('、')}”这一语义母体：《${a.idiom}》祖义为「${rootA}」；《${b.idiom}》祖义为「${rootB}」。二者在早期具象语境中共享可核验的义理根基，共同祖义置信度【${confidence}】。`;
  } else if (shared.length === 1) {
    summary =
      `两词的共同语义母体仅能锚定在“${shared[0]}”一点：《${a.idiom}》取「${rootA}」，《${b.idiom}》取「${rootB}」，祖义关联属间接推定，共同祖义置信度【${confidence}】。`;
  } else {
    summary =
      `现存典籍中未见两词共享的核心义原，《${a.idiom}》本义「${rootA}」与《${b.idiom}》本义「${rootB}」分属不同语义场；所谓共同祖义${UNKNOWN_TOKEN}，本报告仅作并置陈列，置信度【${confidence}】。`;
  }

  return {
    summary,
    sharedSememes: shared,
    sharedPolarity: polarSame,
    rootA,
    rootB,
    confidence,
    gaps: sectionGaps
  };
}

/* ---------------- 分叉时期 ---------------- */

function buildDivergence(a: IdiomProfile, b: IdiomProfile, shared: string[], gaps: DataGap[]): DivergenceSection {
  const sectionGaps = gaps.filter(g => g.section === '分叉时期');
  const alignments: StageAlignment[] = [];

  for (const category of STAGE_CATEGORIES) {
    const sa = stepOf(a, category);
    const sb = stepOf(b, category);
    const missingA = !sa || isBlank(sa.meaning);
    const missingB = !sb || isBlank(sb.meaning);

    let similarity: number | null = null;
    let aligned: boolean;
    let note: string;

    if (missingA || missingB) {
      aligned = false;
      const who = missingA && missingB ? '两词' : missingA ? `《${a.idiom}》` : `《${b.idiom}》`;
      note = `${who}该阶段义项${MISSING_TOKEN}，无法对齐`;
      gaps.push({
        owner: missingA && missingB ? 'shared' : missingA ? a.idiom : b.idiom,
        section: '分叉时期',
        field: `${category}阶段义项`,
        kind: '缺失',
        reason: `${who}演化路径缺少「${category}」阶段的可考义项`
      });
    } else {
      similarity = Math.round(bigramJaccard(sa!.meaning, sb!.meaning) * 100);
      if (category === '本义') {
        // 本义阶段是否同根以义原交叠判定，文本相似度仅作参照
        aligned = shared.length > 0;
        note = aligned
          ? `本义同根（义原交叠 ${shared.length} 项）；字面义项文本相似度 ${similarity}%，仅供参照`
          : `核心义原无交集，本义阶段即非同源；文本相似度 ${similarity}%`;
      } else {
        aligned = similarity / 100 >= DIVERGENCE_SIMILARITY_THRESHOLD;
        note = aligned
          ? `义项文本相似度 ${similarity}% ≥ 阈值 ${DIVERGENCE_SIMILARITY_THRESHOLD * 100}%，该阶段仍可对齐`
          : `义项文本相似度 ${similarity}% < 阈值 ${DIVERGENCE_SIMILARITY_THRESHOLD * 100}%，语义在此阶段分叉`;
      }
    }

    alignments.push({
      category,
      eraA: sa?.era ?? MISSING_TOKEN,
      eraB: sb?.era ?? MISSING_TOKEN,
      meaningA: missingA ? MISSING_TOKEN : sa!.meaning,
      meaningB: missingB ? MISSING_TOKEN : sb!.meaning,
      similarity,
      aligned,
      note
    });
  }

  // 寻找本义之后首个不对齐阶段
  const forkIndex = alignments.findIndex((al, i) => i > 0 && !al.aligned);
  const diverged = forkIndex > 0;

  let divergenceLabel: string;
  let divergenceEra: string | null = null;
  let divergenceCategory: (typeof STAGE_CATEGORIES)[number] | null = null;
  let exactYearKnown = false;

  if (!alignments[0].aligned && alignments.slice(1).every(al => !al.aligned)) {
    divergenceLabel = '未见共同源头（分叉时期无考）';
    divergenceEra = null;
  } else if (!diverged) {
    divergenceLabel = '迄今未发生显著分叉';
    divergenceEra = null;
  } else {
    divergenceCategory = alignments[forkIndex].category;
    divergenceEra = eraRange(a, b, divergenceCategory);
    divergenceLabel = `语义于「${divergenceCategory}」阶段分叉（${divergenceEra}）`;
    exactYearKnown = false;
    gaps.push({
      owner: 'shared',
      section: '分叉时期',
      field: '分叉精确年代',
      kind: '无考',
      reason: '语义渐变为连续过程，现存文献不足以系年，只能定位到历史时段区间'
    });
  }

  let summary: string;
  if (divergenceLabel.startsWith('未见')) {
    summary =
      `两词在本义阶段即分属不同语义场（参见“共同祖义”栏），其后引申、比喻路径亦各自独立，分叉点无法回溯，分叉时期${UNKNOWN_TOKEN}。`;
  } else if (!diverged) {
    summary =
      `从本义到比喻义的三个阶段均可对齐（相似度序列：${alignments.map(al => (al.similarity === null ? '缺失' : `${al.similarity}%`)).join(' → ')}），两词在现有文献中未见显著语义分叉，现代仍属同一语义簇。`;
  } else {
    const fork = alignments[forkIndex];
    summary =
      `两词共同经历本义与此前阶段后，于「${fork.category}」阶段（《${a.idiom}》：${fork.eraA}；《${b.idiom}》：${fork.eraB}）出现首次不可对齐：《${a.idiom}》演为「${fork.meaningA}」，《${b.idiom}》演为「${fork.meaningB}」。该阶段义项相似度仅 ${fork.similarity === null ? MISSING_TOKEN : `${fork.similarity}%`}。分叉只能断代到时段区间，精确系年${UNKNOWN_TOKEN}。`;
  }

  return {
    stageAlignments: alignments,
    diverged,
    divergenceEra,
    divergenceLabel,
    divergenceCategory,
    exactYearKnown,
    summary,
    gaps: sectionGaps
  };
}

/* ---------------- 现代差异 ---------------- */

function buildModernDifference(a: IdiomProfile, b: IdiomProfile, shared: string[], gaps: DataGap[]): ModernDifferenceSection {
  const sectionGaps = gaps.filter(g => g.section === '现代差异');

  const defA = isBlank(a.modernDefinition)
    ? MISSING_TOKEN
    : isBoilerplate(a.modernDefinition)
      ? `${a.modernDefinition} ${UNVERIFIED_TOKEN}`
      : a.modernDefinition;
  const defB = isBlank(b.modernDefinition)
    ? MISSING_TOKEN
    : isBoilerplate(b.modernDefinition)
      ? `${b.modernDefinition} ${UNVERIFIED_TOKEN}`
      : b.modernDefinition;
  const roleA = isBlank(a.syntacticRole) ? MISSING_TOKEN : a.syntacticRole;
  const roleB = isBlank(b.syntacticRole) ? MISSING_TOKEN : b.syntacticRole;

  const onlyA = a.dna.coreSememes.filter(s => !b.dna.coreSememes.includes(s));
  const onlyB = b.dna.coreSememes.filter(s => !a.dna.coreSememes.includes(s));
  const polarCompat = a.dna.polarity === b.dna.polarity;

  const parts: string[] = [];
  parts.push(
    polarCompat
      ? `情感色彩一致（均为【${a.dna.polarity}】），现代语用中可在部分语境互换但侧重不同。`
      : `情感色彩已分化：《${a.idiom}》为【${a.dna.polarity}】，《${b.idiom}》为【${b.dna.polarity}】，二者在现代语用中不可互换。`
  );

  if (onlyA.length || onlyB.length) {
    parts.push(
      `义原侧重上，《${a.idiom}》独有【${onlyA.join('、') || '无'}】，《${b.idiom}》独有【${onlyB.join('、') || '无'}】${shared.length ? `；共有【${shared.join('、')}】` : '；二者无共有核心义原'}。`
    );
  }

  parts.push(
    `句法功能方面，《${a.idiom}》：${roleA}；《${b.idiom}》：${roleB}${roleA === roleB ? '，功能基本相同。' : '，句法分布存在差异。'}`
  );

  return {
    definitionA: defA,
    definitionB: defB,
    polarityA: a.dna.polarity,
    polarityB: b.dna.polarity,
    polarityCompatible: polarCompat,
    syntacticRoleA: roleA,
    syntacticRoleB: roleB,
    sememesOnlyA: onlyA,
    sememesOnlyB: onlyB,
    summary: parts.join(''),
    gaps: sectionGaps
  };
}

/* ---------------- 档案级缺项收集 ---------------- */

function collectProfileGaps(profile: IdiomProfile, gaps: DataGap[]) {
  (profile.dataGaps ?? []).forEach(g => gaps.push(g));

  const check = (field: string, value: string | undefined, section: DataGap['section'], reason: string, kind: DataGap['kind'] = '缺失') => {
    if (isBlank(value)) {
      gaps.push({ owner: profile.idiom, section, field, kind, reason });
    }
  };

  check('拼音', profile.pinyin, '词条档案', '缺少拼音注音');
  check('现代释义', profile.modernDefinition, '现代差异', '缺少现代权威释义');
  check('句法功能', profile.syntacticRole, '现代差异', '缺少句法功能说明');
  check('典故出处', profile.allusion?.classicBook, '词条档案', '缺少典故典籍出处');
  if (!profile.evolutionPath?.length) {
    gaps.push({ owner: profile.idiom, section: '分叉时期', field: '语义演化路径', kind: '缺失', reason: '演化路径为空，无法参与分叉演算' });
  }
}

/* ---------------- 报告入口 ---------------- */

export function buildEvolutionComparisonReport(a: IdiomProfile, b: IdiomProfile): EvolutionComparisonReport {
  const gaps: DataGap[] = [];
  collectProfileGaps(a, gaps);
  collectProfileGaps(b, gaps);

  const shared = sharedSememesOf(a, b);

  const commonRoot = buildCommonRoot(a, b, shared, gaps);
  const divergence = buildDivergence(a, b, shared, gaps);
  const modernDifference = buildModernDifference(a, b, shared, gaps);

  // buildDivergence / buildCommonRoot 可能就地追加了新的共享缺项，按栏目重新切分
  commonRoot.gaps = gaps.filter(g => g.section === '共同祖义');
  divergence.gaps = gaps.filter(g => g.section === '分叉时期');
  modernDifference.gaps = gaps.filter(g => g.section === '现代差异');

  const rank: ConfidenceLevel[] = ['不可考', '低', '中', '高'];
  const confidenceVotes: ConfidenceLevel[] = [commonRoot.confidence];
  // 「缺失」是证据硬伤，压低总评级；「存疑」次之；「无考」为诚实存真，不额外降权
  if (gaps.some(g => g.kind === '缺失')) confidenceVotes.push('低');
  else if (gaps.filter(g => g.kind === '存疑').length >= 3) confidenceVotes.push('低');
  else if (gaps.some(g => g.kind === '存疑')) confidenceVotes.push('中');
  const overallConfidence = rank[Math.min(...confidenceVotes.map(c => rank.indexOf(c)))];

  return {
    id: `rpt-${Date.now().toString(36)}-${Math.abs((a.idiom + b.idiom).length * 7 + a.idiom.length).toString(36)}`,
    generatedAt: new Date().toISOString(),
    idiomA: a,
    idiomB: b,
    commonRoot,
    divergence,
    modernDifference,
    allGaps: gaps,
    overallConfidence
  };
}

export const REPORT_TOKENS = { MISSING_TOKEN, UNVERIFIED_TOKEN, UNKNOWN_TOKEN };
