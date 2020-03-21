import { Tx, ECC, ByteArray } from "iguana-lib";

export const WASM_READY = 'WASM_READY';
export interface WasmReadyAction {
  type: typeof WASM_READY,
}

export const INIT_ECC = 'INIT_ECC';
export interface InitEccAction {
  type: typeof INIT_ECC,
  ecc: ECC,
}

export const UPDATE_TRANSACTION = 'UPDATE_TRANSACTION';
export interface UpdateTransactionAction {
  type: typeof UPDATE_TRANSACTION,
  uid: number,
  tx: Tx,
}

export const NEW_WEB_SOCKET_TRANSACTION = 'NEW_WEB_SOCKET_TRANSACTION';
export interface NewWebSocketTransactionAction {
  type: typeof NEW_WEB_SOCKET_TRANSACTION,
  name: string | undefined,
  url: string,
}

export const ADD_WEB_SOCKET_TRANSACTION = 'ADD_WEB_SOCKET_TRANSACTION';
export interface AddWebSocketTransactionAction {
  type: typeof ADD_WEB_SOCKET_TRANSACTION,
  uid: number,
  name: string | undefined,
  url: string,
}

export const CONNECT_WEB_SOCKET_TRANSACTION = 'CONNECT_WEB_SOCKET_TRANSACTION';
export interface ConnectWebSocketTransactionAction {
  type: typeof CONNECT_WEB_SOCKET_TRANSACTION,
  uid: number,
}

export const REMOVE_TRANSACTION = 'REMOVE_TRANSACTION';
export interface RemoveTransactionAction {
  type: typeof REMOVE_TRANSACTION,
  uid: number,
}

export type TransactionAction = WasmReadyAction
                              | InitEccAction
                              | UpdateTransactionAction
                              | NewWebSocketTransactionAction
                              | AddWebSocketTransactionAction
                              | ConnectWebSocketTransactionAction
                              | RemoveTransactionAction;
