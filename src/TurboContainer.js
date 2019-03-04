import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

import TurboCell from './TurboCell';

class TurboContainer extends React.PureComponent {
  constructor(props) {
    super(props);

    this._cells = new Map();

    this._view = React.createRef();
  }

  render() {
    const { blankSpaceAbove, blankSpaceBelow } = this.props;

    const style = {
      paddingTop: blankSpaceAbove,
      paddingBottom: blankSpaceBelow,
    };

    return (
      <div
        ref={this._view}
        style={style}>
        {this._renderContent()}
      </div>
    );
  }

  getWrapperNode() {
    return ReactDOM.findDOMNode(this);
  }

  /**
   * 获取列表中各个成员的高度
   *
   * @returns {Object} 各个成员的高度
   */
  getItemHeights() {
    return this.props.list.reduce((heights, itemKey) => {
      const cell = this._cells.get(itemKey);

      heights[itemKey] = cell ? cell.measureHeight() : 0;

      return heights;
    }, {});
  }

  _renderContent() {
    const { list, renderItem } = this.props;

    return list.map(itemKey => (
      <TurboCell
        id={itemKey}
        key={itemKey}
        render={renderItem}
        setRef={this._setCellRef.bind(this)} />
    ));
  }

  _setCellRef(key, ref) {
    if (ref) {
      this._cells.set(key, ref);
    } else {
      this._cells.delete(key);
    }
  }
}

TurboContainer.propTypes = {
  list: PropTypes.array.isRequired,
  renderItem: PropTypes.func.isRequired,
  blankSpaceAbove: PropTypes.number.isRequired,
  blankSpaceBelow: PropTypes.number.isRequired,
};

export default TurboContainer;