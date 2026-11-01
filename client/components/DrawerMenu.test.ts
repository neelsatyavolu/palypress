import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const sourcePath = path.join(process.cwd(), "client/components/DrawerMenu.tsx");
const sourceText = readFileSync(sourcePath, "utf8");
const sourceFile = ts.createSourceFile(
  sourcePath,
  sourceText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

let staffRoutes: string[] | undefined;

function visit(node: ts.Node) {
  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.name.text === "STAFF_ROUTES" &&
    node.initializer &&
    ts.isNewExpression(node.initializer)
  ) {
    const firstArgument = node.initializer.arguments?.[0];

    if (firstArgument && ts.isArrayLiteralExpression(firstArgument)) {
      staffRoutes = firstArgument.elements.map((element) => {
        assert.ok(
          ts.isStringLiteral(element),
          "hidden staff route entries should be string literals",
        );
        return element.text;
      });
    }
  }

  ts.forEachChild(node, visit);
}

visit(sourceFile);

assert.deepEqual(
  staffRoutes,
  ["StaffList"],
  "drawer should keep Staff and All Staff visible while hiding only StaffList",
);
