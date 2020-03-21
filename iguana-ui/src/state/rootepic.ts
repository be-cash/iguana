import { combineEpics } from "redux-observable";
import * as tx from '../components/transaction/epic';

export const epic = combineEpics(
  tx.epic,
)
