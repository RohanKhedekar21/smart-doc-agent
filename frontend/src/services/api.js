import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api/v1';

// ── Sessions ──────────────────────────────────────────────────────

export const getSessions = async () => {
    const res = await axios.get(`${API_URL}/sessions`);
    return res.data;
};

export const createSession = async () => {
    const res = await axios.post(`${API_URL}/sessions`);
    return res.data;
};

export const renameSession = async (sessionId, name) => {
    const res = await axios.patch(`${API_URL}/sessions/${sessionId}`, { name });
    return res.data;
};

export const deleteSession = async (sessionId) => {
    const res = await axios.delete(`${API_URL}/sessions/${sessionId}`);
    return res.data;
};

// ── Documents ─────────────────────────────────────────────────────

export const getDocuments = async (sessionId) => {
    const res = await axios.get(`${API_URL}/sessions/${sessionId}/documents`);
    return res.data;
};

export const uploadFile = async (sessionId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`${API_URL}/sessions/${sessionId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
};

export const deleteDocument = async (sessionId, docId) => {
    const res = await axios.delete(`${API_URL}/sessions/${sessionId}/documents/${docId}`);
    return res.data;
};

// ── AI Chat Engine & History ───────────────────────────────────────

export const getMessages = async (sessionId) => {
    const res = await axios.get(`${API_URL}/sessions/${sessionId}/messages`);
    return res.data;
};

export const chatWithSession = async (sessionId, message) => {
    const res = await axios.post(`${API_URL}/sessions/${sessionId}/chat`, { message });
    return res.data;
};

// ── Data Extraction ───────────────────────────────────────────────

export const extractData = async (sessionId, message) => {
    const res = await axios.post(`${API_URL}/sessions/${sessionId}/extract`, { message });
    return res.data;
};
