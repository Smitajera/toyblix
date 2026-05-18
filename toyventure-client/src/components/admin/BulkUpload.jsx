import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

const BulkUpload = ({ onSuccess }) => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setStatus('');
      setErrors([]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip']
    },
    maxFiles: 1
  });

  const handleUpload = async () => {
    if (!file) {
      setStatus('Please select a file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setIsUploading(true);
    setStatus('Uploading and processing...');
    setErrors([]);

    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/products/bulk-upload`, {
        method: 'POST',
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setStatus(`Success! Inserted ${data.insertedCount || 0} products.`);
        setFile(null);
        if (data.errors && data.errors.length > 0) {
            setErrors(data.errors);
        }
        if (onSuccess) onSuccess();
      } else {
        setStatus(data.message || 'Validation failed for some rows.');
        if (data.errors) setErrors(data.errors);
      }
    } catch (error) {
      setStatus('An error occurred during the upload process.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-red-50 shadow-sm animate-[fadeIn_0.3s_ease-out] mb-8">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-black text-red-950 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600">upload_file</span>
            Bulk Upload Toys (ZIP)
          </h2>
          <p className="text-sm font-bold text-red-950/50 mt-1">
            Upload a single <span className="text-red-600 font-black">.zip</span> file containing your <span className="font-black">products.xlsx</span> (or .csv) file AND all your product image folders.
          </p>
        </div>
        
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-[2rem] p-10 text-center cursor-pointer transition-all ${
            isDragActive ? 'border-red-600 bg-red-50/50 scale-[1.02]' : 'border-red-100 bg-white hover:border-red-300 hover:bg-red-50/20'
          }`}
        >
          <input {...getInputProps()} />
          <span className="material-symbols-outlined text-5xl text-red-950/20 mb-4 block">cloud_upload</span>
          {isDragActive ? (
            <p className="font-black text-red-600 text-lg">Drop the file here ...</p>
          ) : (
            <div>
              <p className="font-bold text-red-950 text-lg">Drag and drop a master .zip file here</p>
              <p className="text-sm font-medium text-red-950/40 mt-2">or click to browse from your computer</p>
            </div>
          )}
        </div>

        {file && (
          <div className="bg-red-50/30 p-4 rounded-2xl border border-red-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-red-600">description</span>
              <span className="font-bold text-red-950 text-sm">{file.name}</span>
            </div>
            <span className="text-xs font-black text-red-950/40 bg-white px-3 py-1 rounded-full border border-red-50">
              {(file.size / 1024).toFixed(1)} KB
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <div className="flex-1">
            {status && (
              <p className={`font-bold text-sm ${status.includes('Success') ? 'text-green-600' : 'text-red-600'}`}>
                {status}
              </p>
            )}
          </div>
          <button 
            onClick={handleUpload} 
            disabled={!file || isUploading}
            className="bg-red-600 text-white px-8 py-3 rounded-2xl font-black shadow-md shadow-red-600/20 hover:bg-red-700 transition-all disabled:opacity-50 hover:-translate-y-1 flex items-center gap-2"
          >
            {isUploading ? (
              <>
                 <span className="material-symbols-outlined animate-spin text-[20px]">autorenew</span>
                 Processing...
              </>
            ) : (
              <>
                 <span className="material-symbols-outlined text-[20px]">check_circle</span>
                 Upload & Import
              </>
            )}
          </button>
        </div>

        {errors.length > 0 && (
          <div className="mt-4 bg-orange-50/50 p-6 rounded-3xl border border-orange-100">
            <h4 className="font-black text-orange-900 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-600 text-[18px]">warning</span>
              Validation Issues
            </h4>
            <p className="text-sm font-bold text-orange-900/60 mb-4">
              Some rows were skipped due to formatting errors. Please fix these in your spreadsheet and upload them again.
            </p>
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {errors.map((err, index) => (
                <li key={index} className="text-xs font-bold text-orange-800 bg-white p-3 rounded-xl border border-orange-50 shadow-sm">
                  {err}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkUpload;