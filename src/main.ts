import './ui/styles.css';
import { DictionaryAdapter } from './adapters/dictionary.adapter';
import { KinshipAdapter } from './adapters/kinship.adapter';
import { EvolutionReportAdapter } from './adapters/evolution-report.adapter';
import { IdiomProfile, KinshipResult, SemanticEvolutionReport } from './core/models';
import { reportToMarkdown, reportToJson } from './core/etymology-engine';
import { renderIdiomApp } from './ui/app';

const dictAdapter = new DictionaryAdapter();
const kinshipAdapter = new KinshipAdapter();
const reportAdapter = new EvolutionReportAdapter();

let currentMode: 'single' | 'compare' | 'report' = 'single';
let currentProfile: IdiomProfile;
let compareA = '守株待兔';
let compareB = '刻舟求剑';
let kinshipResult: KinshipResult | null = null;

// 语义演化报告状态
let report: SemanticEvolutionReport | null = null;
let reportA = '守株待兔';
let reportB = '刻舟求剑';

const rootEl = document.getElementById('app')!;

async function init() {
  currentProfile = await dictAdapter.getProfile('守株待兔');
  const profA = await dictAdapter.getProfile(compareA);
  const profB = await dictAdapter.getProfile(compareB);
  kinshipResult = kinshipAdapter.compareIdioms(profA, profB);
  refreshView();
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
    },
    report,
    reportA,
    reportB,
    {
      onGenerateReport: async (textA: string, textB: string) => {
        reportA = textA;
        reportB = textB;
        const pA = await dictAdapter.getProfile(textA);
        const pB = await dictAdapter.getProfile(textB);
        report = reportAdapter.buildReport(pA, pB);
        refreshView();
      },
      onReselect: () => {
        report = null;
        refreshView();
      },
      onExport: (format: 'md' | 'json') => {
        if (!report) return;
        const stamp = new Date(report.generatedAt).toISOString().slice(0, 10);
        if (format === 'md') {
          downloadFile(`语义演化对比报告_${report.idiomA.idiom}_vs_${report.idiomB.idiom}_${stamp}.md`, reportToMarkdown(report), 'text/markdown');
        } else {
          downloadFile(`语义演化对比报告_${report.idiomA.idiom}_vs_${report.idiomB.idiom}_${stamp}.json`, reportToJson(report), 'application/json');
        }
      }
    }
  );
}

init();
