// @flow
import type { AbstractComponent } from 'react';
import React from 'react';
import PropTypes from 'prop-types';
import { Formik } from 'formik';
import * as Yup from 'yup';

import MutableListItem, {
  Mode,
} from '../../../../../components/MutableList/MutableListItem';

import './ActionHOC.scss';

export type ActionContentProps = {
  id: string,
  mode: Symbol,
  formik: {
    values: any,
    errors: any,
    setFieldValue: (string, any) => void,
  },
};

type ActionProps = {
  id: string,
  actionName: string,
  mode: Symbol,
  values?: any,
  onSave: (id: string) => void,
  onDelete: (id: string) => void,
};

const withAction = (
  ActionComponent: AbstractComponent<ActionContentProps>,
  validationSchema: Yup.Schema<any, any>,
  defaultValues: any,
) => {
  const comp = (props: ActionProps) => {
    const {
      id,
      // actionName,
      mode: initMode,
      values: customValues,
      onSave,
      onDelete,
    } = props;
    const initValues = customValues || defaultValues;
    const persistKey = `Actions.${id}`;
    // const [mode, setMode] = useState(initMode);
    return (
      <Formik initialValues={initValues} validationSchema={validationSchema}>
        {formik => (
          <MutableListItem
            id={id}
            persistKey={persistKey}
            mode={initMode}
            formik={formik}
            autosave={false}
            onSave={onSave}
            onDelete={onDelete}
          >
            {(_, mode) => (
              <ActionComponent id={id} mode={mode} formik={formik} />
            )}
          </MutableListItem>
        )}
      </Formik>
    );
  };
  comp.propTypes = {
    id: PropTypes.string.isRequired,
    actionName: PropTypes.string,
    mode: PropTypes.symbol,
    values: PropTypes.any,
    onDelete: PropTypes.func,
    onSave: PropTypes.func,
  };

  comp.defaultProps = {
    actionName: '',
    mode: Mode.SUMMARY,
    values: null,
    onDelete: () => {},
    onSave: () => {},
  };
  return comp;
};

export default withAction;
