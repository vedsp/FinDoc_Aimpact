import React, { useState } from 'react';
import { documentApi } from '../services/api';
import { X, Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export const UploadModal = ({ isOpen, onClose, onUploadSuccess }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    validateAndSetFiles(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    validateAndSetFiles(dropped);
  };

  const validateAndSetFiles = (selectedFiles) => {
    setError(null);
    const validExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'csv', 'xlsx', 'xls'];
    const validFiles = [];

    for (const f of selectedFiles) {
      const ext = f.name.split('.').pop().toLowerCase();
      if (!validExtensions.includes(ext)) {
        setError(`Unsupported file format '${ext}'. Select PDF, Image (JPG/PNG/WEBP), CSV, or Excel files.`);
        return;
      }
      if (f.size > 25 * 1024 * 1024) {
        setError(`File '${f.name}' exceeds maximum 25MB limit.`);
        return;
      }
      validFiles.push(f);
    }
    setFiles(validFiles);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setError("Please select at least one document to upload.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const uploadedDocs = await documentApi.upload(formData);
      setSuccessMsg(`Successfully uploaded ${uploadedDocs.length} document(s). Processing extraction.`);
      setFiles([]);
      if (onUploadSuccess) onUploadSuccess();
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white border border-[#999999] w-full max-w-lg shadow-md">
        {/* Header */}
        <div className="px-3 py-2 border-b border-[#cccccc] flex items-center justify-between bg-[#0b3861] text-white">
          <div className="flex items-center gap-1.5 font-bold text-xs">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Tax Evidence & Working Papers</span>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-slate-300 p-0.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-2.5 text-xs">
          {error && (
            <div className="p-2 bg-[#fff1f2] border border-[#fecdd3] text-[#9f1239] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2 bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Upload Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border border-dashed border-[#999999] bg-[#f9fafb] p-4 text-center cursor-pointer"
          >
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp,.tiff,.csv,.xlsx,.xls,image/*"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload-input"
            />
            <label htmlFor="file-upload-input" className="cursor-pointer block">
              <p className="font-bold text-[#0b3861]">
                Click to browse files, drag & drop, or capture invoice photo with camera
              </p>
              <p className="text-[11px] text-[#666666] mt-0.5">
                Supported: PDF, Scanned Bills & Mobile Photos (JPG, PNG, WEBP) — PyMuPDF + Neural OCR Enabled
              </p>
            </label>
          </div>

          {/* Selected File List */}
          {files.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              <div className="font-bold text-[#333333]">Selected Files ({files.length}):</div>
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between bg-[#f4f6f8] border border-[#dddddd] px-2 py-1 text-xs">
                  <span className="font-mono text-[#111111] truncate">{file.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#666666] font-mono">{(file.size / 1024).toFixed(1)} KB</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-[#b91c1c] hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 bg-[#f2f4f7] border-t border-[#cccccc] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading || files.length === 0}
            className="btn-primary text-xs"
          >
            {uploading && <Loader2 className="w-3 h-3 animate-spin" />}
            <span>{uploading ? 'Uploading...' : 'Submit & Ingest'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
