import { useEffect, Children } from "react";

const MANAGED_ATTR = "data-head";

export default function Head({ children }) {
    useEffect(() => {
        const managedElements = [];

        // Reading children as data is the point of this component: each one is
        // mirrored into document.head rather than rendered.
        // eslint-disable-next-line @eslint-react/no-children-for-each
        Children.forEach(children, (child) => {
            if (!child || !child.props) return;

            const { type } = child;
            const { children: textContent, ...props } = child.props;

            if (type === "title") {
                document.title = typeof textContent === "string" ? textContent : "";
                return;
            }

            if (type === "html") {
                Object.entries(props).forEach(([key, value]) => {
                    document.documentElement.setAttribute(key, value);
                });
                return;
            }

            if (type === "body") {
                Object.entries(props).forEach(([key, value]) => {
                    document.body.setAttribute(key, value);
                });
                return;
            }

            const el = document.createElement(type);
            el.setAttribute(MANAGED_ATTR, "true");

            Object.entries(props).forEach(([key, value]) => {
                if (key === "crossOrigin") {
                    el.setAttribute("crossorigin", value);
                } else if (key === "hrefLang") {
                    el.setAttribute("hreflang", value);
                } else {
                    el.setAttribute(key, value);
                }
            });

            if (type === "script" && textContent) {
                el.textContent = typeof textContent === "string" ? textContent : "";
            }

            document.head.appendChild(el);
            managedElements.push(el);
        });

        return () => {
            managedElements.forEach((el) => {
                if (el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            });
        };
    }, [children]);

    return null;
}
