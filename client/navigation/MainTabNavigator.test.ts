import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const sourcePath = path.join(
  process.cwd(),
  "client/navigation/MainTabNavigator.tsx",
);
const tabBarPath = path.join(
  process.cwd(),
  "client/components/AnimatedTabBar.tsx",
);
const sourceText = readFileSync(sourcePath, "utf8");
const tabBarText = readFileSync(tabBarPath, "utf8");
const sourceFile = ts.createSourceFile(
  sourcePath,
  sourceText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

function hasImport(localName: string, moduleName: string) {
  return sourceFile.statements.some((statement) => {
    if (!ts.isImportDeclaration(statement)) return false;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) return false;
    return (
      statement.moduleSpecifier.text === moduleName &&
      statement.importClause?.name?.text === localName
    );
  });
}

function findTypeLiteral(name: string) {
  for (const statement of sourceFile.statements) {
    if (
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === name &&
      ts.isTypeLiteralNode(statement.type)
    ) {
      return statement.type;
    }
  }
  return undefined;
}

function hasProperty(typeLiteral: ts.TypeLiteralNode, propertyName: string) {
  return typeLiteral.members.some(
    (member) =>
      ts.isPropertySignature(member) &&
      member.name.getText(sourceFile) === propertyName,
  );
}

function getStringAttribute(
  element: ts.JsxOpeningLikeElement,
  attributeName: string,
) {
  const attribute = element.attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) &&
      property.name.getText(sourceFile) === attributeName,
  );
  assert.ok(attribute, `${attributeName} should be set`);
  assert.ok(
    attribute.initializer && ts.isStringLiteral(attribute.initializer),
    `${attributeName} should be a string literal`,
  );
  return attribute.initializer.text;
}

const tabScreens: ts.JsxOpeningLikeElement[] = [];

function visit(node: ts.Node) {
  if (
    (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
    node.tagName.getText(sourceFile) === "Tab.Screen"
  ) {
    tabScreens.push(node);
  }

  ts.forEachChild(node, visit);
}

visit(sourceFile);

assert.equal(
  hasImport("MapStackNavigator", "@/navigation/MapStackNavigator"),
  false,
  "main tabs should not import the map stack navigator while the map tab is hidden",
);

const mainTabs = findTypeLiteral("MainTabParamList");
assert.ok(mainTabs, "MainTabParamList should be declared");
assert.equal(
  hasProperty(mainTabs, "MapTab"),
  false,
  "MainTabParamList should not include MapTab while the map tab is hidden",
);

assert.equal(
  tabScreens.some((screen) => getStringAttribute(screen, "name") === "MapTab"),
  false,
  "bottom navigation should not include a MapTab screen",
);
assert.doesNotMatch(
  tabBarText,
  /MapTab:\s*"map"/,
  "hidden MapTab should not have an animated tab bar icon mapping",
);

assert.equal(
  hasImport("CivicStackNavigator", "@/navigation/CivicStackNavigator"),
  true,
  "main tabs should import CivicStackNavigator",
);

assert.equal(
  hasProperty(mainTabs, "CivicTab"),
  true,
  "MainTabParamList should include CivicTab",
);

assert.equal(
  tabScreens.some(
    (screen) => getStringAttribute(screen, "name") === "CivicTab",
  ),
  true,
  "bottom navigation should include a CivicTab screen",
);

assert.match(
  tabBarText,
  /CivicTab:\s*"flag"/,
  "CivicTab should have an animated tab bar icon mapping",
);
