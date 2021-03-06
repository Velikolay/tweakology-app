import React from 'react';
import PropTypes from 'prop-types';

import Field from '../Inputs/Field';

import './Blocks.scss';

const InputField = ({ title, name, ...rest }) => (
  <div className="form-group">
    <div className="form-row">
      <label className="input-title" htmlFor={name}>
        {title}
      </label>
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <Field id={name} name={name} className="full-width-input" {...rest} />
    </div>
  </div>
);

InputField.propTypes = {
  name: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
};

export default InputField;
