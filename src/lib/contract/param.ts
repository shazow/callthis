import type { ethers } from "ethers";

export type Param = {
  type: ethers.ParamType;

  label?: string;
  value?: any; // undefined when not leaf node
  resolved?: any;

  parent?: Param;
  children?: Array<Param>;
  childrenExtendType?: Param; // Only present for extendable arrays
};

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
