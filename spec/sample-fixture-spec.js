const fs = require("fs");
const path = require("path");
const { Point } = require("lumine");

const highlightsPath = path.join(__dirname, "..", "grammars", "toml-highlights.scm");

// The fixture beside this file is a plain sample of the language — the file to
// open when you want to look at the highlighting rather than assert on it. This
// spec is only what stops the sample quietly rotting: the grammar still claims
// it, and it still tokenizes.

describe("TOML sample fixtures", () => {
  let editor;

  beforeEach(async () => {
    await lumine.packages.activatePackage("language-toml");
  });

  afterEach(() => editor?.destroy());

  it("parses sample.toml without error", async () => {
    editor = await lumine.workspace.open(path.join(__dirname, "fixtures", "sample.toml"));
    const languageMode = editor.getBuffer().getLanguageMode();
    await languageMode.ready;

    expect(editor.getGrammar().scopeName).toBe("source.toml");
    expect((await editor.getSyntaxDiagnostics()).hasError).toBe(false);
  });

  it("keeps unbounded collection captures leaf-rooted and viewport-local", async () => {
    const querySource = fs.readFileSync(highlightsPath, "utf8");
    expect(querySource).not.toMatch(
      /\((?:array|table|inline_table|table_array_element)\s+(?:"|\n\s*")/,
    );
    for (const type of ["array", "table", "inline_table", "table_array_element"]) {
      expect(querySource).toContain(`(#is? test.childOfType ${type})`);
    }

    const lines = ["values = ["];
    for (let value = 0; value < 6000; value++) lines.push(`  ${value},`);
    lines.push("]");

    editor = await lumine.workspace.open("large-array.toml");
    editor.setText(lines.join("\r\n"));
    const languageMode = editor.getBuffer().getLanguageMode();
    await languageMode.ready;

    const groups = await editor.getGrammarQueryCaptureGroups("highlightsQuery", {
      startPosition: new Point(3000, 0),
      endPosition: new Point(3006, 0),
    });
    const captures = groups.find(({ grammar }) => grammar === editor.getGrammar()).captures;

    expect(
      captures.some(
        ({ name, node }) =>
          name === "punctuation.separator.array.comma.toml" && node.startPosition.row === 3000,
      ),
    ).toBe(true);
    expect(captures.length).toBeLessThanOrEqual(100);
  });

  it("preserves section, key, string, and collection scopes", async () => {
    editor = await lumine.workspace.open("scopes.toml");
    editor.setText(`owner.home.address = "Ada"
ports = [8001, 8002]
inline = {left = 1, right = 2}
[[product]]`);
    await editor.getBuffer().getLanguageMode().ready;

    const scopesAt = (row, text, occurrence = 0) => {
      const line = editor.lineTextForBufferRow(row);
      let column = -1;
      for (let index = 0; index <= occurrence; index++) column = line.indexOf(text, column + 1);
      expect(column).not.toBe(-1);
      return editor.scopeDescriptorForBufferPosition([row, column]).getScopesArray();
    };

    expect(scopesAt(0, "owner")).toContain("variable.other.key.toml");
    expect(scopesAt(0, "home")).toContain("variable.other.key.toml");
    expect(scopesAt(0, "address")).toContain("variable.other.key.toml");
    expect(scopesAt(0, '"', 0)).toContain("punctuation.definition.string.begin.toml");
    expect(scopesAt(0, '"', 0)).not.toContain("punctuation.definition.string.end.toml");
    expect(scopesAt(0, '"', 1)).toContain("punctuation.definition.string.end.toml");
    expect(scopesAt(0, '"', 1)).not.toContain("punctuation.definition.string.begin.toml");
    expect(scopesAt(1, "[")).toContain("punctuation.definition.array.begin.bracket.square.toml");
    expect(scopesAt(1, ",")).toContain("punctuation.separator.array.comma.toml");
    expect(scopesAt(1, "]")).toContain("punctuation.definition.array.end.bracket.square.toml");
    expect(scopesAt(2, "{")).toContain(
      "punctuation.definition.inline-table.begin.bracket.curly.toml",
    );
    expect(scopesAt(2, ",")).toContain("punctuation.separator.inline-table.comma.toml");
    expect(scopesAt(2, "}")).toContain(
      "punctuation.definition.inline-table.end.bracket.curly.toml",
    );
    expect(scopesAt(3, "[[")).toContain(
      "punctuation.definition.table-array-element.begin.bracket.square.toml",
    );
    expect(scopesAt(3, "]]")).toContain(
      "punctuation.definition.table-array-element.end.bracket.square.toml",
    );
  });

  it("keeps raw captures bounded for collection-heavy CRLF input", async () => {
    editor = await lumine.workspace.open("capture-budget.toml");
    editor.setText(
      Array.from(
        { length: 1000 },
        (_, index) => `key_${index} = [1, 2, 3] # generated ${index}`,
      ).join("\r\n"),
    );
    const languageMode = editor.getBuffer().getLanguageMode();
    await languageMode.ready;

    const fullGroups = await editor.getGrammarQueryCaptureGroups("highlightsQuery");
    const fullCaptures = fullGroups.find(({ grammar }) => grammar === editor.getGrammar()).captures;
    const tileGroups = await editor.getGrammarQueryCaptureGroups("highlightsQuery", {
      startPosition: new Point(400, 0),
      endPosition: new Point(406, 0),
    });
    const tileCaptures = tileGroups.find(({ grammar }) => grammar === editor.getGrammar()).captures;

    expect(fullCaptures.length).toBeLessThanOrEqual(21000);
    expect(tileCaptures.length).toBeLessThanOrEqual(130);
  });
});
