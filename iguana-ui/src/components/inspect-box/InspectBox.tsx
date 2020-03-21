import React from 'react';
import { RootState } from "../../state/rootstate";
import { connect, ConnectedProps } from "react-redux";
import { Drawer, Tooltip, Button } from "antd";
import { ScriptError, ByteArray } from "iguana-lib";
import { SearchOutlined, UpCircleOutlined, DownCircleOutlined } from '@ant-design/icons';
import { COMPARE_BYTE_ARRAYS, EXPAND_INSPECT_BOX, SELECT_COMPARED_BYTE_ARRAY } from './actions';
import { makeAction } from '../../state/rootaction';
import { ByteArrayDisplay } from './ByteArrayDisplay';
import * as diff from 'diff';
import * as hex from 'hex-string';
import './InspectBox.css';

interface PropsFromReact {
  error: ScriptError | undefined,
}

const mapState = (state: RootState, p: PropsFromReact) => ({
  inspectState: state.inspectState,
})

const mapDispatch = {
  compareArrays: (byteArrayA: ByteArray | undefined, byteArrayB: ByteArray | undefined) => makeAction({
    type: COMPARE_BYTE_ARRAYS,
    byteArrayA, byteArrayB,
  }),
  selectComparedArray: (byteArray: ByteArray, side: 'A' | 'B') => makeAction({
    type: SELECT_COMPARED_BYTE_ARRAY,
    byteArray,
    side,
  }),
  expand: () => makeAction({
    type: EXPAND_INSPECT_BOX,
    isExpanded: true,
  }),
  collapse: () => makeAction({
    type: EXPAND_INSPECT_BOX,
    isExpanded: false,
  }),
}

const connector = connect(mapState, mapDispatch)
type PropsFromRedux = ConnectedProps<typeof connector>
type Props = PropsFromRedux & PropsFromReact

const InspectBox = ({error, inspectState, expand, collapse, selectComparedArray, compareArrays}: Props) => {
  let height = '100px';
  let msg = undefined;
  const { isExpanded } = inspectState;
  const expandButton = <Button
    type="primary"
    shape="circle"
    icon={isExpanded ? <DownCircleOutlined /> : <UpCircleOutlined />}
    onClick={() => {
      isExpanded ? collapse() : expand();
    }}
  />;
  if (error === undefined) {
    height = '70px'
    msg = <span>Script executed without errors. {expandButton}</span>;
  } else {
    const arrayA = error.firstArray()
    const arrayB = error.secondArray()
    msg = <h3>
      Script error: {error.title()} &nbsp;
      <Tooltip title="compare">
        <Button
          type="primary"
          shape="circle"
          icon={<SearchOutlined />}
          disabled={(arrayA || arrayB) === undefined}
          onClick={() => {
            expand();
            compareArrays(arrayA, arrayB);
          }}
        />
      </Tooltip>
      &nbsp;
      {expandButton}
    </h3>
  }
  
  if (isExpanded) {
    height = `${window.innerHeight - 200}px`;
  }

  let comparison = undefined;
  if (inspectState.compareArrayA && inspectState.compareArrayB) {
    const dataA = inspectState.compareArrayA.data() as any as number[];
    const dataB = inspectState.compareArrayB.data() as any as number[];
    const changes = diff.diffArrays(dataA, dataB);
    comparison = [];
    const changesA: JSX.Element[] = [];
    const changesB: JSX.Element[] = [];
    let widthA = 0;
    let widthB = 0;
    changes.forEach((change, idx) => {
      const value = hex.encode(change.value as any as Uint8Array);
      const len = value.length;
      if (change.added) {
        changesA.push(<span className="diff-added" key={idx}>{value}</span>);
        widthA += len;
      } else if (change.removed) {
        changesB.push(<span className="diff-removed" key={idx}>{value}</span>);
        widthB += len;
      } else {
        changesA.push(<span className="diff-unchanged" key={idx}>{value}</span>);
        changesB.push(<span className="diff-unchanged" key={idx}>{value}</span>);
        widthA += len;
        widthB += len;
      }
    });
    const width = Math.max(widthA, widthB) + 1;
    comparison = <div className="code-font">
      <div style={{width: `${width}ch`}}>
        <h3>Diff between {inspectState.compareArrayA.name() || '<unknown>'} and {inspectState.compareArrayB.name() || '<unknown>'}:</h3>
        <div>{changesA}</div>
        <div>{changesB}</div>
      </div>
    </div>
  }

  return <div style={{height}}>
    <Drawer
      placement="bottom"
      height={height}
      visible={true}
      mask={false}
      onClose={collapse}
    >
      {msg}
      {comparison}
      {inspectState.compareArrayA ?
        <ByteArrayDisplay byteArray={inspectState.compareArrayA} selectComparedArray={selectComparedArray} title="A" /> :
        undefined}
      <div style={{clear: 'both'}}></div>
      {inspectState.compareArrayB ?
        <ByteArrayDisplay byteArray={inspectState.compareArrayB} selectComparedArray={selectComparedArray} title="B" /> :
        undefined}
    </Drawer>
  </div>
}

export default connector(InspectBox)
