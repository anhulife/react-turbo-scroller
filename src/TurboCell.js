import React from 'react';
import PropTypes from 'prop-types';

class TurboCell extends React.Component {
  shouldComponentUpdate(nextProps) {
    return nextProps.id !== this.props.id || nextProps.render !== this.props.render;
  }

  componentDidUpdate(prevProps) {
    // 如果 id 更改了，需要注销之前的引用
    if (prevProps.id !== this.props.id) {
      this.props.setRef(prevProps.id, undefined);
    }

    // 设置当前的引用
    this.props.setRef(this.props.id, this);
  }

  /**
   * 获取高度
   *
   * @returns {Number} 高度
   */
  measureHeight() {
    return this._element ? this._element.getBoundingClientRect().height : 0;
  }

  _setRef(ref) {
    if (ref) {
      // 当挂接到 DOM 上之后，就更新引用
      this._element = ref;
      this.props.setRef(this.props.id, this);
    } else {
      this._element = undefined;
      this.props.setRef(this.props.id, undefined);
    }
  }

  render() {
    return (
      <div ref={this._setRef.bind(this)}>
        {this.props.render(this.props.id)}
      </div>
    );
  }
}

TurboCell.propTypes = {
  render: PropTypes.func.isRequired,
  setRef: PropTypes.func.isRequired,
  id: PropTypes.any.isRequired,
};

export default TurboCell;
