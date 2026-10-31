const path = require("node:path");

describe("language-toml conservative indentation", () => {
  let editor;

  beforeEach(async () => {
    const pack = await lumine.packages.activatePackage(path.resolve(__dirname, ".."));
    for (const grammar of pack.grammars) {
      if (grammar.queryPaths?.indentsQuery) await grammar.getQuery("indentsQuery");
    }
    editor = await lumine.workspace.open();
    editor.setGrammar(lumine.grammars.grammarForScopeName("source.toml"));
    editor.update({ tabLength: 2, softTabs: true });
  });

  afterEach(() => editor?.destroy());

  async function setText(source) {
    editor.setText(source);
    expect(await editor.whenGrammarSettled()).toBe(true);
  }

  async function enter(source, expected, row = 0) {
    await setText(source);
    editor.setCursorBufferPosition([row, Infinity]);
    editor.insertText("\n", { autoIndent: true, autoIndentNewline: true });
    await editor.whenGrammarSettled();
    expect(editor.lineTextForBufferRow(row + 1))
      .withContext(source)
      .toBe(" ".repeat(expected));
    expect(editor.getCursorBufferPosition().column).withContext(source).toBe(expected);
  }

  it("keeps table headers and ambiguous incomplete input at the current margin", async () => {
    for (const source of ["[table]", "[[items]]", "array = [", "# [", 'text = "["'])
      await enter(source, 0);
  });

  it("indents a parsed multiline array and aligns its closing bracket", async () => {
    await setText("array = [\n1,\n2\n]");
    await editor.autoIndentBufferRows(0, 3);
    expect(editor.getText()).toBe("array = [\n  1,\n  2\n]");
  });

  it("preserves whitespace inside multiline literals and comments when reindenting", async () => {
    const source = 'text = """head\n        literal [\n raw ]\n"""';
    await setText(source);
    const before = editor.getText().split("\n");
    await editor.autoIndentBufferRows(0, editor.getLastBufferRow());
    for (const row of [1, 2, 3]) {
      expect(editor.lineTextForBufferRow(row)).withContext(String(row)).toBe(before[row]);
    }
  });
});
