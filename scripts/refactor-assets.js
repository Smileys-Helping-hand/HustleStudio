import path from 'node:path';

/**
 * Codemod helper to convert string-based asset references into the shared asset() helper.
 * Run with: npx jscodeshift -t scripts/refactor-assets.js src --extensions=js,jsx,ts,tsx
 */
export default function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  let mutated = false;

  root.find(j.Literal).forEach((path) => {
    const value = path.value.value;
    if (typeof value !== 'string') return;
    if (!/(^\/assets\/|^\/media\/|\/assets\/|\/media\/)/.test(value)) return;

    const normalized = value.replace(/^\/+/, '');
    const callExpression = j.callExpression(j.identifier('asset'), [j.literal(normalized)]);
    j(path).replaceWith(callExpression);
    mutated = true;
  });

  if (!mutated) {
    return fileInfo.source;
  }

  const shouldInjectImport = fileInfo.path.includes(`${path.sep}src${path.sep}`);
  if (shouldInjectImport) {
    const hasAssetImport = root
      .find(j.ImportDeclaration)
      .some((importPath) => importPath.value.source.value.includes('/config/assets'));

    if (!hasAssetImport) {
      root.get().node.program.body.unshift(
        j.importDeclaration(
          [j.importSpecifier(j.identifier('asset'))],
          j.literal('@/config/assets.js')
        )
      );
    }
  }

  return root.toSource({ quote: 'single' });
}
