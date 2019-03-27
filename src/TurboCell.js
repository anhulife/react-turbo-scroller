import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

function areEqual(prevProps, nextProps) {
  return nextProps.id === prevProps.id && nextProps.render === prevProps.render;
}

const TurboCell = React.memo(function TurboCell(props) {
  const ref = useRef(null);

  useEffect(() => {
    props.setMeasureHeight(props.id, () => ref.current.getBoundingClientRect().height);

    return () => {
      props.setMeasureHeight(props.id, undefined);
    };
  });

  return (
    <div ref={ref}>
      {props.render(props.id)}
    </div>
  );
}, areEqual);

TurboCell.propTypes = {
  render: PropTypes.func.isRequired,
  setMeasureHeight: PropTypes.func.isRequired,
  id: PropTypes.any.isRequired,
};

export default TurboCell;
