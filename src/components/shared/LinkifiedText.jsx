import React from 'react';
import { splitTextByLinks } from '../../utils/formatters';

export function LinkifiedText({ text, className = '' }) {

  return (

    <span className={className}>

      {splitTextByLinks(text).map((part, idx) => {

        if (part.type !== 'link') return <React.Fragment key={idx}>{part.value}</React.Fragment>;

        const href = part.value.startsWith('http') ? part.value : `https://${part.value}`;

        return (

          <a key={idx} href={href} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="text-blue-600 underline decoration-2 underline-offset-2 break-all">

            {part.value}

          </a>

        );

      })}

    </span>

  );

}