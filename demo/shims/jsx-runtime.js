// Runtime JSX automático sobre React global (UMD).
const R = window.React;
function jsx(type, props, key) {
  const { children, ...rest } = props || {};
  if (key !== undefined) rest.key = key;
  return children === undefined ? R.createElement(type, rest) : Array.isArray(children) ? R.createElement(type, rest, ...children) : R.createElement(type, rest, children);
}
module.exports = { jsx, jsxs: jsx, Fragment: R.Fragment };
