import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

const FileManager = () => {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState([]);
  const [selectedFileContent, setSelectedFileContent] = useState('');
  const [selectedFilePath, setSelectedFilePath] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const auth = getAuth();
  const functions = getFunctions();

  const listFilesCallable = httpsCallable(functions, 'listFiles');
  const readFileCallable = httpsCallable(functions, 'readFile');
  const writeFileCallable = httpsCallable(functions, 'writeFile');

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath]);

  const fetchFiles = async (path) => {
    setLoading(true);
    setError('');
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('No user logged in.');
        setLoading(false);
        return;
      }

      const idToken = await user.getIdToken();
      const response = await listFilesCallable({ path, idToken });
      if (response.data.error) {
        setError(response.data.error);
      } else {
        setFiles(response.data.files);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Failed to fetch files: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = async (file) => {
    if (file.isDirectory) {
      setCurrentPath(prevPath => (prevPath === '/' ? file.name : `${prevPath}/${file.name}`));
      setSelectedFileContent('');
      setSelectedFilePath('');
      setIsEditing(false);
    } else {
      setLoading(true);
      setError('');
      try {
        const user = auth.currentUser;
        if (!user) {
          setError('No user logged in.');
          setLoading(false);
          return;
        }

        const idToken = await user.getIdToken();
        const filePath = currentPath === '/' ? file.name : `${currentPath}/${file.name}`;
        const response = await readFileCallable({ path: filePath, idToken });
        if (response.data.error) {
          setError(response.data.error);
        } else {
          setSelectedFileContent(response.data.content);
          setSelectedFilePath(filePath);
          setEditContent(response.data.content);
          setIsEditing(false);
        }
      } catch (err) {
        console.error('Error reading file:', err);
        setError('Failed to read file: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveFile = async () => {
    setLoading(true);
    setError('');
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('No user logged in.');
        setLoading(false);
        return;
      }

      const idToken = await user.getIdToken();
      const response = await writeFileCallable({ path: selectedFilePath, content: editContent, idToken });
      if (response.data.error) {
        setError(response.data.error);
      } else {
        setSelectedFileContent(editContent);
        setIsEditing(false);
        alert('Archivo guardado exitosamente.');
      }
    } catch (err) {
      console.error('Error saving file:', err);
      setError('Failed to save file: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (currentPath !== '/') {
      const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
      setCurrentPath(parentPath);
      setSelectedFileContent('');
      setSelectedFilePath('');
      setIsEditing(false);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6 border-b-2 border-blue-500 pb-2">Gestor de Archivos</h2>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 shadow-md" role="alert">{error}</div>}
      {loading && <div className="text-blue-600 text-lg font-medium mb-4 animate-pulse">Cargando...</div>}

      <div className="flex items-center mb-6 bg-white p-3 rounded-lg shadow-sm">
        <button 
          onClick={handleGoBack} 
          disabled={currentPath === '/'} 
          className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 ease-in-out mr-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Volver
        </button>
        <span className="text-lg font-medium text-gray-700">Ruta actual: <span className="font-semibold text-blue-700">{currentPath}</span></span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-xl font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">Archivos y Carpetas</h3>
          <ul className="h-96 overflow-y-auto border border-gray-200 rounded-md bg-gray-50">
            {files.length === 0 && !loading && <p className="p-4 text-gray-500">No hay archivos o carpetas en esta ruta.</p>}
            {files.map((file, index) => (
              <li 
                key={index} 
                className={`flex items-center p-2 cursor-pointer hover:bg-blue-50 transition duration-150 ease-in-out ${selectedFilePath === (currentPath === '/' ? file.name : `${currentPath}/${file.name}`) && !file.isDirectory ? 'bg-blue-100 border-l-4 border-blue-500' : ''}`} 
                onClick={() => handleFileClick(file)}
              >
                {file.isDirectory ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0  012-2h4.586A2 2 0 0113 3.414L16.586 7A2 2 0 0117 8.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm4 6a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm0 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="text-gray-800 font-medium">{file.name}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-xl font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">Contenido del Archivo</h3>
          {selectedFilePath && (
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium text-gray-700">Archivo: <span className="font-semibold text-blue-700">{selectedFilePath}</span></span>
              <div>
                <button 
                  onClick={() => setIsEditing(!isEditing)} 
                  className={`px-4 py-2 rounded-md text-white font-medium transition duration-200 ease-in-out ${isEditing ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} mr-2`}
                >
                  {isEditing ? 'Cancelar Edición' : 'Editar'}
                </button>
                {isEditing && (
                  <button 
                    onClick={handleSaveFile} 
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 font-medium transition duration-200 ease-in-out"
                  >
                    Guardar
                  </button>
                )}
              </div>
            </div>
          )}
          {selectedFileContent ? (
            isEditing ? (
              <textarea
                className="w-full h-96 border border-gray-300 rounded-md p-3 font-mono text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              ></textarea>
            ) : (
              <pre className="w-full h-96 border border-gray-300 rounded-md p-3 bg-gray-50 overflow-auto font-mono text-sm text-gray-800 whitespace-pre-wrap">{selectedFileContent}</pre>
            )
          ) : (
            <p className="text-gray-500 p-4 bg-gray-50 rounded-md border border-gray-200">Selecciona un archivo para ver su contenido.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileManager;
