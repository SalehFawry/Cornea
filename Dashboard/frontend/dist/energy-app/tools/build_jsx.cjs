// Pre-compile our JSX source files into plain React.createElement() calls so
// the dashboard can run without an in-browser Babel transformer.
//
// Usage:
//   node energy-app/tools/build_jsx.js
//
// It reads ../api.js, ../components.js, ../page-*.js, ../app.js (raw JSX),
// transforms them, writes a *.compiled.js next to each, and a single bundle.js
// that the HTML loads with a plain <script> tag.

const path = require('path');
const fs = require('fs');

// Resolve @babel/* from the project's node_modules.
const NM = path.resolve(__dirname, '..', '..', '..', 'node_modules');
process.env.NODE_PATH = NM;
require('module').Module._initPaths();

const parser = require(path.join(NM, '@babel/parser'));
const generator = require(path.join(NM, '@babel/generator')).default;
const t = require(path.join(NM, '@babel/types'));
const traverse = require(path.join(NM, '@babel/traverse')).default;

function jsxNameToValue(node) {
  if (t.isJSXIdentifier(node)) {
    if (/^[a-z]/.test(node.name)) return t.stringLiteral(node.name);
    return t.identifier(node.name);
  }
  if (t.isJSXMemberExpression(node)) {
    return t.memberExpression(jsxNameToValue(node.object), t.identifier(node.property.name));
  }
  if (t.isJSXNamespacedName(node)) {
    return t.stringLiteral(node.namespace.name + ':' + node.name.name);
  }
  return t.identifier('null');
}

function jsxAttrsToProps(attrs) {
  if (!attrs.length) return t.nullLiteral();
  const props = [];
  for (const attr of attrs) {
    if (t.isJSXSpreadAttribute(attr)) {
      props.push(t.spreadElement(attr.argument));
      continue;
    }
    let name;
    if (t.isJSXNamespacedName(attr.name)) {
      name = attr.name.namespace.name + ':' + attr.name.name.name;
    } else {
      name = attr.name.name;
    }
    let value;
    if (attr.value === null) value = t.booleanLiteral(true);
    else if (t.isJSXExpressionContainer(attr.value)) {
      value = t.isJSXEmptyExpression(attr.value.expression) ? t.nullLiteral() : attr.value.expression;
    } else {
      value = attr.value;
    }
    const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) ? t.identifier(name) : t.stringLiteral(name);
    props.push(t.objectProperty(key, value));
  }
  return t.objectExpression(props);
}

function jsxChildren(children) {
  const out = [];
  for (const child of children) {
    if (t.isJSXText(child)) {
      const raw = child.value;
      if (raw.trim() === '') continue;
      const text = raw.replace(/\s+/g, ' ');
      out.push(t.stringLiteral(text));
    } else if (t.isJSXExpressionContainer(child)) {
      if (t.isJSXEmptyExpression(child.expression)) continue;
      out.push(child.expression);
    } else if (t.isJSXElement(child) || t.isJSXFragment(child)) {
      out.push(jsxToCall(child));
    } else {
      // Already transformed (e.g. CallExpression). Keep as is.
      out.push(child);
    }
  }
  return out;
}

function jsxToCall(node) {
  if (t.isJSXFragment(node)) {
    const children = jsxChildren(node.children);
    return t.callExpression(
      t.memberExpression(t.identifier('React'), t.identifier('createElement')),
      [t.memberExpression(t.identifier('React'), t.identifier('Fragment')), t.nullLiteral(), ...children]
    );
  }
  const opening = node.openingElement;
  const tag = jsxNameToValue(opening.name);
  const props = jsxAttrsToProps(opening.attributes);
  const children = jsxChildren(node.children);
  return t.callExpression(
    t.memberExpression(t.identifier('React'), t.identifier('createElement')),
    [tag, props, ...children]
  );
}

function transformAst(ast) {
  traverse(ast, {
    JSXElement: { exit(p) { p.replaceWith(jsxToCall(p.node)); } },
    JSXFragment: { exit(p) { p.replaceWith(jsxToCall(p.node)); } },
  });
  return ast;
}

function hasLeftoverJsx(ast) {
  let found = false;
  traverse(ast, {
    JSXElement(p) { found = true; p.stop(); },
    JSXFragment(p) { found = true; p.stop(); },
  });
  return found;
}

const ENERGY_APP = path.resolve(__dirname, '..');
const files = [
  'api.js',
  'components.js',
  'page-dashboard.js',
  'page-shutter.js',
  'page-customers.js',
  'page-alerts.js',
  'app.js',
].map(f => path.join(ENERGY_APP, f));

let combined = '// Auto-generated bundle - DO NOT EDIT.\n// Source files: energy-app/{api,components,page-*,app}.js\n// Run energy-app/tools/build_jsx.js to regenerate.\n\n';
let hadError = false;

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  try {
    const ast = parser.parse(code, { sourceType: 'script', plugins: ['jsx'] });
    transformAst(ast);
    if (hasLeftoverJsx(ast)) {
      console.error('FAIL: leftover JSX in ' + file);
      hadError = true;
      continue;
    }
    const out = generator(ast, { compact: false, comments: true }).code;
    parser.parse(out, { sourceType: 'script' }); // re-validate
    const base = path.basename(file, '.js');
    fs.writeFileSync(path.join(ENERGY_APP, base + '.compiled.js'), out);
    combined += '\n// ===== ' + base + ' =====\n' + out + '\n';
    console.log('Compiled: ' + path.relative(ENERGY_APP, file) + ' (' + out.length + ' bytes)');
  } catch (e) {
    console.error('FAIL: ' + file + '\n  ' + e.message);
    hadError = true;
  }
}

if (hadError) process.exit(1);

const bundlePath = path.join(ENERGY_APP, 'bundle.js');
fs.writeFileSync(bundlePath, combined);
console.log('\nBundle: ' + path.relative(ENERGY_APP, bundlePath) + ' (' + combined.length + ' bytes)');
