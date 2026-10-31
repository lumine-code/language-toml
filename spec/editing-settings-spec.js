const path = require("node:path");

describe("toml editing settings", () => {
  let editor;

  beforeEach(async () => {
    jasmine.useRealClock();
    const pack = await lumine.packages.activatePackage(path.resolve(__dirname, ".."));
    await pack.resourceLoadPromise;
    editor = await lumine.workspace.open();
    editor.setGrammar(lumine.grammars.grammarForScopeName("source.toml"));
    editor.update({ autoIndent: false });
    await editor.whenGrammarSettled();
  });

  afterEach(() => editor?.destroy());

  async function setText(text) {
    editor.setText(text);
    expect(await editor.whenGrammarSettled()).toBe(true);
  }

  it("selects a complete hyphenated bare key", async () => {
    await setText('server-host = "localhost"');
    editor.setCursorBufferPosition(
      editor.getBuffer().positionForCharacterIndex(editor.getText().indexOf("host") + 1),
    );
    editor.selectWordsContainingCursors();
    expect(editor.getSelectedText()).toBe("server-host");
  });

  it("pairs supported syntax without inventing unsupported quotes or containers", async () => {
    await lumine.packages.activatePackage("bracket-matcher");
    for (const [typed, expected] of [
      ["[", "[]"],
      ["{", "{}"],
      ['"', '""'],
      ["'", "''"],
      ["(", "("],
      ["`", "`"],
      ["“", "“"],
    ]) {
      await setText("value = ");
      editor.setCursorBufferPosition([editor.getLastBufferRow(), Infinity]);
      await editor.insertText(typed);
      await editor.whenGrammarSettled();
      expect(editor.getText())
        .withContext(typed)
        .toBe("value = " + expected);
    }
  });

  it("adds an extra line for arrays while leaving inline-table Enter alone", async () => {
    await lumine.packages.activatePackage("bracket-matcher");
    await setText("value = {}");
    editor.setCursorBufferPosition([0, 9]);
    await editor.insertNewline();
    expect(editor.getLineCount()).toBe(2);
    await setText("value = []");
    editor.setCursorBufferPosition([0, 9]);
    await editor.insertNewline();
    expect(editor.getLineCount()).toBe(3);
  });
});
