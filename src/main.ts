import './ui/styles.css';
import { DictionaryAdapter } from './adapters/dictionary.adapter';
import { KinshipAdapter } from './adapters/kinship.adapter';
import { EvolutionReportAdapter } from './adapters/evolution-report.adapter';
import { EvolutionComparisonReport, IdiomProfile, KinshipResult } from './core/models';
import { renderIdiomApp } from './ui/app';
import { renderReportMode } from './ui/report-view';
import { downloadTextFile, reportFilename, reportToMarkdown, reportToStandaloneHtml } from './core/report-export';

const dictAdapter = new DictionaryAdapter();
const kinshipAdapter = new KinshipAdapter();
const reportAdapter = new EvolutionReportAdapter();

let currentMode: 'single' | 'compare' | 'report' = 'single';
let currentProfile: IdiomProfile;
let compareA = '守株待兔';
let compareB = '刻舟求剑';
let kinshipResult: KinshipResult | null = null;

// 语义演化对比报告状态
let reportResult: EvolutionComparisonReport | null = null;
let reportDraftA = '守株待兔';
let reportDraftB = '刻舟求剑';
let reportError: string | null = null;

const rootEl = document.getElementById('app')!;

async function init() {
  currentProfile = await dictAdapter.getProfile('守株待兔');
  const profA = await dictAdapter.getProfile(compareA);
  const profB = await dictAdapter.getProfile(compareB);
  kinshipResult = kinshipAdapter.compareIdioms(profA, profB);
  refreshView();
}

function refreshView() {
  renderIdiomApp(
    rootEl,
    currentProfile,
    dictAdapter.getPresets(),
    currentMode,
    kinshipResult,
    compareA,
    compareB,
    {
      onSearch: async (text: string) => {
        currentProfile = await dictAdapter.getProfile(text);
        kinshipResult = null;
        refreshView();
      },
      onCompare: async (textA: string, textB: string) => {
        compareA = textA;
        compareB = textB;
        const pA = await dictAdapter.getProfile(textA);
        const pB = await dictAdapter.getProfile(textB);
        kinshipResult = kinshipAdapter.compareIdioms(pA, pB);
        refreshView();
      },
      onSwitchMode: (mode: 'single' | 'compare' | 'report') => {
        currentMode = mode;
        refreshView();
      }
    }
  );

  if (currentMode === 'report') {
    const slot = rootEl.querySelector('#reportModeSlot');
    if (slot) {
      renderReportMode(
        slot as HTMLElement,
        dictAdapter.getPresets(),
        reportResult,
        reportDraftA,
        reportDraftB,
        reportError,
        {
          onGenerate: async (a: string, b: string) => {
            if (!a || !b) {
              reportError = '请先填写两个词条后再生成报告。';
              refreshView();
              return;
            }
            if (a === b) {
              reportError = '对比报告需要两个不同的词条，词条 A 与词条 B 不能相同。';
              refreshView();
              return;
            }
            reportError = null;
            reportDraftA = a;
            reportDraftB = b;
            const pA = await dictAdapter.getProfile(a);
            const pB = await dictAdapter.getProfile(b);
            reportResult = reportAdapter.generateReport(pA, pB);
            refreshView();
          },
          onReselect: () => {
            // 回到选择页，保留上一次输入，便于微调重选
            reportResult = null;
            reportError = null;
            refreshView();
          },
          onExportMarkdown: () => {
            if (!reportResult) return;
            downloadTextFile(reportFilename(reportResult, 'md'), reportToMarkdown(reportResult), 'text/markdown');
          },
          onExportHtml: () => {
            if (!reportResult) return;
            downloadTextFile(reportFilename(reportResult, 'html'), reportToStandaloneHtml(reportResult), 'text/html');
          }
        }
      );
    }
  }
}

init();
