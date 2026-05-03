import { useState, useRef } from 'react';

export interface ImportResult {
  imported: number;
  errors: string[];
}

export interface BulkImportModalProps {
  title: string;
  /** Column headers shown in the preview table */
  columns: string[];
  /** Sample lines shown to the user (without header row) */
  example: string;
  /** Filename for the downloadable CSV template */
  templateFilename: string;
  /** Called once user confirms — receives array of trimmed row arrays */
  onImport: (rows: string[][]) => Promise<ImportResult>;
  onClose: () => void;
}

/** Parse a raw text block into rows of columns. Supports comma- and tab-separated values. */
function parseCSV(raw: string): string[][] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => {
      // Prefer tab-separation if any tab is present; else comma
      const sep = line.includes('\t') ? '\t' : ',';
      return line.split(sep).map((cell) => cell.trim());
    });
}

/** Build a blob URL for a CSV template download */
function buildTemplateURL(columns: string[], example: string): string {
  const header = columns.join(',');
  const content = `${header}\n${example}`;
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  return URL.createObjectURL(blob);
}

export default function BulkImportModal({
  title,
  columns,
  example,
  templateFilename,
  onImport,
  onClose,
}: BulkImportModalProps) {
  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState<string[][] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const templateUrl = useRef(buildTemplateURL(columns, example));

  function handleParse() {
    const rows = parseCSV(rawText);
    if (rows.length === 0) return;
    setPreview(rows);
    setResult(null);
  }

  async function handleImport() {
    if (!preview || preview.length === 0) return;
    setImporting(true);
    const res = await onImport(preview);
    setImporting(false);
    setResult(res);
    if (res.imported > 0) {
      setPreview(null);
      setRawText('');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-card border border-card-border rounded-2xl shadow-xl w-full max-w-2xl mt-8 mb-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm space-y-2">
            <p className="font-semibold text-blue-800">📋 تعليمات الاستيراد</p>
            <p className="text-blue-700">
              الصق البيانات أو اكتبها في المربع أدناه. كل سطر يمثل صفاً واحداً، والأعمدة مفصولة بـ
              <span className="font-mono bg-blue-100 px-1 rounded mx-1">,</span> أو بمسافة جدولة.
            </p>
            <p className="text-blue-700">
              الترتيب المطلوب:{' '}
              <span className="font-semibold">{columns.join(' ← ')}</span>
            </p>
            <p className="text-xs text-blue-600">
              مثال:
              <span className="font-mono block mt-1 bg-blue-100 rounded p-1.5 whitespace-pre-wrap">{example}</span>
            </p>
          </div>

          {/* Download template */}
          <a
            href={templateUrl.current}
            download={templateFilename}
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
          >
            ⬇️ تنزيل نموذج CSV
          </a>

          {/* Textarea */}
          {!result && (
            <div>
              <label className="block text-sm font-medium mb-1.5">البيانات</label>
              <textarea
                value={rawText}
                onChange={(e) => { setRawText(e.target.value); setPreview(null); }}
                rows={8}
                placeholder={`الصق البيانات هنا...\n${example}`}
                dir="auto"
                className="w-full px-3 py-2 border border-input rounded-xl bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              />
              <p className="text-xs text-muted-foreground mt-1">
                يمكنك نسخ الصفوف مباشرة من Excel أو Google Sheets (فصل بمسافة جدولة)
              </p>
            </div>
          )}

          {/* Parse button */}
          {!result && !preview && (
            <button
              onClick={handleParse}
              disabled={!rawText.trim()}
              className="min-h-[44px] px-5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-40"
            >
              معاينة البيانات
            </button>
          )}

          {/* Preview table */}
          {preview && !result && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">
                  معاينة — {preview.length} صف
                </p>
                <button
                  onClick={() => setPreview(null)}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  تعديل البيانات
                </button>
              </div>
              <div className="border border-border rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-right text-muted-foreground font-medium">#</th>
                      {columns.map((col) => (
                        <th key={col} className="px-3 py-2 text-right font-semibold">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className={`border-t border-border ${row.length < columns.length ? 'bg-yellow-50' : ''}`}>
                        <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                        {columns.map((_, j) => (
                          <td key={j} className="px-3 py-1.5">{row[j] ?? <span className="text-red-400">—</span>}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex-1 min-h-[48px] bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 disabled:opacity-50"
                >
                  {importing ? `جارٍ الاستيراد (${preview.length} صف)...` : `استيراد ${preview.length} صف`}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 min-h-[48px] border border-border rounded-xl font-medium hover:bg-muted"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              {result.imported > 0 && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-semibold text-green-800">تم الاستيراد بنجاح</p>
                    <p className="text-sm text-green-700">تم إضافة {result.imported} صف</p>
                  </div>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="font-semibold text-red-800 mb-2">
                    ⚠️ {result.errors.length} خطأ
                  </p>
                  <ul className="text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto">
                    {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                  </ul>
                </div>
              )}
              <button
                onClick={onClose}
                className="w-full min-h-[48px] bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90"
              >
                إغلاق
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
