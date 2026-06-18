import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

export const useSEO = ({ title, description, image, url, type = "article" }: SEOProps) => {
  useEffect(() => {
    // Save original title
    const originalTitle = document.title;
    if (title) {
      document.title = `${title} | Swaptics`;
    }

    const setMetaTag = (attributeName: string, attributeValue: string, content: string) => {
      let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
      if (element) {
        element.setAttribute("content", content);
      } else {
        element = document.createElement("meta");
        element.setAttribute(attributeName, attributeValue);
        element.setAttribute("content", content);
        document.head.appendChild(element);
      }
    };

    const setLinkTag = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`);
      if (element) {
        element.setAttribute("href", href);
      } else {
        element = document.createElement("link");
        element.setAttribute("rel", rel);
        element.setAttribute("href", href);
        document.head.appendChild(element);
      }
    };

    // Update tags if provided
    if (description) {
      setMetaTag("name", "description", description);
      setMetaTag("property", "og:description", description);
      setMetaTag("name", "twitter:description", description);
    }

    if (title) {
      setMetaTag("property", "og:title", title);
      setMetaTag("name", "twitter:title", title);
    }

    setMetaTag("property", "og:type", type);

    if (image) {
      setMetaTag("property", "og:image", image);
      setMetaTag("name", "twitter:image", image);
    }

    const currentUrl = url || window.location.href;
    setMetaTag("property", "og:url", currentUrl);
    setLinkTag("canonical", currentUrl);

    // Cleanup/Restore to original static defaults from index.html
    return () => {
      document.title = originalTitle;
      const defaultDesc = "Rescue Beauty Products. Save Money. Reduce Waste. India's hyperlocal marketplace to buy, sell, and swap unused cosmetics. Connect with beauty lovers in your area — no payments, no delivery hassle.";
      setMetaTag("name", "description", defaultDesc);
      setMetaTag("property", "og:title", "Swaptics");
      setMetaTag("property", "og:description", "Rescue Beauty Products. Save Money. Reduce Waste.");
      setMetaTag("property", "og:type", "website");
      
      // Attempt to clean up or at least restore OG image to standard favicon or fallback if wanted
      const logoMeta = document.querySelector('meta[property="og:image"]');
      if (logoMeta) {
        logoMeta.removeAttribute("content");
      }
    };
  }, [title, description, image, url, type]);
};
