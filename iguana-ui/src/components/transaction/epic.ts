import { Observable, of, merge, empty } from "rxjs";
import { webSocket } from "rxjs/webSocket";
import { flatMap, filter, map, ignoreElements, catchError, takeWhile, first, mapTo, delay } from "rxjs/operators";
import { StateObservable, combineEpics, ofType } from "redux-observable";
import { RootState } from "../../state/rootstate";
import { RootAction, GEN_UID, makeAction, INIT } from "../../state/rootaction";
import { ADD_WEB_SOCKET_TRANSACTION, NEW_WEB_SOCKET_TRANSACTION, NewWebSocketTransactionAction, AddWebSocketTransactionAction, REMOVE_TRANSACTION, RemoveTransactionAction, CONNECT_WEB_SOCKET_TRANSACTION, ConnectWebSocketTransactionAction, WASM_READY, INIT_ECC, UPDATE_TRANSACTION } from "./actions";
import { ECC, Tx } from "iguana-lib";
import { notification } from "antd";

function initEccEpic(action$: Observable<RootAction>, state$: StateObservable<RootState>): Observable<RootAction> {
  return action$.pipe(
    ofType(WASM_READY),
    map(() => {
      const ecc = new ECC();
      return makeAction({type: INIT_ECC, ecc});
    })
  )
}

function newWebSocketEpic(action$: Observable<RootAction>, state$: StateObservable<RootState>): Observable<RootAction> {
  return action$.pipe(
    ofType<RootAction, NewWebSocketTransactionAction>(NEW_WEB_SOCKET_TRANSACTION),
    flatMap(action => {
      return of(
        makeAction({type: GEN_UID}),
        makeAction({...action, type: ADD_WEB_SOCKET_TRANSACTION, uid: state$.value.lastUid}),
      )
    }),
  )
}

function addWebSocketEpic(action$: Observable<RootAction>, state$: StateObservable<RootState>): Observable<RootAction> {
  return action$.pipe(
    ofType<RootAction, AddWebSocketTransactionAction>(ADD_WEB_SOCKET_TRANSACTION),
    map(action => makeAction({type: CONNECT_WEB_SOCKET_TRANSACTION, uid: action.uid})),
  )
}

function webSocketEpic(action$: Observable<RootAction>, state$: StateObservable<RootState>): Observable<RootAction> {
  return action$.pipe(
    ofType<RootAction, ConnectWebSocketTransactionAction>(CONNECT_WEB_SOCKET_TRANSACTION),
    flatMap(action => {
      if (state$.value.isWasmReady)
        return of(action)
      return action$.pipe(
        ofType(WASM_READY),
        first(),
        mapTo(action),
      )
    }),
    flatMap(action => {
      const transaction = state$.value.transactions.get(action.uid);
      if (transaction === undefined) {
        console.error('Tried connecting to non-existing transaction with uid', action.uid);
        return empty();
      }
      if (transaction.source.type != 'websocket') {
        console.error('Tried connecting to non-websocket transaction', transaction.toJS());
        return empty();
      }
      const ws = webSocket({
        url: transaction.source.url,
        deserializer: msg => msg.data,
      });
      return merge(
        action$.pipe(
          ofType<RootAction, RemoveTransactionAction>(REMOVE_TRANSACTION),
          takeWhile(() => !ws.closed),
          filter(removeAction => action.uid == removeAction.uid),
          map(ws.complete),
          ignoreElements(),
        ),
        ws.pipe(
          flatMap(msg => {
            const tx = Tx.fromJson(msg);
            notification.open({
              message: 'Transaction updated',
              description: `New transaction hash: ${tx.hashHex()}`,
            });
            return of(makeAction({
              type: UPDATE_TRANSACTION,
              uid: action.uid,
              tx,
            }));
          }),
          catchError(err => {
            console.error(err);
            return of(
              makeAction({
                type: CONNECT_WEB_SOCKET_TRANSACTION,
                uid: action.uid,
              })
            ).pipe(
              delay(1500),
            );
          }),
        ),
      );
    }),
  )
}

export const epic = combineEpics(
  initEccEpic,
  newWebSocketEpic,
  addWebSocketEpic,
  webSocketEpic,
);
