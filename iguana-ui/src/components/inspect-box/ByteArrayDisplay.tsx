import React from 'react';
import { ByteArray } from 'iguana-lib';
import { Map } from 'immutable';
import './ByteArrayDisplay.css';
import { Popover, Button } from 'antd';
import { breakString } from '../transaction/data'

const colors = [
  ['#001f3f', '#80bfff'], // Navy 
  ['#0074D9', '#b3dbff'], // Blue 
  ['#7FDBFF', '#004966'], // Aqua 
  ['#39CCCC', '#111111'], // TEAL 
  ['#3D9970', '#163728'], // OLIVE 
  ['#2ECC40', '#0e3e14'], // GREEN 
  ['#01FF70', '#00662c'], // LIME 
  ['#FFDC00', '#665800'], // YELLOW 
  ['#FF851B', '#663000'], // ORANGE 
  ['#FF4136', '#800600'], // RED 
  ['#85144b', '#eb7ab1'], // MAROON 
  ['#F012BE', '#65064f'], // FUCHSIA 
  ['#B10DC9', '#efa9f9'], // PURPLE 
  ['#111111', '#ddd'], // BLACK 
  ['#AAAAAA', '#111111'], // GRAY 
  ['#DDDDDD', '#111111'], // SILVER 
]

interface State {
  expanded: Map<number, boolean>,
}

interface Props {
  byteArray: ByteArray,
  selectComparedArray: (byteArray: ByteArray, side: 'A' | 'B') => void,
  isChild?: boolean,
  parentColorIdx?: number,
  title?: string,
}

export class ByteArrayDisplay extends React.Component<Props, State> {
  state = {
    expanded: Map<number, boolean>(),
  };

  expand = (idx: number, isExpanded: boolean) => {
    this.setState({expanded: this.state.expanded.set(idx, isExpanded)})
  };

  render(): React.ReactNode {
    const nodes: JSX.Element[] = [];
    const { isChild, byteArray, selectComparedArray, title } = this.props;
    console.log('render', this.state.expanded.toJS());

    if (isChild && !byteArray.hasPreimage()) {
      return <div></div>
    }

    const byteArrayHex = byteArray.hex();

    const preimages = isChild ? byteArray.preimages() : [byteArray];
    
    preimages.forEach((preimage: ByteArray, idx: number) => {
      const hex = preimage.hex();
      const name = preimage.name();
      const nameSpan = name ? <span>{name}</span> : <span className="byte-array-unnamed">&lt;unnamed&gt;</span>
      const func = preimage.function();
      const parentColorIdx = this.props.parentColorIdx || 0;
      const colorIdx = (idx + parentColorIdx) % colors.length;
      const [backgroundColor, color] = colors[colorIdx];
      const isExpanded = this.state.expanded.get(
        idx,
        preimage.hasPreimage() ?
          preimage.preimages()
            .map((preimageArray: ByteArray) => preimageArray.len())
            .reduce((a, b) => a + b) <= preimage.len() :
          true,
      );
      const dataHex = breakString(hex, 77);
      const dataHexDump = preimage.hexdump();
      nodes.push(
        <div className="preimage" key={idx} style={{width: `${hex.length}ch`, float: 'left', backgroundColor, color}}>
          <Popover
            placement="topLeft"
            content={
              <div className="byte-array-popover">
                <h4>
                  {nameSpan}: {func} &nbsp;
                  <Button onClick={() => selectComparedArray(preimage, 'A')}>A</Button>
                  &nbsp;
                  <Button onClick={() => selectComparedArray(preimage, 'B')}>B</Button>
                </h4>
                <pre>{dataHex}</pre>
                <hr />
                <pre>{dataHexDump}</pre>
              </div>
            }
          >
            <div onClick={() => this.expand(idx, !isExpanded)} style={{cursor: preimage.hasPreimage() ? 'pointer' : 'default'}}>
              <div className="preimage-name" style={{whiteSpace: 'nowrap'}}>{nameSpan}</div>
              <div className="preimage-data">{hex}</div>
            </div>
          </Popover>
          {isExpanded ?
            <div className="preimage-child">
              <ByteArrayDisplay
                byteArray={preimage}
                isChild={true}
                parentColorIdx={colorIdx}
                selectComparedArray={selectComparedArray}
              />
            </div> :
            undefined}
        </div>
      );
    });

    return <div className="byte-array" style={{width: `${byteArrayHex.length}ch`}}>
      {!isChild ? <h3>
        {title ? title + ': ' : undefined}
        {byteArray.name()}
      </h3> : undefined}
      {nodes}
    </div>
  }

}
