import { IdiomProfile, SemanticEvolutionReport } from '../core/models';

export interface EvolutionReportPort {
  buildReport(a: IdiomProfile, b: IdiomProfile): SemanticEvolutionReport;
}
