import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import { createEpicMiddleware } from 'redux-observable'
import { reduce } from './state/rootreducer';
import { epic } from './state/rootepic';
import { RootAction, INIT } from './state/rootaction';
import { RootState } from './state/rootstate';
import { NEW_WEB_SOCKET_TRANSACTION, WASM_READY } from './components/transaction/actions';
import { ready } from 'iguana-lib';

const epicMiddleware = createEpicMiddleware<RootAction, RootAction, RootState>();
const store = createStore(
    reduce,
    applyMiddleware(epicMiddleware),
);
epicMiddleware.run(epic);

store.dispatch({type: INIT});
store.dispatch({type: NEW_WEB_SOCKET_TRANSACTION, name: 'tx', url: 'ws://127.0.0.1:3030/tx'});
ready.then(() => store.dispatch({type: WASM_READY}), console.error);

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root'),
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
