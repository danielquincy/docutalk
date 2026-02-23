import React, { useCallback, useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Use a stable version from CDN for the worker to avoid bundling issues in the preview environment
const PDFJS_VERSION = '4.4.168';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

interface Props {
  onUpload: (content: string, fileName: string) => void;
}

export const DocumentUploader: React.FC<Props> = ({ onUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      let content = '';
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
        }
        content = fullText;
      } else if (file.type === 'text/plain' || file.name.endsWith('.md')) {
        content = await file.text();
      } else {
        throw new Error('Formato de archivo no soportado. Por favor sube un PDF o archivo de texto.');
      }

      if (!content.trim()) {
        throw new Error('El archivo parece estar vacío.');
      }

      onUpload(content, file.name);
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo');
    } finally {
      setIsLoading(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-8">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`
          relative border-2 border-dashed rounded-3xl p-12 transition-all duration-300
          flex flex-col items-center justify-center gap-4 text-center
          ${isDragging ? 'border-indigo-500 bg-indigo-50/50' : 'border-zinc-200 hover:border-indigo-300'}
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          type="file"
          accept=".pdf,.txt,.md"
          onChange={onFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className={`p-4 rounded-full ${isDragging ? 'bg-indigo-100' : 'bg-zinc-100'}`}>
          {isLoading ? (
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          ) : (
            <Upload className={`w-10 h-10 ${isDragging ? 'text-indigo-500' : 'text-zinc-400'}`} />
          )}
        </div>

        <div>
          <h3 className="text-xl font-semibold text-zinc-900">Sube tu documento</h3>
          <p className="text-zinc-500 mt-1">Arrastra y suelta o haz clic para seleccionar (PDF, TXT, MD)</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-rose-500 bg-rose-50 px-4 py-2 rounded-full text-sm mt-4">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
