import { Component } from 'react';
import debounce from 'lodash.debounce';
import isEqual from 'lodash.isequal';

import { withFormikContext } from '../FormikContext';

class Persist extends Component {
  static defaultProps = {
    debounce: 300,
    excludeSystemContext: true,
  };

  saveForm = debounce((name, data) => {
    if (this.props.excludeSystemContext) {
      const { systemContext, ...other } = data;
      window.localStorage.setItem(name, JSON.stringify(other));
    } else {
      window.localStorage.setItem(name, JSON.stringify(data));
    }
    console.log('Form saved');
  }, this.props.debounce);

  componentDidMount() {
    this.setForm(this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.name !== this.props.name) {
      this.setForm(nextProps);
    } else if (!isEqual(nextProps.formik, this.props.formik)) {
      // console.log('Form saving..');
      this.saveForm(nextProps.name, nextProps.formik);
    } else {
      // console.log('Form wont save');
    }
  }

  setForm = (props) => {
    // console.log('Form loading..');
    const maybeState = window.localStorage.getItem(props.name);

    let modifiedProps = props.formik;
    if (maybeState && maybeState !== null) {
      modifiedProps = JSON.parse(
        maybeState,
      );
    }

    const {
      values, errors, touched, isSubmitting, status,
    } = modifiedProps;

    const { formik } = this.props;
    if (formik) {
      if (values) {
        formik.setValues(values);
      }

      if (errors) {
        formik.setErrors(errors);
      }

      if (touched) {
        formik.setTouched(touched);
      }

      if (isSubmitting) {
        formik.setSubmitting(isSubmitting);
      }

      if (status) {
        formik.setStatus(status);
      }
      console.log('Form Loaded');
    }
  }

  render() {
    return null;
  }
}

export const readPersistedValues = (item) => {
  const maybeState = window.localStorage.getItem(item);
  return maybeState ? JSON.parse(maybeState).values : null;
};

export const readPersistedConstraints = () => {
  const constraints = {};
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const id = window.localStorage.key(i);
    const formState = window.localStorage.getItem(id);
    if (formState) {
      const state = JSON.parse(formState);
      if (state.type === 'NSLayoutConstraint' && (state.dirty || state.values.meta.added)) {
        const viewId = id.split('.')[0];
        if (!(viewId in constraints)) {
          constraints[viewId] = [];
        }
        constraints[viewId].push(state);
      }
    }
  }

  for (const viewId in constraints) {
    constraints[viewId].sort((a, b) => parseInt(a.id.split(':')[1], 10) > parseInt(b.id.split(':')[1], 10));
  }

  return constraints;
};

export default withFormikContext(Persist);
