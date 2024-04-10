import { ethers } from "ethers";

// TODO: Convert to class?

export type Param = {
  type: ethers.ParamType;

  label?: string;
  value?: any; // undefined when not leaf node
  resolved?: any;

  parent?: Param;
  children?: Array<Param>;
  childrenExtendType?: Param; // Only present for extendable arrays
};

export function validate(type: ethers.ParamType, value: any): string {
  try {
    const r = ethers.AbiCoder.defaultAbiCoder().encode([type], [value]);
  } catch (err: any) {
    return err.shortMessage;
  }
  return "";
}

export function fromParamType(type: ethers.ParamType, parent?: Param): Param {
  const p: Param = {
    type,
    parent,
  };
  if (type.isArray()) {
    p.children = new Array<Param>();

    // Pre-load clones if not dynamic array (length -1)
    p.childrenExtendType = fromParamType(type.arrayChildren, p);
    for (let i = 0; i <= type.arrayLength; i++) {
      p.children.push(Object.assign({}, p.childrenExtendType));
    }
  } else if (type.isTuple()) {
    p.children = type.components.map((t: ethers.ParamType) => {
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

  if (param.type.isArray()) {
    if (!Array.isArray(value)) return;

    for (let i = 0; i < value.length; i++) {
      extendArray(param);
      if (!param.children) throw new Error ("setValues: array param must have children");
      setValues(param.children[i], value[i]);
    }

  } else if (param.type.isTuple()) {
    if (!Array.isArray(value)) return;

    for (let i = 0; i < value.length; i++) {
      if (!param.children) throw new Error ("setValues: tuple param must match children of value array");
      setValues(param.children[i], value[i]);
    }
  } else {
    param.value = value;
  }
}

