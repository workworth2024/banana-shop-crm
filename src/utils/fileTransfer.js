/**
 * XMLHttpRequest с прогрессом (cookie-сессия CRM).
 */

export function xhrPostFormData(url, formData, { onUploadProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onUploadProgress) {
        onUploadProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      }
    };
    xhr.onload = () => {
      let data = {};
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        data = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onUploadProgress) onUploadProgress(100);
        resolve(data);
      } else {
        reject(new Error(data.message || `HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Ошибка сети'));
    xhr.send(formData);
  });
}

export function xhrDownloadBlob(url, { onDownloadProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.withCredentials = true;
    xhr.responseType = 'blob';
    xhr.onprogress = (e) => {
      if (e.lengthComputable && onDownloadProgress) {
        onDownloadProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onDownloadProgress) onDownloadProgress(100);
        resolve(xhr.response);
      } else {
        reject(new Error('Ошибка скачивания'));
      }
    };
    xhr.onerror = () => reject(new Error('Ошибка сети'));
    xhr.send();
  });
}
