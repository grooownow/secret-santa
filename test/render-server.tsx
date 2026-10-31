import { isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Renders a tree that contains async server components to static HTML, by
 * awaiting every function component first. Test helper only.
 */
async function resolve(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolve));
  if (!isValidElement(node)) return node;
  const { type, props } = node as {
    type: unknown;
    props: { children?: ReactNode };
  };
  if (typeof type === "function") {
    const out = await (type as (p: unknown) => unknown)(props);
    return resolve(out as ReactNode);
  }
  const children = await resolve(props.children);
  return { ...node, props: { ...props, children } } as ReactNode;
}

export async function renderServerToHtml(element: ReactNode): Promise<string> {
  return renderToStaticMarkup((await resolve(element)) as React.ReactElement);
}
