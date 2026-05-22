import axios from 'axios';

const API_URL = import.meta.env.BACKEND_API_URL || 'http://localhost:8000/api/v1';

// Create an axios instance with credentials enabled for HttpOnly cookies
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

// ── Auth ──────────────────────────────────────────────────────────

export const getMe = async () => {
    const res = await api.get('/auth/me');
    return res.data;
};

export const logout = async () => {
    const res = await api.post('/auth/logout');
    return res.data;
};

export const getLoginUrl = () => `${API_URL}/auth/login`;

// ── Sessions ──────────────────────────────────────────────────────

export const getSessions = async () => {
    const res = await api.get('/sessions');
    return res.data;
};

export const createSession = async () => {
    const res = await api.post('/sessions');
    return res.data;
};

export const renameSession = async (sessionId, name) => {
    const res = await api.patch(`/sessions/${sessionId}`, { name });
    return res.data;
};

export const deleteSession = async (sessionId) => {
    const res = await api.delete(`/sessions/${sessionId}`);
    return res.data;
};

// ── Documents ─────────────────────────────────────────────────────

export const getDocuments = async (sessionId) => {
    const res = await api.get(`/sessions/${sessionId}/documents`);
    return res.data;
};

export const uploadFile = async (sessionId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(`/sessions/${sessionId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
};

export const deleteDocument = async (sessionId, docId) => {
    const res = await api.delete(`/sessions/${sessionId}/documents/${docId}`);
    return res.data;
};

// ── AI Chat Engine & History ───────────────────────────────────────

export const getMessages = async (sessionId) => {
    const res = await api.get(`/sessions/${sessionId}/messages`);
    return res.data;
};

export const chatWithSession = async (sessionId, message) => {
    const res = await api.post(`/sessions/${sessionId}/chat`, { message });
    return res.data;
};

// ── Data Extraction ───────────────────────────────────────────────

export const extractData = async (sessionId, message) => {
    const res = await api.post(`/sessions/${sessionId}/extract`, { message });
    return res.data;
};

// ── Document Comparison ───────────────────────────────────────────

export const compareDocuments = async (sessionId, doc1Filename, doc2Filename, query) => {
    const res = await api.post(`/sessions/${sessionId}/compare`, {
        doc1_filename: doc1Filename,
        doc2_filename: doc2Filename,
        query: query
    });
    return res.data;
};
