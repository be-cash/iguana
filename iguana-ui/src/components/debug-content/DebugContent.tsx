import React from 'react';
import { RootState } from "../../state/rootstate"
import { connect, ConnectedProps } from "react-redux"
import Transaction from '../transaction/Transaction';
import TransactionInput from '../transaction/TransactionInput';

const mapState = (state: RootState) => ({
  selectedMainPanel: state.selectedMainPanel,
  selectedTransactionUid: state.selectedTransactionUid,
  selectedInputIdx: state.selectedInputIdx,
  transactions: state.transactions,
})

const connector = connect(mapState)

type PropsFromRedux = ConnectedProps<typeof connector>

type Props = PropsFromRedux & {}

const DebugContent = (props: Props) => {
  switch (props.selectedMainPanel) {
    case 'settings':
      return <div>Settings</div>;
    case 'transaction':
      if (props.selectedTransactionUid === undefined)
        return <span>No transaction selected</span>;
      const transaction = props.transactions.get(props.selectedTransactionUid);
      if (transaction === undefined)
        return <span>Invalid transaction selected</span>;
      return <Transaction transaction={transaction} uid={props.selectedTransactionUid} />;
    default:
      return <div>Invalid panel</div>;
  }
}

export default connector(DebugContent)
