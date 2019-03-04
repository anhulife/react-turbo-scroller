import React from 'react';
import PropTypes from 'prop-types';
import debounce from 'lodash.debounce';

import TurboContainer from './TurboContainer';

const DEFAULT_HEIGHT_CACHE = {};

function delayExecFunc(func, delay) {
  let delayHandler = null;

  function execFunc() {
    delayHandler = null;
    func();
  }

  return function () {
    if (!delayHandler) {
      delayHandler = delay(execFunc);
    }

    return delayHandler;
  };
}

class TurboScroller extends React.Component {
  constructor(props) {
    super(props);

    const {
      list,
      initialItemIndex,
      cacheKey,
      heightCache,
    } = this.props;

    this._heights = cacheKey ? heightCache[cacheKey] || {} : {};

    this.state = this._getDefaultSlice(list, initialItemIndex);

    this._turboContainer = React.createRef();

    this._criticalUpdateInAnimationFrame = delayExecFunc(this._criticalUpdate.bind(this), window.requestAnimationFrame);

    this._scheduleUpdate = window.requestIdleCallback ?
      delayExecFunc(this._criticalUpdate.bind(this), window.requestIdleCallback) :
      this._criticalUpdateInAnimationFrame;

    this._schedulePositioningNotification = delayExecFunc(this._notifyPositioning.bind(this), window.requestIdleCallback ? function(execFunc) {
      return window.requestIdleCallback(execFunc, {
        timeout: 500,
      });
    }
    : window.requestAnimationFrame);

    this._handleScroll = debounce(this._criticalUpdateInAnimationFrame, 100, {
      trailing: true,
      maxWait: 100,
    });
  }

  componentDidMount() {
    // 监听视窗的滚动事件
    this._unlistenScroll = this.props.viewport.addScrollListener(this._handleScroll);
    this._postRenderProcessing({
      hasListChanged: true,
    });
  }

  componentWillUnmount() {
    this._unmounted = true;

    // 取消监听滚动
    this._unlistenScroll && this._unlistenScroll();

    const { cacheKey, heightCache } = this.props;

    // 保存高度数据
    if (cacheKey) {
      heightCache[cacheKey] = this._heights;
    }
  }

  componentDidUpdate(nextProps) {
    this._postRenderProcessing({
      hasListChanged: nextProps.list !== this.props.list
    });
  }

  _notifyPositioning() {
    if (!this._unmounted) {
      this.props.onPositioningUpdate(this.getPositioning());
    }
  }

  getPositioning() {
    const { sliceStart, sliceEnd } = this.state;

    return {
        viewportRectangle: this._getRelativeViewportRect(),
        rectangles: this._getRectangles(),
        sliceStart,
        sliceEnd,
    };
  }

  render() {
    const { list, renderItem } = this.props;
    const { sliceStart, sliceEnd } = this.state;
    const { blankSpaceAbove, blankSpaceBelow } = this._computeBlankSpace();
    return (
      <TurboContainer
        ref={this._turboContainer}
        list={list.slice(sliceStart, sliceEnd)}
        blankSpaceAbove={blankSpaceAbove}
        blankSpaceBelow={blankSpaceBelow}
        renderItem={renderItem}
      />
    );
  }

  _getRelativeViewportRect() {
    if (!this._turboContainer.current) {
      return {
        top: 0,
        height: 0,
      };
    }

    const el = this._turboContainer.current.getWrapperNode();
    const top = Math.ceil(el.getBoundingClientRect().top);

    const viewportRect = this.props.viewport.getRect();

    viewportRect.top -= top;

    return viewportRect;
  }

  _getDefaultSlice(list, sliceStart = 0) {
    const viewportHeight = this.props.viewport.getRect().height;

    const rectangles = this._getRectangles({
      ...this.props,
      list,
    });

    const sliceStartBottom = rectangles[list[sliceStart]].bottom;

    let sliceEnd = list.findIndex((itemKey, index) => {
      return index >= sliceStart && rectangles[itemKey].top - sliceStartBottom >= viewportHeight;
    });
    sliceEnd = sliceEnd !== -1 ? sliceEnd : list.length;

    return {
      sliceStart,
      sliceEnd,
    };
  }

  _computeSlice(config) {
    const offscreenToViewportRatio = config.offscreenToViewportRatio;
    const { list } = this.props;

    if (this._unmounted || 0 === list.length) {
      return {};
    }

    const relativeViewportRect = this._getRelativeViewportRect();
    const sliceHeight = relativeViewportRect.height * offscreenToViewportRatio;
    const sliceTop = relativeViewportRect.top - sliceHeight;
    const sliceBottom = relativeViewportRect.top + relativeViewportRect.height + sliceHeight;

    const rectangles = this._getRectangles();

    let sliceStart = list.findIndex(itemKey => rectangles[itemKey].bottom > sliceTop);
    sliceStart = sliceStart !== -1 ? sliceStart : list.length - 1;

    let sliceEnd = list.findIndex((itemKey, index) => {
      return index >= sliceStart && rectangles[itemKey].top >= sliceBottom;
    });
    sliceEnd = sliceEnd !== -1 ? sliceEnd : list.length;

    this._schedulePositioningNotification();

    return {
      sliceStart,
      sliceEnd,
    };
  }

  _getRectangles(props) {
    const { list, assumedHeight } = props || this.props;

    let top = 0;

    return list.reduce((rectangles, itemKey) => {
      const height = this._heights.hasOwnProperty(itemKey) ? this._heights[itemKey] : assumedHeight;

      const rectangle = {
        top,
        height,
        bottom: top + height,
      };

      rectangles[itemKey] = rectangle;

      top = rectangle.bottom;

      return rectangles;
    }, {});
  }

  _computeBlankSpace() {
    const { list } = this.props;
    const { sliceStart, sliceEnd } = this.state;
    const rectangles = this._getRectangles();

    const blankSpaceAbove = 0 === list.length ? 0 : rectangles[list[sliceStart]].top - rectangles[list[0]].top;

    const lastItemKey = list[list.length - 1];

    return {
        blankSpaceAbove,
        blankSpaceBelow: sliceEnd >= list.length || !lastItemKey ? 0 : rectangles[lastItemKey].bottom - rectangles[list[sliceEnd]].top,
    }
  }

  _recordHeights() {
    if (!this._turboContainer) {
      return {
          heightDelta: 0,
          wasHeightChange: false,
      };
    }

    const itemHeights = this._turboContainer.current.getItemHeights();
    let wasHeightChange = false;

    const heightDelta = Object.keys(itemHeights).reduce((delta, key) => {
      const oldHeight = this._heights.hasOwnProperty(key) ? this._heights[key] : this.props.assumedHeight;

      const newHeight = itemHeights[key];

      wasHeightChange = wasHeightChange || newHeight !== oldHeight;

      return delta + (newHeight - oldHeight);
    }, 0);

    if (wasHeightChange) {
      this._heights = {
        ...this._heights,
        ...itemHeights,
      };
    }

    return {
      wasHeightChange,
      heightDelta,
    };
  }

  _postRenderProcessing({ hasListChanged = false }) {
    this._recordHeights();

    if (hasListChanged || !this._sliceIncludesScaledViewport(this.props.offscreenToViewportRatio)) {
      this._scheduleUpdate()
    }

    this._schedulePositioningNotification();
  }

  _sliceIncludesScaledViewport(offscreenToViewportRatio) {
    const { sliceStart, sliceEnd } = this._computeSlice({
      offscreenToViewportRatio,
    });

    return sliceStart >= this.state.sliceStart && sliceEnd <= this.state.sliceEnd;
  }

  _criticalUpdate() {
    const { sliceStart, sliceEnd } = this._computeSlice({
      offscreenToViewportRatio: this.props.offscreenToViewportRatio,
    });

    if ('number' === typeof sliceStart && 'number' === typeof sliceEnd) {
      this._setNecessarySlice(sliceStart, sliceEnd);
    }
  }

  _setNecessarySlice(newSliceStart, newSliceEnd) {
    function getNewSlice(sliceA, sliceB) {
      if (sliceB.start >= sliceA.start && sliceB.end <= sliceA.end) {
        return sliceA;
      }
      if (sliceB.start >= sliceA.end || sliceB.end <= sliceA.start) {
        return sliceB;
      }

      const diff = Math.max(sliceA.start - sliceB.start, sliceB.end - sliceA.end);

      return {
          start: Math.min(sliceA.start + diff, sliceB.start),
          end: Math.max(sliceA.end - diff, sliceB.end),
      };
    };

    const { sliceStart, sliceEnd } = this.state;

    const oldSlice = {
      start: sliceStart,
      end: sliceEnd,
    };

    const newSlice = {
      start: newSliceStart,
      end: newSliceEnd,
    };

    const { start, end } = getNewSlice(oldSlice, newSlice);

    this._setSlice(start, end);
  }

  _setSlice(newSliceStart, newSliceEnd) {
    const { sliceStart, sliceEnd } = this.state;

    if (newSliceStart !== sliceStart || newSliceEnd !== sliceEnd) {
      this.setState({
        sliceStart: newSliceStart,
        sliceEnd: newSliceEnd,
      });
    }
  }
}

TurboScroller.propTypes = {
  viewport: PropTypes.object.isRequired,
  list: PropTypes.array.isRequired,
  renderItem: PropTypes.func.isRequired,
  assumedHeight: PropTypes.number.isRequired,
  onPositioningUpdate: PropTypes.func.isRequired,
  initialItemIndex: PropTypes.number,
  offscreenToViewportRatio: PropTypes.number,
  heightCache: PropTypes.object,
  cacheKey: PropTypes.any,
};

TurboScroller.defaultProps = {
  assumedItemHeight: 400,
  heightCache: DEFAULT_HEIGHT_CACHE,
  initialItemIndex: 0,
  offscreenToViewportRatio: 0.5,
};

export default TurboScroller;
