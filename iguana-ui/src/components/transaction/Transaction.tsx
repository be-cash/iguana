import * as React from 'react';
import { Menu } from 'antd';
import { connect, ConnectedProps } from 'react-redux';
import { RootState } from '../../state/rootstate';
import { Transaction } from './state';
import { RootAction } from '../../state/rootaction';
import { SELECT_TRANSACTION } from '../side-menu/actions';
import { Dispatch } from 'redux';
import TransactionInput from './TransactionInput';
import { Range } from 'immutable';
import InspectBox from '../inspect-box/InspectBox';


interface PropsFromReact {
  uid: number,
  transaction: Transaction,
}

const mapState = (state: RootState, p: PropsFromReact) => ({
  selectedInputIdx: state.selectedInputIdx,
});

const mapDispatch = (dispatch: Dispatch<RootAction>, p: PropsFromReact) => ({
  selectOverview: () => dispatch({
    type: SELECT_TRANSACTION,
    selectedTransactionUid: p.uid,
    selectedInputIdx: undefined,
  }),
  selectInput: (inputIdx: number) => dispatch({
    type: SELECT_TRANSACTION,
    selectedTransactionUid: p.uid,
    selectedInputIdx: inputIdx,
  }),
});

const connector = connect(mapState, mapDispatch)

type PropsFromRedux = ConnectedProps<typeof connector>

type Props = PropsFromRedux & PropsFromReact

const Transaction = (props: Props) => {
  if (props.transaction.tx === undefined)
    return <span>Loading...</span>;
  if (props.selectedInputIdx === undefined) {
    return <div>
      <h1>Overview of {props.transaction.tx.hashHex()}</h1>
    </div>
  } else {
    const input = props.transaction.inputs.get(props.selectedInputIdx);
    if (input === undefined)
      return <span>Invalid input selected</span>
    return <div>
      <h1>Input #{props.selectedInputIdx}</h1>
      <TransactionInput input={input} />
      <InspectBox error={input.error} />
    </div>
  }
}

export default connector(Transaction)
