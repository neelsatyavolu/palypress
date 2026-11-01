import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const sourcePath = path.join(
  process.cwd(),
  "client/components/PublicationSwitcher.tsx",
);
const sourceText = readFileSync(sourcePath, "utf8");
const sourceFile = ts.createSourceFile(
  sourcePath,
  sourceText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

let scrollView: ts.JsxOpeningLikeElement | undefined;

function visit(node: ts.Node) {
  if (
    ts.isJsxElement(node) &&
    node.openingElement.tagName.getText(sourceFile) === "ScrollView"
  ) {
    scrollView = node.openingElement;
  }

  ts.forEachChild(node, visit);
}

visit(sourceFile);

assert.ok(scrollView, "publication picker should render a ScrollView");

const attributes = scrollView.attributes.properties.filter(ts.isJsxAttribute);

function getAttribute(name: string) {
  return attributes.find(
    (attribute) => attribute.name.getText(sourceFile) === name,
  );
}

function assertFalseAttribute(name: string) {
  const attribute = getAttribute(name);
  assert.ok(attribute, `${name} should be set on the publication list`);
  assert.ok(
    attribute.initializer &&
      ts.isJsxExpression(attribute.initializer) &&
      attribute.initializer.expression?.kind === ts.SyntaxKind.FalseKeyword,
    `${name} should be false`,
  );
}

function assertStringAttribute(name: string, value: string) {
  const attribute = getAttribute(name);
  assert.ok(attribute, `${name} should be set on the publication list`);
  assert.ok(
    attribute.initializer && ts.isStringLiteral(attribute.initializer),
    `${name} should be a string literal`,
  );
  assert.equal(attribute.initializer.text, value);
}

function assertZeroInsetsAttribute(name: string) {
  const attribute = getAttribute(name);
  assert.ok(attribute, `${name} should be set on the publication list`);
  assert.ok(
    attribute.initializer && ts.isJsxExpression(attribute.initializer),
    `${name} should use a JSX expression`,
  );

  const expression = attribute.initializer.expression;
  assert.ok(
    expression && ts.isObjectLiteralExpression(expression),
    `${name} should be an object literal`,
  );

  const values = new Map(
    expression.properties.map((property) => {
      assert.ok(ts.isPropertyAssignment(property));
      assert.ok(ts.isIdentifier(property.name));
      assert.ok(ts.isNumericLiteral(property.initializer));
      return [property.name.text, Number(property.initializer.text)];
    }),
  );

  assert.deepEqual(Object.fromEntries(values), {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });
}

assertFalseAttribute("automaticallyAdjustContentInsets");
assertFalseAttribute("automaticallyAdjustsScrollIndicatorInsets");
assertStringAttribute("contentInsetAdjustmentBehavior", "never");
assertZeroInsetsAttribute("contentInset");
assertZeroInsetsAttribute("scrollIndicatorInsets");

// Follow toggle: wired to FollowsContext, doesn't fire tile selection, and
// is accessible.
assert.match(
  sourceText,
  /import\s*\{\s*useFollows\s*\}\s*from\s*"@\/contexts\/FollowsContext"/,
  "should import useFollows from FollowsContext",
);
assert.match(
  sourceText,
  /const\s*\{\s*isFollowing,\s*followPublication,\s*unfollowPublication\s*\}\s*=\s*useFollows\(\)/,
  "should call useFollows() to read follow state and actions",
);
assert.match(
  sourceText,
  /followPublication\(pub\.id\)/,
  "follow toggle should call followPublication(pub.id)",
);
assert.match(
  sourceText,
  /unfollowPublication\(pub\.id\)/,
  "follow toggle should call unfollowPublication(pub.id)",
);
assert.match(
  sourceText,
  /accessibilityLabel=\{\s*following\s*\?\s*`Unfollow \$\{pub\.name\}`\s*:\s*`Follow \$\{pub\.name\}`\s*\}/,
  "follow toggle should expose a Follow/Unfollow accessibilityLabel",
);
assert.match(
  sourceText,
  /accessibilityState=\{\{\s*selected:\s*following\s*\}\}/,
  "follow toggle should expose accessibilityState reflecting follow status",
);

// The follow toggle must be a Pressable nested inside the tile's Pressable
// (a sibling child), not a wrapper around the whole tile, so it can
// intercept its own taps without triggering handleSelect.
let renderTileFollowIsNestedPressable = false;

function visitRenderTile(node: ts.Node) {
  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.name.text === "renderTile" &&
    node.initializer &&
    ts.isArrowFunction(node.initializer)
  ) {
    const body = node.initializer.body;
    let outerTileFound = false;

    function visitBody(inner: ts.Node) {
      if (
        ts.isJsxElement(inner) &&
        inner.openingElement.tagName.getText(sourceFile) === "Pressable"
      ) {
        if (!outerTileFound) {
          outerTileFound = true;
          // Look inside the outer tile Pressable's children for a nested
          // Pressable that owns the follow toggle's onPress.
          function visitChildren(child: ts.Node) {
            if (
              ts.isJsxElement(child) &&
              child.openingElement.tagName.getText(sourceFile) ===
                "Pressable"
            ) {
              const onPressAttr = child.openingElement.attributes.properties
                .filter(ts.isJsxAttribute)
                .find(
                  (attribute) => attribute.name.getText(sourceFile) === "onPress",
                );
              if (
                onPressAttr &&
                onPressAttr.getText(sourceFile).includes("followPublication")
              ) {
                renderTileFollowIsNestedPressable = true;
              }
            }
            ts.forEachChild(child, visitChildren);
          }
          ts.forEachChild(inner, visitChildren);
        }
      }
      ts.forEachChild(inner, visitBody);
    }

    visitBody(body);
  }

  ts.forEachChild(node, visitRenderTile);
}

visitRenderTile(sourceFile);

assert.ok(
  renderTileFollowIsNestedPressable,
  "follow toggle should be a nested sibling Pressable inside the tile, not the tile's own onPress",
);

console.log("PublicationSwitcher.test.ts: all assertions passed");
