import React, { useEffect, useState, useRef } from 'react';
import { useSelector, shallowEqual, useDispatch } from 'react-redux';
import fire from '../../../config/firebase';
import { addFile } from '../../../redux/actionCreators/fileFolderActionCreator';

const UploadFile = ({ setIsFileUploadModelOpen }) => {
  const [files, setFiles] = useState([]); // Use an array to store multiple files
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef(null);

  const { user, userFiles, currentFolder, currentFolderData } = useSelector(
    (state) => ({
      userFiles: state.filefolders.userFiles,
      user: state.auth.user,
      currentFolder: state.filefolders.currentFolder,
      currentFolderData: state.filefolders.userFolders.find(
        (folder) => folder.docId === state.filefolders.currentFolder
      ),
    }),
    shallowEqual
  );

  const dispatch = useDispatch();

  useEffect(() => {
    if (success) {
      setFiles([]);
      setSuccess(false);
      setIsFileUploadModelOpen(false);
    }
  }, [success]);

  const checkFileAlreadyPresent = (name) => {
    const filePresent = userFiles
      .filter((file) => file.data.parent === currentFolder)
      .find((fldr) => fldr.data.name === name);
    return !filePresent;
  };

  const uploadFile = async (file) => {
    try {
      const data = {
        createdAt: new Date(),
        name: file.name,
        userId: user.uid,
        createdBy: user.displayName,
        path:
          currentFolder === 'root'
            ? []
            : [...currentFolderData?.data.path, currentFolder],
        parent: currentFolder,
        lastAccessed: null,
        updatedAt: new Date(),
        extension: file.name.split('.')[1],
        data: null,
        url: '',
      };

      const uploadFileRef = fire.storage().ref(`files/${data.userId}/${data.name}`);
      await uploadFileRef.put(file);

      const fileUrl = await uploadFileRef.getDownloadURL();
      const fullData = { ...data, url: fileUrl };

      const fileDocRef = await fire.firestore().collection('files').add(fullData);
      const fileData = (await fileDocRef.get()).data();
      const fileId = fileDocRef.id;
      dispatch(addFile({ data: fileData, docId: fileId }));

      return { success: true, name: file.name };
    } catch (error) {
      console.error('Error uploading file:', error);
      return { success: false, name: file.name };
    }
  };

  const handleFileInputChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  const handleSelectAll = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (files.length > 0) {
      const successfulUploads = [];
      const unsuccessfulUploads = [];

      for (let i = 0; i < files.length; i++) {
        const result = await uploadFile(files[i]);
        if (result.success) {
          successfulUploads.push(result.name);
        } else {
          unsuccessfulUploads.push(result.name);
        }
      }

      if (successfulUploads.length > 0) {
        alert(`Files uploaded successfully: ${successfulUploads.join(', ')}`);
      }

      if (unsuccessfulUploads.length > 0) {
        alert(`Failed to upload files: ${unsuccessfulUploads.join(', ')}`);
      }
    } else {
      alert('Please select at least one file.');
    }
  };

  return (
    <div className="col-md-12 position-fixed top-0 left-0 w-100 h-100" style={{ background: 'rgba(0,0,0,0.4)', zIndex: 9999 }}>
      <div className="row align-items-center justify-content-center">
        <div className="col-md-4 mt-5 bg-white rounded p-4">
          <div className="d-flex justify-content-between">
            <h4>Upload File</h4>
            <button className="btn" onClick={() => setIsFileUploadModelOpen(false)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <hr />
          <div className="d-flex flex-column align-items-center">
            <form className="mt-3 w-100" onSubmit={handleSubmit}>
              <div className="form-group">
                <input
                  type="file"
                  className="form-control"
                  id="folderName"
                  onChange={handleFileInputChange}
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  multiple
                />
              </div>
              <button type="button" className="btn btn-primary mt-2" onClick={handleSelectAll}>
                Select All Files (Ctrl+A)
              </button>
              <button type="Submit" className="btn btn-primary mt-2">
                Upload Files
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadFile;
