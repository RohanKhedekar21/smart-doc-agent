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

  const progressTextMobile = uploadProgress 
    ? `${uploadProgress.current}/${uploadProgress.total}` 
    : '...';

  return (
    <div 
      className={`flex items-center justify-center gap-1 border border-dashed rounded-xl transition-all duration-300 cursor-pointer shrink-0 ${
        isUploading 
          ? 'border-accent/50 bg-accent/10 animate-pulse px-2 py-1.5' 
          : 'border-accent/30 bg-accent/5 hover:border-accent hover:bg-accent/10 p-2 md:px-4 md:py-2.5'
      }`}
      onClick={() => !isUploading && inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <UploadCloud className="text-accent shrink-0 opacity-80 w-4 h-4 md:w-[18px] md:h-[18px]" />
      
      {isUploading && (
        <span className="text-[10px] font-semibold text-accent md:hidden">
          {progressTextMobile}
        </span>
      )}

      <div className="hidden md:block min-w-0">
        <span className="text-xs md:text-sm font-medium truncate block">
          {isUploading ? progressText : 'Upload Documents'}
        </span>
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
