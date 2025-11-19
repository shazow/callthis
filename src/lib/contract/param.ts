import { encodeAbiParameters, type AbiParameter } from "viem";

// TODO: Convert to class?

export type Param = {
  type: AbiParameter;

  label?: string;
  value?: any; // undefined when not leaf node
  resolved?: any;

  parent?: Param;
  children?: Array<Param>;
  childrenExtendType?: Param; // Only present for extendable arrays
};

export function validate(type: AbiParameter, value: any): string {
  try {
    encodeAbiParameters([type], [value]);
  } catch (err: any) {
    return err.shortMessage || err.message;
  }
  return "";
}

function isArray(type: AbiParameter): boolean {
  return type.type.endsWith("]");
}

function isTuple(type: AbiParameter): boolean {
  return type.type === "tuple" || (type.type.startsWith("tuple") && !isArray(type));
}

function getArrayLength(type: AbiParameter): number {
  const match = type.type.match(/\[(\d*)\]$/);
  if (match) {
    return match[1] ? parseInt(match[1], 10) : -1;
  }
  return 0;
}

function getArrayChild(type: AbiParameter): AbiParameter {
  const match = type.type.match(/^(.*)\[(\d*)\]$/);
  if (match) {
    return {
      ...type,
      type: match[1],
    };
  }
  throw new Error("Not an array");
}

export function fromParamType(type: AbiParameter, parent?: Param): Param {
  const p: Param = {
    type,
    parent,
  };
  if (isArray(type)) {
    p.children = new Array<Param>();

    // Pre-load clones if not dynamic array (length -1)
    p.childrenExtendType = fromParamType(getArrayChild(type), p);
    const len = getArrayLength(type);

    if (len > 0) {
        for (let i = 0; i < len; i++) {
            p.children.push(Object.assign({}, p.childrenExtendType));
        }
    }
  } else if (isTuple(type)) {
    // If it's a tuple, it should have components.
    // We can cast to 'any' to avoid TS errors if union narrowing is tricky, or be more specific.
    // AbiParameter for tuple has 'components'.
    const tupleType = type as any;
    if (!tupleType.components) throw new Error("Tuple without components");
    p.children = tupleType.components.map((t: AbiParameter) => {
      return fromParamType(t, p);
    });
  } else {
    p.value = null;
  }

  return p;
}

export function toValues(param: Param): Array<any> {
  if (param.value !== undefined) return param.resolved || param.value;
  if (param.children === undefined) throw new Error("invalid Param: must contain value or children: " + JSON.stringify(param));
  return param.children.map((c) => toValues(c));
}

export function extendArray(param: Param): Param {
  if (!param.childrenExtendType) throw new Error("extendArray: must have childrenExtendType");

  if (param.children === undefined) {
    param.children = new Array<Param>();
  }

  param.children = [
    ...param.children,
    Object.assign({}, param.childrenExtendType),
  ];
  return param;
}

export function shrinkArray(param: Param): Param {
  if (!param.children) throw new Error("shrinkArray: must have children");
  param.children.pop();
  return param;
}


export function setValues(param: Param, value: any): void {
  if (!value) return;

  if (isArray(param.type)) {
    if (!Array.isArray(value)) return;

    for (let i = 0; i < value.length; i++) {
      extendArray(param);
      if (!param.children) throw new Error ("setValues: array param must have children");
      setValues(param.children[i], value[i]);
    }

  } else if (isTuple(param.type)) {
    if (!Array.isArray(value)) return;

    for (let i = 0; i < value.length; i++) {
      if (!param.children) throw new Error ("setValues: tuple param must match children of value array");
      setValues(param.children[i], value[i]);
    }
  } else {
    param.value = value;
  }
}
