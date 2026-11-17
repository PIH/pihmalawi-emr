import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

/**
 * i18next escapes interpolated values for HTML by default, so a value with a "/" (a unit such as g/dL, a card name such
 * as Cleft Lip / Palate) shows as "&#x2F;". React escapes what it renders already, so every translation with values
 * turns i18next's escaping off.
 */
describe('translations with values', () => {
  it('turn off i18next escaping', () => {
    const files = execSync("grep -rl 't(' src --include=*.ts --include=*.tsx", { cwd: process.cwd() })
      .toString()
      .trim()
      .split('\n')
      .filter((f) => !f.includes('.test.'));
    const escaped: Array<string> = [];
    for (const file of files) {
      const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const visit = (n: ts.Node) => {
        if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 't' && n.arguments.length === 3) {
          const options = n.arguments[2];
          if (!ts.isObjectLiteralExpression(options) || !options.getText(sf).includes('escapeValue: false')) {
            escaped.push(`${file}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`);
          }
        }
        ts.forEachChild(n, visit);
      };
      visit(sf);
    }
    expect(escaped).toEqual([]);
  });
});
