import React, { forwardRef, useRef, useCallback, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';

import TurboCell from './TurboCell';

const TurboContainer = forwardRef(function TurboContainer(props, ref) {
  const containerRef = useRef();
  const cellMeasureHeightMap = useRef(new Map());

  useImperativeHandle(ref, () => ({
    measureTop() {
      return containerRef.current.getBoundingClientRect().top;
    },

    /**
     * 获取列表中各个成员的高度
     *
     * @returns {Object} 各个成员的高度
     */
    getItemHeights() {
      return props.list.reduce((heights, itemKey) => {
        const cellMeasureHeight = cellMeasureHeightMap.current.get(itemKey);

        if (cellMeasureHeight) {
          const height = cellMeasureHeight();
          if (height !== null) {
            heights[itemKey] = height;
          }
        }

        return heights;
      }, {});
    },
  }));

  const setCellMeasureHeight = useCallback((key, measureHeight) => {
    if (measureHeight) {
      cellMeasureHeightMap.current.set(key, measureHeight);
    } else {
      cellMeasureHeightMap.current.delete(key);
    }
  });

  const { list, renderItem, blankSpaceAbove, blankSpaceBelow } = props;

  const style = {
    paddingTop: blankSpaceAbove,
    paddingBottom: blankSpaceBelow,
  };

  return (
    <div ref={containerRef} style={style}>
      {list.map(itemKey => (
        <TurboCell
          id={itemKey}
          key={itemKey}
          render={renderItem}
          setMeasureHeight={setCellMeasureHeight} />
      ))}
    </div>
  );
});

TurboContainer.propTypes = {
  list: PropTypes.array.isRequired,
  renderItem: PropTypes.func.isRequired,
  blankSpaceAbove: PropTypes.number.isRequired,
  blankSpaceBelow: PropTypes.number.isRequired,
};

export default TurboContainer;
