import { EvolutionComparisonReport, IdiomProfile } from '../core/models';

export interface EvolutionReportPort {
  generateReport(a: IdiomProfile, b: IdiomProfile): EvolutionComparisonReport;
}
