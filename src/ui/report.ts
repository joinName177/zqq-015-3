import { SemanticEvolutionReport, ReportSection } from '../core/models';

export interface ReportUIHandlers {
  onGenerateReport: (a: string, b: string) => void;
  onReselect: () => void;
  onExport: (format: 'md' | 'json') => void;
}

const esc = (s: string) =>
  s.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t));

const STATUS_META: Record<ReportSection['status'], { label: string; cls: string; icon: string }> = {
  verified: { label: '已考证', cls: 'st-verified', icon: '✓' },
  derived: { label: '推演', cls: 'st-derived', icon: '◆' },
  missing: { label: '缺失', cls: 'st-missing', icon: '⚠' }
};

function renderSection(section: ReportSection, index: number): string {
  const meta = STATUS_META[section.status];
  const roman = ['一', '二', '三'][index];
  return `
    <section class="report-section ${section.status === 'missing' ? 'is-missing' : ''}">
      <div class="report-section-head">
        <span class="report-roman">${roman}</span>
        <h3>${esc(section.title)}</h3>
        <span class="report-status ${meta.cls}"><span class="st-icon">${meta.icon}</span>${meta.label}</span>
      </div>
      ${
        section.status === 'missing'
          ? `
        <div class="report-missing-block">
          <div class="missing-tag">【缺失 · 待考据】</div>
          <p class="missing-reason">${esc(section.missingReason ?? '该字段考据数据缺失。')}</p>
        </div>
        `
          : `
        <p class="report-content">${esc(section.content)}</p>
        `
      }
      ${
        section.evidence.length > 0
          ? `
        <div class="report-evidence">
          <div class="evidence-label">支撑证据</div>
          <ul>
            ${section.evidence.map(e => `<li>${esc(e)}</li>`).join('')}
          </ul>
        </div>
        `
          : ''
      }
    </section>
  `;
}

function renderSelection(presets: string[], reportA: string, reportB: string): string {
  return `
    <section class="search-container">
      <div class="section-title" style="margin-bottom:16px;">
        <span>🧾 选择两个词条，生成语义演化对比报告</span>
      </div>
      <div class="compare-inputs">
        <div>
          <label style="font-size:12px;color:var(--ash);display:block;margin-bottom:6px;">词条 A：</label>
          <input type="text" class="idiom-input" id="reportInputA" value="${esc(reportA)}" placeholder="输入词条 A，如：守株待兔" />
        </div>
        <div class="vs-badge">VS</div>
        <div>
          <label style="font-size:12px;color:var(--ash);display:block;margin-bottom:6px;">词条 B：</label>
          <input type="text" class="idiom-input" id="reportInputB" value="${esc(reportB)}" placeholder="输入词条 B，如：刻舟求剑" />
        </div>
      </div>
      <div style="text-align:center;margin-bottom:14px;">
        <button class="btn-search" id="btnGenerateReport" style="padding:12px 36px;">生成演化对比报告</button>
      </div>
      <div class="preset-chips">
        <span style="color:var(--ash);">推荐典范词条：</span>
        ${presets.map(p => `<button class="chip" data-report-idiom="${p}">${p}</button>`).join('')}
      </div>
      <p class="report-hint">提示：内置词条（守株待兔 / 刻舟求剑 / 卧薪尝胆 / 破釜沉舟）含完整考据；其余为生成条目，报告将明确标注缺失字段。</p>
    </section>
  `;
}

function renderReportResult(report: SemanticEvolutionReport): string {
  const a = report.idiomA;
  const b = report.idiomB;
  const timeStr = new Date(report.generatedAt).toLocaleString('zh-CN');
  return `
    <section class="report-result">
      <div class="report-toolbar">
        <button class="btn-tool btn-reselect" id="btnReselect">↺ 重新选择词条</button>
        <div class="export-group">
          <span class="export-label">导出报告：</span>
          <button class="btn-tool btn-export" data-export="md">Markdown</button>
          <button class="btn-tool btn-export" data-export="json">JSON</button>
        </div>
      </div>

      <div class="report-meta-card">
        <div class="report-meta-idioms">
          <div class="meta-idiom">
            <span class="meta-idiom-label">词条 A</span>
            <span class="meta-idiom-name">《${esc(a.idiom)}》</span>
            <span class="meta-idiom-pinyin">${esc(a.pinyin)}</span>
          </div>
          <div class="meta-vs">VS</div>
          <div class="meta-idiom">
            <span class="meta-idiom-label">词条 B</span>
            <span class="meta-idiom-name">《${esc(b.idiom)}》</span>
            <span class="meta-idiom-pinyin">${esc(b.pinyin)}</span>
          </div>
        </div>
        <div class="report-meta-footer">
          <span class="meta-time">生成时间：${esc(timeStr)}</span>
          <span class="meta-confidence confidence-${report.overallConfidence}">整体可信度：${report.overallConfidence}</span>
        </div>
        ${
          report.missingFields.length > 0
            ? `
          <div class="report-missing-banner">
            <span class="missing-banner-icon">⚠</span>
            <span>本报告有 <strong>${report.missingFields.length}</strong> 个字段因考据数据缺失而明确标注：<strong>${report.missingFields.join('、')}</strong>。相关结论仅供参考。</span>
          </div>
          `
            : `
          <div class="report-complete-banner">
            <span>✓ 本报告全部字段均有考据或推演依据，无缺失字段。</span>
          </div>
          `
        }
      </div>

      <div class="report-sections">
        ${renderSection(report.sections.ancestral, 0)}
        ${renderSection(report.sections.divergence, 1)}
        ${renderSection(report.sections.modern, 2)}
      </div>
    </section>
  `;
}

export function renderEvolutionReport(
  container: HTMLElement,
  report: SemanticEvolutionReport | null,
  presets: string[],
  reportA: string,
  reportB: string,
  handlers: ReportUIHandlers
) {
  container.innerHTML = report ? renderReportResult(report) : renderSelection(presets, reportA, reportB);

  if (!report) {
    const inputA = container.querySelector('#reportInputA') as HTMLInputElement;
    const inputB = container.querySelector('#reportInputB') as HTMLInputElement;
    const generate = () => {
      const va = inputA.value.trim();
      const vb = inputB.value.trim();
      if (va && vb) handlers.onGenerateReport(va, vb);
      else alert('请输入需要对比的两个词条');
    };
    container.querySelector('#btnGenerateReport')?.addEventListener('click', generate);
    inputA?.addEventListener('keydown', e => { if (e.key === 'Enter') generate(); });
    inputB?.addEventListener('keydown', e => { if (e.key === 'Enter') generate(); });

    container.querySelectorAll('[data-report-idiom]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idiom = btn.getAttribute('data-report-idiom');
        if (idiom) {
          // 若 A 为空则填入 A，否则填入 B
          if (!inputA.value.trim() || inputA.value.trim() === reportA) {
            inputA.value = idiom;
          } else {
            inputB.value = idiom;
          }
        }
      });
    });
  } else {
    container.querySelector('#btnReselect')?.addEventListener('click', () => handlers.onReselect());
    container.querySelectorAll('[data-export]').forEach(btn => {
      btn.addEventListener('click', () => {
        const fmt = btn.getAttribute('data-export') as 'md' | 'json';
        handlers.onExport(fmt);
      });
    });
  }
}
