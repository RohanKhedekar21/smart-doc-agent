import { UploadCloud } from 'lucide-react'
import { useRef } from 'react'

export default function UploadZone({ onUpload, isUploading, uploadProgress }) {
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(Array.from(e.dataTransfer.files));
    }
  };

  const progressText = uploadProgress 
    ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...` 
    : 'Processing...';

  return (
    <div 
      className={`flex items-center gap-4 px-5 py-4 border border-dashed rounded-xl transition-all duration-300 cursor-pointer ${
        isUploading 
          ? 'border-accent/50 bg-accent/10 animate-pulse' 
          : 'border-accent/30 bg-accent/5 hover:border-accent hover:bg-accent/10'
      }`}
      onClick={() => !isUploading && inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <UploadCloud size={22} className="text-accent shrink-0 opacity-80" />
      <div className="flex-1">
        <span className="text-sm font-medium">
          {isUploading ? progressText : 'Upload Documents'}
        </span>
        <span className="text-xs text-gray-400 ml-2">PDF, DOCX, XLSX, TXT, CSV</span>
      </div>
      <input 
        ref={inputRef}
        type="file" 
        className="hidden"
        onChange={handleFileChange} 
        accept=".pdf,.txt,.csv,.docx,.xlsx" 
        multiple
      />
    </div>
  )
}
