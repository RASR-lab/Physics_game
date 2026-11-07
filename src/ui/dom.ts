import katex from "katex";

/** Tiny hyperscript helper: h("div.card", { onclick }, child, "text") */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K | `${K}.${string}`,
  props: Record<string, any> = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const [name, ...classes] = tag.split(".");
  const el = document.createElement(name as K);
  if (classes.length) el.className = classes.join(" ");
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "html") el.innerHTML = v;
    else if (k in el && k !== "list") (el as any)[k] = v;
    else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export function tex(src: string, display = false): string {
  try {
    return katex.renderToString(src, { displayMode: display, throwOnError: false, output: "html" });
  } catch {
    return src;
  }
}

export function texEl(src: string, display = false, cls = "tex") {
  const el = h("div", { className: cls });
  el.innerHTML = tex(src, display);
  return el;
}

export function stars(nStars: number, max = 3) {
  return h(
    "span.stars",
    { "aria-label": `${nStars} of ${max} stars` },
    ...Array.from({ length: max }, (_, i) => h("span", { className: i < nStars ? "star on" : "star" }, "★")),
  );
}
