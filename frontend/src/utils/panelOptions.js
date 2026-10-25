export function panelOptionLabel(panel) {
  const type = panel?.tipo_panel === "Secundario" ? "Sec" : "Prin";
  return `${panel?.nombre || "Panel"} - ${type}`;
}

export function orderPanels(panels = []) {
  const source = Array.isArray(panels) ? panels : [];
  const principals = source.filter((panel) => panel.tipo_panel !== "Secundario");
  const childrenByParent = new Map();
  for (const panel of source.filter((item) => item.tipo_panel === "Secundario")) {
    const key = String(panel.id_panel_principal || "");
    const children = childrenByParent.get(key) || [];
    children.push(panel);
    childrenByParent.set(key, children);
  }
  const ordered = [];
  const included = new Set();
  for (const principal of principals) {
    ordered.push(principal);
    included.add(String(principal.id));
    for (const child of childrenByParent.get(String(principal.id)) || []) {
      ordered.push(child);
      included.add(String(child.id));
    }
  }
  return ordered.concat(source.filter((panel) => !included.has(String(panel.id))));
}
