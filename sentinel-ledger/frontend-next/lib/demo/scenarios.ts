import { scenario01 } from './data/scenario-01-clean-salary';
import { scenario02 } from './data/scenario-02-structuring';
import { scenario03 } from './data/scenario-03-mixer';
import { scenario04 } from './data/scenario-04-sanctions';
import { scenario05 } from './data/scenario-05-layering';
import { scenario06 } from './data/scenario-06-wash-trading';
import { scenario07 } from './data/scenario-07-injection';
import { scenario08 } from './data/scenario-08-jurisdiction';
import { scenario09 } from './data/scenario-09-new-wallet';
import { scenario10 } from './data/scenario-10-velocity-spike';
import type { ScenarioScript } from './types';

export const SCENARIOS: ScenarioScript[] = [
  scenario01,
  scenario02,
  scenario03,
  scenario04,
  scenario05,
  scenario06,
  scenario07,
  scenario08,
  scenario09,
  scenario10,
];

export type { ScenarioScript };
