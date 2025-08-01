(function () {

  const isBold = node =>
    /^(STRONG|B)$/.test( node.tagName )
    || node.style?.fontWeight > 400;

  const isItalic = node =>
    /^(EM|I|CITE|VAR)$/.test( node.tagName )
    || node.style?.fontStyle == 'italic';

  const converters = [
    {
      filter: node => !node.textContent.trim(),
      replacement: () => '' // Ignore nodes with only whitespace
    },
    {
      filter: node => /^H[1-6]$/.test( node.tagName ),
      replacement: (text, node) =>
        `${ '#'.repeat( node.tagName[1] ) } ${text}\n\n`
    },
    {
      filter: node =>
        node.textContent
        && ( isBold(node) || isItalic(node) ),
      replacement: (text, node) => {

        const lead = text.match(/^\s+/)?.[0] || [''];
        const trail = text.match(/\s+$/)?.[0] || [''];

        if ( lead || trail ) {
          text = text.trim();
        }

        if ( isBold( node ) ) text = `**${text}**`;
        if ( isItalic( node ) ) text = `_${text}_`;

        return `${ lead }${ text }${ trail }`;

      }
    },
    {
      filter: ['sub', 'sup'],
      replacement: (text, node) =>
        node.tagName === 'sub' ? `~${text}~` : `^${text}^`
    },
    {
      filter: ['hr', 'br'],
      replacement: (_, node) =>
        node.tagName === 'HR' ? `\n\n* * * * *\n\n` : `\n`
    },
    {
      filter: node => {
        const hasSiblings = node.previousSibling || node.nextSibling;
        const isCodeBlock = node.parentNode.tagName === 'PRE' && !hasSiblings;
        const isCodeElem = /^(CODE|KBD|SAMP|TT)$/.test( node.tagName );

        return isCodeElem && !isCodeBlock;
      },
      replacement: text => `\`${text}\``
    },
    {
      filter: (node) =>
        node.tagName === 'A'
        && node.getAttribute('href'),
      replacement: (text, node) => {

        /**
         * Automatically upgrade all http: instances to https:
         */
        if ( node.getAttribute("href").startsWith("http:") ) {
          const href = node.getAttribute("href");
          node.setAttribute("href", href.replace(/^http:/, 'https:'));
        }

        /**
         * If #noAbsoluteBraveURLs is checked, replace absolute
         * Brave URLs with relative URLs.
         */
        const noAbs = document.querySelector('#noAbsoluteBraveURLs');
        if (noAbs.checked) {
          let url = node.getAttribute('href');
          /**
           * Check if this is a Brave URL.
           */
          if (url.includes('brave.com')) {
            /**
             * Increment the number of replacements.
             */
            noAbs.parentElement.dataset.removed = parseInt(noAbs.parentElement.dataset.removed || 0) + 1;
            url = url.replace(/https?:\/\/brave\.com\//, '/');
            node.setAttribute('href', url);
          }
        }

        let replacement;
        let url = node.getAttribute('href');
        const lead = text.match(/^\s+/)?.[0] || [''];
        const trail = text.match(/\s+$/)?.[0] || [''];
        const title = node.title ? ` "${node.title}"` : '';

        if ( lead || trail ) {
          text = text.trim();
        }

        if (url === text) {
          replacement = `<${url}>`;
        } else if (url === `mailto:${text}`) {
          replacement = `<${text}>`;
        } else {
          replacement = `[${text}](${url}${title})`;
        }

        /**
         * Move leading/trailing spaces out of content
         * ✖ please [download ](https://brave.com)Brave
         * ✖ please[ download](https://brave.com) Brave
         * ✖ please[ download ](https://brave.com)Brave
         * ✔ please [download](https://brave.com) Brave
         */
        replacement = `${ lead }${ replacement }${ trail }`;

        return replacement;

      }
    },
    {
      filter: 'li',
      replacement: (content, node) => {
        content = content.replace(/^\s+/, '').replace(/\n/gm, '\n    ');
        let prefix = '-   ';
        const parent = node.parentNode;
        if ("OL" == parent.tagName) {
          const index = [...parent.children].indexOf(node) + 1;
          prefix = `${index}. `.padEnd(4, ' ');
        }
        return prefix + content;
      }
    }
  ];

  const escape = str =>
    str.replace(/[\u2018\u2019\u00b4]/g, "'")
       .replace(/[\u201c\u201d\u2033]/g, '"')
       .replace(/[\u2212\u2022\u00b7\u25aa]/g, '-')
       .replace(/[\u2013\u2015]/g, '--')
       .replace(/\u2014/g, '---')
       .replace(/\u2026/g, '...')
       .replace(/[ ]+\n/g, '\n')
       .replace(/\s*\\\n/g, '\\\n')
       .replace(/\s*\\\n\s*\\\n/g, '\n\n')
       .replace(/\s*\\\n\n/g, '\n\n')
       .replace(/\n-\n/g, '\n')
       .replace(/\n\n\s*\\\n/g, '\n\n')
       .replace(/\n\n\n*/g, '\n\n')
       .replace(/[ ]+$/gm, '')
       .replace(/^\s+|[\s\\]+$/g, '');

  const convert = str =>
    escape( toMarkdown( str, { converters, gfm: true } ) );

  document.addEventListener('DOMContentLoaded', () => {

    const pastebin = document.querySelector('#pastebin');
    const output = document.querySelector('#output');

    document.addEventListener('keydown', ({ key, ctrlKey, metaKey }) => {
      if (( ctrlKey || metaKey ) && key === 'v') {
          pastebin.innerHTML = '';
          pastebin.focus();
      }
    });

    /**
     * For notes on setTimeout(fn, 0), see
     * https://developer.mozilla.org/en-US/docs/Web/API/Window/setImmediate#notes,
     * and https://stackoverflow.com/a/779785/54680.
     */
    pastebin.addEventListener('paste', () => 
      setTimeout(() => {
        const html = pastebin.innerHTML;
        const markdown = convert(html);
        output.textContent = markdown;
        output.focus();
        output.select();
      }, 0)
    );

  });

})();
