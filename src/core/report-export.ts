import { DataGap, EvolutionComparisonReport } from './models';
import { REPORT_TOKENS } from './evolution-report-engine';

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function gapLine(g: DataGap): string {
  const owner = g.owner === 'shared' ? '两词共同' : `《${g.owner}》`;
  return `| ${owner} | ${g.section} | ${g.field} | ${g.kind} | ${g.reason} |`;
}

const GAP_TABLE_HEADER = [
  '| 归属 | 栏目 | 缺失/存疑字段 | 标注 | 说明 |',
  '| --- | --- | --- | --- | --- |'
].join('\n');

/* ---------------- Markdown ---------------- */

export function reportToMarkdown(r: EvolutionComparisonReport): string {
  const { idiomA: a, idiomB: b, commonRoot: root, divergence: div, modernDifference: mod } = r;
  const lines: string[] = [];

  lines.push(`# 语义演化对比报告：《${a.idiom}》 × 《${b.idiom}》`);
  lines.push('');
  lines.push(`- 报告编号：${r.id}`);
  lines.push(`- 生成时间：${formatTime(r.generatedAt)}`);
  lines.push(`- 总体考据置信度：**${r.overallConfidence}**`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 一、共同祖义
  lines.push('## 一、共同祖义');
  lines.push('');
  lines.push(`- 置信度：**${root.confidence}**`);
  lines.push(`- 《${a.idiom}》祖义：${root.rootA}`);
  lines.push(`- 《${b.idiom}》祖义：${root.rootB}`);
  lines.push(`- 共有核心义原：${root.sharedSememes.length ? root.sharedSememes.map(s => `【${s}】`).join('、') : REPORT_TOKENS.UNKNOWN_TOKEN}`);
  lines.push(`- 情感极性：《${a.idiom}》【${a.dna.polarity}】 vs 《${b.idiom}》【${b.dna.polarity}】（${root.sharedPolarity ? '一致' : '不一致'}）`);
  lines.push('');
  lines.push(`> ${root.summary}`);
  lines.push('');

  // 二、分叉时期
  lines.push('## 二、分叉时期');
  lines.push('');
  lines.push(`- 分叉判定：**${div.divergenceLabel}**`);
  lines.push(`- 分叉精确年代：${div.exactYearKnown ? div.divergenceEra ?? '' : REPORT_TOKENS.UNKNOWN_TOKEN}`);
  lines.push('');
  lines.push('| 阶段 | 《' + a.idiom + '》时代 | 《' + b.idiom + '》时代 | 文本相似度 | 是否对齐 |');
  lines.push('| --- | --- | --- | --- | --- |');
  div.stageAlignments.forEach(s => {
    lines.push(
      `| ${s.category} | ${s.eraA} | ${s.eraB} | ${s.similarity === null ? REPORT_TOKENS.MISSING_TOKEN : s.similarity + '%'} | ${s.aligned ? '对齐' : '分叉'} |`
    );
  });
  lines.push('');
  div.stageAlignments.forEach(s => {
    lines.push(`- **${s.category}**：${s.note}`);
    lines.push(`  - 《${a.idiom}》：${s.meaningA}`);
    lines.push(`  - 《${b.idiom}》：${s.meaningB}`);
  });
  lines.push('');
  lines.push(`> ${div.summary}`);
  lines.push('');

  // 三、现代差异
  lines.push('## 三、现代差异');
  lines.push('');
  lines.push(`- 《${a.idiom}》现代释义：${mod.definitionA}`);
  lines.push(`- 《${b.idiom}》现代释义：${mod.definitionB}`);
  lines.push(`- 感情色彩：【${mod.polarityA}】 vs 【${mod.polarityB}】（${mod.polarityCompatible ? '一致' : '分化'}）`);
  lines.push(`- 句法功能：${mod.syntacticRoleA} ／ ${mod.syntacticRoleB}`);
  lines.push(`- 《${a.idiom}》独有义原：${mod.sememesOnlyA.length ? mod.sememesOnlyA.map(s => `【${s}】`).join('、') : '无'}`);
  lines.push(`- 《${b.idiom}》独有义原：${mod.sememesOnlyB.length ? mod.sememesOnlyB.map(s => `【${s}】`).join('、') : '无'}`);
  lines.push('');
  lines.push(`> ${mod.summary}`);
  lines.push('');

  // 附：缺失字段标注
  lines.push('---');
  lines.push('');
  lines.push('## 附：缺失 / 存疑字段标注');
  lines.push('');
  if (r.allGaps.length === 0) {
    lines.push('本报告所涉字段均有可核验材料，无缺失项。');
  } else {
    lines.push(GAP_TABLE_HEADER);
    r.allGaps.forEach(g => lines.push(gapLine(g)));
  }
  lines.push('');
  lines.push(`> 标注约定：${REPORT_TOKENS.MISSING_TOKEN} 字段缺失；${REPORT_TOKENS.UNVERIFIED_TOKEN} 材料存疑（仅为推演，未经典籍确证）；${REPORT_TOKENS.UNKNOWN_TOKEN} 学界无确考。`);

  return lines.join('\n');
}

/* ---------------- 独立 HTML ---------------- */

const escHtml = (s: string) =>
  s.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));

export function reportToStandaloneHtml(r: EvolutionComparisonReport): string {
  const { idiomA: a, idiomB: b, commonRoot: root, divergence: div, modernDifference: mod } = r;

  const stageRows = div.stageAlignments
    .map(
      s => `
      <tr>
        <td>${escHtml(s.category)}</td>
        <td>${escHtml(s.eraA)}</td>
        <td>${escHtml(s.eraB)}</td>
        <td class="num">${s.similarity === null ? REPORT_TOKENS.MISSING_TOKEN : s.similarity + '%'}</td>
        <td>${s.aligned ? '对齐' : '分叉'}</td>
      </tr>
      <tr class="noterow"><td colspan="5">
        <div>${escHtml(s.note)}</div>
        <div>《${escHtml(a.idiom)}》：${escHtml(s.meaningA)}</div>
        <div>《${escHtml(b.idiom)}》：${escHtml(s.meaningB)}</div>
      </td></tr>`
    )
    .join('');

  const gapRows = r.allGaps.length
    ? r.allGaps
        .map(
          g => `<tr>
            <td>${g.owner === 'shared' ? '两词共同' : `《${escHtml(g.owner)}》`}</td>
            <td>${escHtml(g.section)}</td>
            <td>${escHtml(g.field)}</td>
            <td><span class="kind kind-${g.kind}">${g.kind}</span></td>
            <td>${escHtml(g.reason)}</td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="5" class="num">本报告所涉字段均有可核验材料，无缺失项。</td></tr>';

  const sememes = (arr: string[]) => (arr.length ? arr.map(s => `<span class="tag">${escHtml(s)}</span>`).join('') : '无');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<title>语义演化对比报告 · ${escHtml(a.idiom)} × ${escHtml(b.idiom)}</title>
<style>
  body{font-family:"Noto Serif SC","Songti SC",serif;background:#f7f3ea;color:#231f1a;max-width:900px;margin:0 auto;padding:40px 32px;line-height:1.7;}
  h1{font-size:26px;border-bottom:3px solid #c93b2b;padding-bottom:10px;}
  h2{font-size:19px;color:#8a2a1e;margin-top:34px;border-left:5px solid #c93b2b;padding-left:10px;}
  .meta{color:#6b6257;font-size:13px;}
  .conf{display:inline-block;background:#d4af37;color:#231f1a;font-weight:700;padding:2px 12px;border-radius:12px;font-size:13px;}
  blockquote{background:#efe7d6;border-left:4px solid #d4af37;margin:14px 0;padding:12px 18px;color:#3b352d;}
  table{border-collapse:collapse;width:100%;margin:12px 0;font-size:13px;}
  th,td{border:1px solid #c9bfac;padding:7px 10px;text-align:left;vertical-align:top;}
  th{background:#e8dfca;}
  td.num{text-align:center;}
  .noterow td{background:#fbf8f0;font-size:12px;color:#5d554a;}
  .tag{display:inline-block;background:#f3e9d2;border:1px solid #d4af37;color:#8a6d1f;padding:1px 8px;border-radius:4px;margin:2px;font-size:12px;}
  .kind{padding:1px 8px;border-radius:4px;font-size:12px;font-weight:700;}
  .kind-缺失{background:#fde2de;color:#a3281c;border:1px solid #c93b2b;}
  .kind-存疑{background:#fdf3d8;color:#8a6d1f;border:1px solid #d4af37;}
  .kind-无考{background:#e7e3da;color:#5d554a;border:1px solid #9c9285;}
</style>
</head>
<body>
  <h1>语义演化对比报告：《${escHtml(a.idiom)}》 × 《${escHtml(b.idiom)}》</h1>
  <p class="meta">报告编号：${escHtml(r.id)} ｜ 生成时间：${formatTime(r.generatedAt)} ｜ 总体考据置信度：<span class="conf">${escHtml(r.overallConfidence)}</span></p>

  <h2>一、共同祖义</h2>
  <p>置信度：<span class="conf">${escHtml(root.confidence)}</span></p>
  <p><strong>《${escHtml(a.idiom)}》祖义：</strong>${escHtml(root.rootA)}</p>
  <p><strong>《${escHtml(b.idiom)}》祖义：</strong>${escHtml(root.rootB)}</p>
  <p><strong>共有核心义原：</strong>${root.sharedSememes.length ? sememes(root.sharedSememes) : REPORT_TOKENS.UNKNOWN_TOKEN}</p>
  <blockquote>${escHtml(root.summary)}</blockquote>

  <h2>二、分叉时期</h2>
  <p><strong>分叉判定：</strong>${escHtml(div.divergenceLabel)}</p>
  <p><strong>分叉精确年代：</strong>${div.exactYearKnown ? escHtml(div.divergenceEra ?? '') : `<span class="kind kind-无考">${REPORT_TOKENS.UNKNOWN_TOKEN}</span>`}</p>
  <table>
    <thead><tr><th>阶段</th><th>《${escHtml(a.idiom)}》时代</th><th>《${escHtml(b.idiom)}》时代</th><th>文本相似度</th><th>是否对齐</th></tr></thead>
    <tbody>${stageRows}</tbody>
  </table>
  <blockquote>${escHtml(div.summary)}</blockquote>

  <h2>三、现代差异</h2>
  <p><strong>《${escHtml(a.idiom)}》现代释义：</strong>${escHtml(mod.definitionA)}</p>
  <p><strong>《${escHtml(b.idiom)}》现代释义：</strong>${escHtml(mod.definitionB)}</p>
  <p><strong>感情色彩：</strong>【${escHtml(mod.polarityA)}】 vs 【${escHtml(mod.polarityB)}】（${mod.polarityCompatible ? '一致' : '分化'}）</p>
  <p><strong>句法功能：</strong>${escHtml(mod.syntacticRoleA)} ／ ${escHtml(mod.syntacticRoleB)}</p>
  <p><strong>《${escHtml(a.idiom)}》独有义原：</strong>${sememes(mod.sememesOnlyA)}</p>
  <p><strong>《${escHtml(b.idiom)}》独有义原：</strong>${sememes(mod.sememesOnlyB)}</p>
  <blockquote>${escHtml(mod.summary)}</blockquote>

  <h2>附：缺失 / 存疑字段标注</h2>
  <table>
    <thead><tr><th>归属</th><th>栏目</th><th>缺失/存疑字段</th><th>标注</th><th>说明</th></tr></thead>
    <tbody>${gapRows}</tbody>
  </table>
  <p class="meta">标注约定：${REPORT_TOKENS.MISSING_TOKEN} 字段缺失；${REPORT_TOKENS.UNVERIFIED_TOKEN} 材料存疑（仅为推演，未经典籍确证）；${REPORT_TOKENS.UNKNOWN_TOKEN} 学界无确考。</p>
</body>
</html>`;
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function reportFilename(r: EvolutionComparisonReport, ext: string): string {
  const stamp = formatTime(r.generatedAt).replace(/[: ]/g, '').slice(0, 8);
  return `语义演化对比报告_${r.idiomA.idiom}_${r.idiomB.idiom}_${stamp}.${ext}`;
}
