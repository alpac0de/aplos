import { createElement } from 'react';

/**
 * Turns the generated route tree into React Router route objects, shared by the
 * client and SSR runtimes so both always render the same routes. Objects rather
 * than <Route> elements: the tree is data, and elements would need a key each
 * when layout nodes have nothing stable to key on.
 */
export function toRouteObjects(nodes) {
    return nodes.map((node) => {
        if (node.children) {
            return { element: createElement(node.element), children: toRouteObjects(node.children) };
        }
        return { path: node.path, element: createElement(node.element) };
    });
}
