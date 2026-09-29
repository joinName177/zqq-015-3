import { IdiomProfile, SemanticEvolutionReport } from '../core/models';
import { buildEvolutionReport } from '../core/etymology-engine';
import { EvolutionReportPort } from '../ports/evolution-report.port';

export class EvolutionReportAdapter implements EvolutionReportPort {
  buildReport(a: IdiomProfile, b: IdiomProfile): SemanticEvolutionReport {
    return buildEvolutionReport(a, b);
  }
}
