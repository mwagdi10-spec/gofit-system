// ─── LinkifiedText Component ───────────────────────────────────────────
// تحويل النصوص إلى روابط وتنسيق مع دعم RTL والعربية

import React, { useMemo } from 'react';

const LinkifiedText = ({
  text = '',
  linkColor = 'text-blue-500',
  linkHoverColor = 'hover:text-blue-600',
  newTab = true,
  parseUrls = true,
  parseEmails = false,
  parsePhones = false,
  customLinks = {}, // { keyword: { url, color } }
  className = '',
  dir = 'auto' // auto, ltr, rtl
}) => {
  // URL regex
  const urlRegex = /https?:\/\/[^\s]+/gi;
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/gi;
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

  const parsedContent = useMemo(() => {
    if (!text) return [];

    let parts = [{ type: 'text', content: text }];

    // Parse URLs
    if (parseUrls) {
      parts = parts.flatMap(part => {
        if (part.type !== 'text') return part;

        const segments = [];
        let lastIndex = 0;

        Array.from(part.content.matchAll(urlRegex)).forEach(match => {
          if (match.index > lastIndex) {
            segments.push({
              type: 'text',
              content: part.content.substring(lastIndex, match.index)
            });
          }
          segments.push({
            type: 'url',
            content: match[0]
          });
          lastIndex = match.index + match[0].length;
        });

        if (lastIndex < part.content.length) {
          segments.push({
            type: 'text',
            content: part.content.substring(lastIndex)
          });
        }

        return segments.length > 0 ? segments : part;
      });
    }

    // Parse Emails
    if (parseEmails) {
      parts = parts.flatMap(part => {
        if (part.type !== 'text') return part;

        const segments = [];
        let lastIndex = 0;

        Array.from(part.content.matchAll(emailRegex)).forEach(match => {
          if (match.index > lastIndex) {
            segments.push({
              type: 'text',
              content: part.content.substring(lastIndex, match.index)
            });
          }
          segments.push({
            type: 'email',
            content: match[0]
          });
          lastIndex = match.index + match[0].length;
        });

        if (lastIndex < part.content.length) {
          segments.push({
            type: 'text',
            content: part.content.substring(lastIndex)
          });
        }

        return segments.length > 0 ? segments : part;
      });
    }

    // Parse Phones
    if (parsePhones) {
      parts = parts.flatMap(part => {
        if (part.type !== 'text') return part;

        const segments = [];
        let lastIndex = 0;

        Array.from(part.content.matchAll(phoneRegex)).forEach(match => {
          if (match.index > lastIndex) {
            segments.push({
              type: 'text',
              content: part.content.substring(lastIndex, match.index)
            });
          }
          segments.push({
            type: 'phone',
            content: match[0]
          });
          lastIndex = match.index + match[0].length;
        });

        if (lastIndex < part.content.length) {
          segments.push({
            type: 'text',
            content: part.content.substring(lastIndex)
          });
        }

        return segments.length > 0 ? segments : part;
      });
    }

    // Parse Custom Links
    if (Object.keys(customLinks).length > 0) {
      parts = parts.flatMap(part => {
        if (part.type !== 'text') return part;

        const segments = [];
        let content = part.content;

        Object.entries(customLinks).forEach(([keyword, config]) => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
          const newSegments = [];
          let lastIdx = 0;

          Array.from(content.matchAll(regex)).forEach(match => {
            if (match.index > lastIdx) {
              newSegments.push({
                type: 'text',
                content: content.substring(lastIdx, match.index)
              });
            }
            newSegments.push({
              type: 'custom-link',
              content: match[0],
              url: config.url,
              color: config.color || linkColor
            });
            lastIdx = match.index + match[0].length;
          });

          if (lastIdx < content.length) {
            newSegments.push({
              type: 'text',
              content: content.substring(lastIdx)
            });
          }

          content = newSegments.map(s => s.content).join('');
          segments.push(...newSegments);
        });

        return segments.length > 0 ? segments : part;
      });
    }

    return parts;
  }, [text, parseUrls, parseEmails, parsePhones, customLinks]);

  return (
    <div className={className} dir={dir}>
      {parsedContent.map((part, idx) => {
        switch (part.type) {
          case 'url':
            return (
              <a
                key={idx}
                href={part.content}
                target={newTab ? '_blank' : '_self'}
                rel={newTab ? 'noopener noreferrer' : ''}
                className={`${linkColor} ${linkHoverColor} underline transition-colors cursor-pointer`}
              >
                {part.content}
              </a>
            );

          case 'email':
            return (
              <a
                key={idx}
                href={`mailto:${part.content}`}
                className={`${linkColor} ${linkHoverColor} underline transition-colors cursor-pointer`}
              >
                {part.content}
              </a>
            );

          case 'phone':
            return (
              <a
                key={idx}
                href={`tel:${part.content.replace(/\D/g, '')}`}
                className={`${linkColor} ${linkHoverColor} underline transition-colors cursor-pointer`}
              >
                {part.content}
              </a>
            );

          case 'custom-link':
            return (
              <a
                key={idx}
                href={part.url}
                target={newTab ? '_blank' : '_self'}
                rel={newTab ? 'noopener noreferrer' : ''}
                className={`${part.color} ${linkHoverColor} underline transition-colors cursor-pointer`}
              >
                {part.content}
              </a>
            );

          default:
            return <span key={idx}>{part.content}</span>;
        }
      })}
    </div>
  );
};

// With Markdown support variant
export const MarkdownText = ({ text = '', className = '' }) => {
  const parseMarkdown = (str) => {
    // Bold
    str = str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    str = str.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Links
    str = str.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-blue-500 hover:text-blue-600 underline">$1</a>');
    // Line breaks
    str = str.replace(/\n/g, '<br />');

    return str;
  };

  return (
    <div
      className={`prose dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: parseMarkdown(text) }}
    />
  );
};

export default LinkifiedText;
