import { DataGap, EvolutionComparisonReport } from '../core/models';
import { REPORT_TOKENS } from '../core/evolution-report-engine';

export interface ReportUIHandlers {
  onGenerate: (idiomA: string, idiomB: string) => void;
  onReselect: () => void;
  onExportMarkdown: () => void;
  onExportHtml: () => void;
}

const KIND_CLASS: Record<DataGap['kind'], string> = {
  缺失: 'gap-missing',
  存疑: 'gap-suspect',
  无考: 'gap-unknown'
};

function esc(s: string): string {
  return s.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));
}

function gapChips(gaps: DataGap[]): string {
  if (!gaps.length) return '<span class="gap-clear">本栏字段完备，无缺失/存疑项</span>';
  return gaps
    .map(
      g =>
        `<span class="gap-chip ${KIND_CLASS[g.kind]}" title="${esc(g.reason)}">【${g.kind}】${esc(g.field)}<em>${g.owner === 'shared' ? '两词' : esc(g.owner)}</em></span>`
    )
    .join('');
}

function renderSelection(presets: string[], a: string, b: string, error: string | null): string {
  const options = presets.map(p => `<option value="${esc(p)}"></option>`).join('');
  const pairs: [string, string][] = [
    ['守株待兔', '刻舟求剑'],
    ['卧薪尝胆', '破釜沉舟'],
    ['守株待兔', '卧薪尝胆']
  ];

  return `
    <section class="report-arena">
      <div class="section-title"><span>🧬 语义演化对比报告 · 词条选择</span></div>
      <p class="report-intro">
        选择两个词条（支持内置典范成语或自行输入任意四字词），系统将考据并分段生成报告：
        <strong>共同祖义 → 分叉时期 → 现代差异</strong>，并对一切缺失、存疑、无考字段作显式标注。
      </p>

      <div class="compare-inputs report-selector">
        <div>
          <label class="field-label">词条 A</label>
          <input type="text" class="idiom-input" id="reportInputA" list="reportPresets" value="${esc(a)}" placeholder="输入词条 A，如：守株待兔" />
        </div>
        <div class="vs-badge">×</div>
        <div>
          <label class="field-label">词条 B</label>
          <input type="text" class="idiom-input" id="reportInputB" list="reportPresets" value="${esc(b)}" placeholder="输入词条 B，如：刻舟求剑" />
        </div>
        <datalist id="reportPresets">${options}</datalist>
      </div>

      <div class="preset-chips report-pairs">
        <span style="color:var(--ash);">示例配对：</span>
        ${pairs
          .map(
            ([x, y]) =>
              `<button class="chip pair-chip" data-a="${esc(x)}" data-b="${esc(y)}">${esc(x)} × ${esc(y)}</button>`
          )
          .join('')}
      </div>

      ${error ? `<div class="report-error">⚠️ ${esc(error)}</div>` : ''}

      <div class="report-actions-center">
        <button class="btn-search btn-generate" id="btnGenerateReport">生成语义演化对比报告</button>
      </div>
    </section>
  `;
}

function renderReport(r: EvolutionComparisonReport): string {
  const a = r.idiomA;
  const b = r.idiomB;
  const root = r.commonRoot;
  const div = r.divergence;
  const mod = r.modernDifference;

  const confClass = ['高', '中', '低', '不可考'].includes(root.confidence)
    ? `conf-${root.confidence}`
    : 'conf-低';

  const stageRows = div.stageAlignments
    .map(
      s => `
      <tr>
        <td><strong>${esc(s.category)}</strong></td>
        <td>${esc(s.eraA)}<div class="cell-sub">${esc(s.meaningA)}</div></td>
        <td>${esc(s.eraB)}<div class="cell-sub">${esc(s.meaningB)}</div></td>
        <td class="num">${s.similarity === null ? REPORT_TOKENS.MISSING_TOKEN : `${s.similarity}%`}</td>
        <td class="num">
          <span class="align-badge ${s.aligned ? 'align-yes' : 'align-no'}">${s.aligned ? '对齐' : '分叉'}</span>
          <div class="cell-note">${esc(s.note)}</div>
        </td>
      </tr>`
    )
    .join('');

  const sememeTags = (arr: string[], cls = '') =>
    arr.length
      ? arr.map(s => `<span class="sememe-tag ${cls}">${esc(s)}</span>`).join('')
      : '<span class="gap-clear">无</span>';

  return `
    <section class="report-arena">
      <!-- 报告头 -->
      <div class="report-header">
        <div>
          <div class="report-kicker">SEMANTIC EVOLUTION COMPARISON REPORT</div>
          <h2>《${esc(a.idiom)}》 <span class="report-cross">×</span> 《${esc(b.idiom)}》</h2>
          <div class="report-meta">
            报告编号 ${esc(r.id)} ｜ 生成时间 ${esc(new Date(r.generatedAt).toLocaleString('zh-CN'))}
            ｜ 总体考据置信度 <span class="conf-badge conf-${esc(r.overallConfidence)}">${esc(r.overallConfidence)}</span>
          </div>
        </div>
        <div class="report-header-actions">
          <button class="btn-report-action" id="btnReselect">↺ 重新选择</button>
          <button class="btn-report-action btn-export" id="btnExportMd">⬇ 导出 Markdown</button>
          <button class="btn-report-action btn-export" id="btnExportHtml">⬇ 导出 HTML</button>
        </div>
      </div>

      <!-- 一、共同祖义 -->
      <article class="report-section">
        <div class="report-section-head">
          <h3><span class="section-no">壹</span>共同祖义</h3>
          <span class="conf-badge ${confClass}">置信度 · ${esc(root.confidence)}</span>
        </div>
        <div class="root-grid">
          <div class="root-card">
            <div class="root-card-title">《${esc(a.idiom)}》祖义</div>
            <div class="root-card-body">${esc(root.rootA)}</div>
          </div>
          <div class="root-link">⇄</div>
          <div class="root-card">
            <div class="root-card-title">《${esc(b.idiom)}》祖义</div>
            <div class="root-card-body">${esc(root.rootB)}</div>
          </div>
        </div>
        <div class="report-line">
          <strong>共有核心义原：</strong>
          ${root.sharedSememes.length ? sememeTags(root.sharedSememes, 'shared') : `<span class="gap-chip gap-unknown">${REPORT_TOKENS.UNKNOWN_TOKEN} 无交叠义原</span>`}
          <strong style="margin-left:18px;">情感极性：</strong>
          <span class="polarity-badge ${esc(a.dna.polarity)}">${esc(a.dna.polarity)}</span>
          ${root.sharedPolarity ? '=' : '≠'}
          <span class="polarity-badge ${esc(b.dna.polarity)}">${esc(b.dna.polarity)}</span>
        </div>
        <p class="report-summary">${esc(root.summary)}</p>
        <div class="gap-row">${gapChips(root.gaps)}</div>
      </article>

      <!-- 二、分叉时期 -->
      <article class="report-section">
        <div class="report-section-head">
          <h3><span class="section-no">贰</span>分叉时期</h3>
          <span class="fork-badge ${div.diverged ? 'fork-yes' : 'fork-no'}">${esc(div.divergenceLabel)}</span>
        </div>
        <div class="report-line">
          <strong>分叉精确年代：</strong>
          ${
            div.exactYearKnown
              ? esc(div.divergenceEra ?? '')
              : `<span class="gap-chip gap-unknown">${REPORT_TOKENS.UNKNOWN_TOKEN} 无法精确系年（仅可定位至时段区间）</span>`
          }
        </div>
        <table class="stage-table">
          <thead>
            <tr>
              <th style="width:90px;">演化阶段</th>
              <th>《${esc(a.idiom)}》</th>
              <th>《${esc(b.idiom)}》</th>
              <th style="width:80px;">相似度</th>
              <th style="width:200px;">对齐判定</th>
            </tr>
          </thead>
          <tbody>${stageRows}</tbody>
        </table>
        <p class="report-summary">${esc(div.summary)}</p>
        <div class="gap-row">${gapChips(div.gaps)}</div>
      </article>

      <!-- 三、现代差异 -->
      <article class="report-section">
        <div class="report-section-head">
          <h3><span class="section-no">叁</span>现代差异</h3>
          <span class="polarity-badge ${esc(mod.polarityA)}">${esc(mod.polarityA)}</span>
          <span style="margin:0 6px;">${mod.polarityCompatible ? '＝' : '≠'}</span>
          <span class="polarity-badge ${esc(mod.polarityB)}">${esc(mod.polarityB)}</span>
        </div>
        <div class="modern-grid">
          <div class="modern-card">
            <div class="modern-card-title">《${esc(a.idiom)}》</div>
            <p>${esc(mod.definitionA)}</p>
            <div class="modern-role">句法：${esc(mod.syntacticRoleA)}</div>
            <div class="modern-sememes">${sememeTags(mod.sememesOnlyA)}</div>
          </div>
          <div class="modern-card">
            <div class="modern-card-title">《${esc(b.idiom)}》</div>
            <p>${esc(mod.definitionB)}</p>
            <div class="modern-role">句法：${esc(mod.syntacticRoleB)}</div>
            <div class="modern-sememes">${sememeTags(mod.sememesOnlyB)}</div>
          </div>
        </div>
        <p class="report-summary">${esc(mod.summary)}</p>
        <div class="gap-row">${gapChips(mod.gaps)}</div>
      </article>

      <!-- 附：全报告缺项审计 -->
      <article class="report-section gap-audit">
        <div class="report-section-head">
          <h3><span class="section-no">附</span>缺失 / 存疑字段总目</h3>
          <span class="gap-count">共 ${r.allGaps.length} 项</span>
        </div>
        ${
          r.allGaps.length === 0
            ? '<p class="gap-clear">✓ 本报告所涉字段均有可核验材料，无缺失、存疑或无考项。</p>'
            : `<table class="gap-table">
                <thead><tr><th>归属</th><th>栏目</th><th>字段</th><th>标注</th><th>说明</th></tr></thead>
                <tbody>
                  ${r.allGaps
                    .map(
                      g => `<tr>
                        <td>${g.owner === 'shared' ? '两词共同' : `《${esc(g.owner)}》`}</td>
                        <td>${esc(g.section)}</td>
                        <td>${esc(g.field)}</td>
                        <td><span class="gap-chip ${KIND_CLASS[g.kind]}">【${g.kind}】</span></td>
                        <td class="gap-reason">${esc(g.reason)}</td>
                      </tr>`
                    )
                    .join('')}
                </tbody>
              </table>
              <p class="gap-legend">标注约定：${REPORT_TOKENS.MISSING_TOKEN} 字段缺失　${REPORT_TOKENS.UNVERIFIED_TOKEN} 材料存疑（推演而未经典籍确证）　${REPORT_TOKENS.UNKNOWN_TOKEN} 学界无确考</p>`
        }
      </article>
    </section>
  `;
}

export function renderReportMode(
  container: HTMLElement,
  presets: string[],
  report: EvolutionComparisonReport | null,
  draftA: string,
  draftB: string,
  error: string | null,
  handlers: ReportUIHandlers
) {
  const host = document.createElement('div');
  host.innerHTML = report ? renderReport(report) : renderSelection(presets, draftA, draftB, error);
  container.replaceChildren(...Array.from(host.children));

  if (!report) {
    const inputA = container.querySelector('#reportInputA') as HTMLInputElement;
    const inputB = container.querySelector('#reportInputB') as HTMLInputElement;
    const run = () => {
      handlers.onGenerate(inputA.value.trim(), inputB.value.trim());
    };
    container.querySelector('#btnGenerateReport')?.addEventListener('click', run);
    [inputA, inputB].forEach(inp =>
      inp?.addEventListener('keydown', e => {
        if (e.key === 'Enter') run();
      })
    );
    container.querySelectorAll('.pair-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const pa = btn.getAttribute('data-a');
        const pb = btn.getAttribute('data-b');
        if (pa && pb) handlers.onGenerate(pa, pb);
      });
    });
  } else {
    container.querySelector('#btnReselect')?.addEventListener('click', handlers.onReselect);
    container.querySelector('#btnExportMd')?.addEventListener('click', handlers.onExportMarkdown);
    container.querySelector('#btnExportHtml')?.addEventListener('click', handlers.onExportHtml);
  }
}
