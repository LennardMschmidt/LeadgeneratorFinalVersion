import * as XLSX from 'xlsx';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const exportRowsToExcel = (
  headers: string[],
  rows: string[][],
  fileName: string,
) => {
  const worksheetRows = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
  XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
};

export const exportRowsToPdf = (
  title: string,
  headers: string[],
  rows: string[][],
) => {
  const headerCells = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('');
  const bodyRows = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`,
    )
    .join('');

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
    h1 { font-size: 18px; margin: 0 0 12px 0; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px; vertical-align: top; text-align: left; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;

  // Use a hidden iframe so browser print opens directly without leaving an about:blank tab.
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const frameDocument = iframe.contentDocument;
  if (!frameDocument || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    return;
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  window.setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 1500);
  }, 150);
};
