import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface MarkdownProps {
  content: string;
}

export function Markdown({ content }: MarkdownProps) {
  if (!content) return null;

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-2xl font-bold text-white mt-6 mb-3 border-b border-gray-800 pb-2 tracking-tight" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-xl font-bold text-white mt-5 mb-2.5 tracking-tight" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-lg font-bold text-gray-200 mt-4 mb-2 tracking-tight" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-base font-bold text-gray-300 mt-3 mb-1.5 tracking-tight" {...props} />
          ),
          p: ({ node, ...props }) => (
            <div className="my-3 text-gray-300 leading-relaxed text-sm md:text-base" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-6 my-4 text-gray-300 space-y-1.5" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-6 my-4 text-gray-300 space-y-1.5" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="leading-relaxed" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-white" {...props} />
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || "");
            if (!inline) {
              return (
                <pre className="bg-gray-950/90 border border-gray-800/80 rounded-xl p-4 my-4 font-mono text-xs overflow-x-auto text-indigo-200 shadow-inner">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              );
            }
            return (
              <code
                className="bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded font-mono text-xs border border-indigo-500/15"
                {...props}
              >
                {children}
              </code>
            );
          },
          a: ({ node, ...props }) => (
            <a className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-indigo-500/50 pl-4 py-1 my-4 bg-indigo-500/5 rounded-r-lg text-gray-400 italic" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
