/** Small browser-side CSV helpers shared by the Members/Employees bulk
 * import dialogs — downloading a template and reading an uploaded
 * file's text. No parsing/validation here (that's server-side, see
 * MembersService/EmployeesService.parseImportCsv) — this is purely file
 * I/O in the browser. */

function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Builds a CSV string from a header row and example rows, then
 * triggers a browser download with the given filename. */
export function downloadCsvTemplate(filename: string, headers: string[], exampleRows: string[][]): void {
  const lines = [headers, ...exampleRows].map((row) => row.map(csvField).join(','));
  const content = lines.join('\n') + '\n';
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Reads a File (from an <input type="file"> change event) as text. */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/** Turns an already-fetched Blob (e.g. a PDF streamed via HttpClient
 * with `responseType: 'blob'`, since a plain <a href> can't carry the
 * JWT auth header a download endpoint needs) into a browser save
 * dialog, the same object-URL-then-click trick as downloadCsvTemplate
 * above. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
