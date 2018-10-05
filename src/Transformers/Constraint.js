import { attributeToModifiers } from '../Static/Constraints';

const toItem = (payloadItem, placeholder) => {
  const attrVal = payloadItem.attribute.toString();
  const item = {
    attribute: {
      value: attrVal,
    },
    item: {
      value: payloadItem.item,
      placeholder,
    },
  };
  if (attrVal) {
    const [relativeToMargin, respectLanguageDirection] = attributeToModifiers[attrVal];
    item.attribute.relativeToMargin = relativeToMargin;
    item.attribute.respectLanguageDirection = respectLanguageDirection;
  }
  return item;
};

const ConstraintTransformer = {

  fromPayload: (payload) => {
    // console.log(payload);
    const formikProps = {
      meta: {
        synced: true,
        ...payload.meta,
      },
      first: toItem(payload.first, 'Item1'),
      relation: payload.relation.toString(),
      multiplier: payload.multiplier,
      constant: payload.constant,
      isActive: payload.isActive,
      priority: payload.priority,
    };

    if (payload.second) {
      formikProps.second = toItem(payload.second, 'Item2');
    } else {
      formikProps.second = {
        attribute: {
          value: '',
        },
        item: {
          value: '',
          placeholder: 'Item2',
        },
      };
    }
    return formikProps;
  },

  toPayload: (props) => {
    const payload = {
      meta: props.meta,
      first: {
        item: props.first.item.value,
        attribute: parseInt(props.first.attribute.value, 10),
      },
      relation: parseInt(props.relation, 10),
      multiplier: props.multiplier,
      constant: props.constant,
      isActive: props.isActive,
      priority: props.priority,
    };

    if (props.second) {
      if (props.second.attribute.value && props.second.item.value) {
        payload.second = {
          item: props.second.item.value,
          attribute: parseInt(props.second.attribute.value, 10),
        };
      } else {
        console.log('Incomplete constraint definition');
      }
    }
    return payload;
  },
};

export default ConstraintTransformer;