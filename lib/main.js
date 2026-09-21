exports.consumeHyperlinkInjection = (hyperlink) => {
  return hyperlink.addInjectionPoint("source.toml", {
    types: ["comment", "string"],
  });
};

exports.consumeTodoInjection = (todo) => {
  return todo.addInjectionPoint("source.toml", { types: ["comment"] });
};
