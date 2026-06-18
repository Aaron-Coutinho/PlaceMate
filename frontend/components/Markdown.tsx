import React from "react";

interface MarkdownProps {
  content: string;
}

export function Markdown({ content }: MarkdownProps) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  // Grouping lists to render valid nested structures
  let currentListType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const parseInline = (text: string): React.ReactNode[] => {
    // Split by ** for bold formatting
    const boldParts = text.split("**");
    return boldParts.map((part, idx) => {
      let renderedPart: React.ReactNode = part;
      if (idx % 2 === 1) {
        renderedPart = (
          <strong key={idx} className="font-semibold text-white">
            {part}
          </strong>
        );
      } else {
        // Split by ` for inline code formatting
        const codeParts = part.split("`");
        renderedPart = codeParts.map((cPart, cIdx) => {
          if (cIdx % 2 === 1) {
            return (
              <code
                key={cIdx}
                className="bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded font-mono text-xs border border-indigo-500/15"
              >
                {cPart}
              </code>
            );
          }
          return cPart;
        });
      }
      return <React.Fragment key={idx}>{renderedPart}</React.Fragment>;
    });
  };

  const flushList = (key: number) => {
    if (!currentListType || listItems.length === 0) return;

    const items = listItems.map((item, index) => (
      <li key={index} className="leading-relaxed">
        {parseInline(item)}
      </li>
    ));

    if (currentListType === "ul") {
      elements.push(
        <ul
          key={`list-${key}`}
          className="list-disc pl-6 my-4 text-gray-300 space-y-1.5"
        >
          {items}
        </ul>
      );
    } else {
      elements.push(
        <ol
          key={`list-${key}`}
          className="list-decimal pl-6 my-4 text-gray-300 space-y-1.5"
        >
          {items}
        </ol>
      );
    }

    listItems = [];
    currentListType = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code block check
    if (line.trim().startsWith("```")) {
      flushList(i);
      if (inCodeBlock) {
        inCodeBlock = false;
        elements.push(
          <pre
            key={i}
            className="bg-gray-950/90 border border-gray-800/80 rounded-xl p-4 my-4 font-mono text-xs overflow-x-auto text-indigo-200 shadow-inner"
          >
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Headers
    if (line.startsWith("# ")) {
      flushList(i);
      elements.push(
        <h1
          key={i}
          className="text-2xl font-bold text-white mt-6 mb-3 border-b border-gray-800 pb-2 tracking-tight"
        >
          {parseInline(line.substring(2))}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      flushList(i);
      elements.push(
        <h2
          key={i}
          className="text-xl font-bold text-white mt-5 mb-2.5 tracking-tight"
        >
          {parseInline(line.substring(3))}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      flushList(i);
      elements.push(
        <h3
          key={i}
          className="text-lg font-bold text-gray-200 mt-4 mb-2 tracking-tight"
        >
          {parseInline(line.substring(4))}
        </h3>
      );
    } else if (line.startsWith("#### ")) {
      flushList(i);
      elements.push(
        <h4
          key={i}
          className="text-base font-bold text-gray-300 mt-3 mb-1.5 tracking-tight"
        >
          {parseInline(line.substring(5))}
        </h4>
      );
    }
    // Bullet list items
    else if (line.startsWith("* ") || line.startsWith("- ")) {
      if (currentListType !== "ul") {
        flushList(i);
        currentListType = "ul";
      }
      listItems.push(line.substring(2));
    }
    // Numbered list items
    else if (/^\d+\.\s/.test(line)) {
      if (currentListType !== "ol") {
        flushList(i);
        currentListType = "ol";
      }
      const match = line.match(/^\d+\.\s(.*)/);
      listItems.push(match ? match[1] : line);
    }
    // Empty lines
    else if (line.trim() === "") {
      flushList(i);
      elements.push(<div key={i} className="h-3" />);
    }
    // Standard paragraphs
    else {
      flushList(i);
      elements.push(
        <p
          key={i}
          className="my-3 text-gray-300 leading-relaxed text-sm md:text-base"
        >
          {parseInline(line)}
        </p>
      );
    }
  }

  // Flush any remaining list items
  flushList(lines.length);

  return <div className="markdown-content">{elements}</div>;
}
