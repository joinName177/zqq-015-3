import { EvolutionComparisonReport, IdiomProfile } from '../core/models';
import { buildEvolutionComparisonReport } from '../core/evolution-report-engine';
import { EvolutionReportPort } from '../ports/evolution-report.port';

export class EvolutionReportAdapter implements EvolutionReportPort {
  generateReport(a: IdiomProfile, b: IdiomProfile): EvolutionComparisonReport {
    return buildEvolutionComparisonReport(a, b);
  }
}
