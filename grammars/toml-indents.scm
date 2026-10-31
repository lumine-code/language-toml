; Existing multiline string contents are data, including whitespace.
((string) @preserve
  (#is? indent.reindent true)
  (#is-not? indent.matchesCurrentRow startPosition)
  (#set! indent.force true))

; Indent array delimiters, leaving table headers at their existing margin.
(array "[" @indent)
(array "]" @dedent)
