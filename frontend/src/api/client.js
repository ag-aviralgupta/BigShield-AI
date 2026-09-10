import axios from 'axios'
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', timeout: 12000 })
export const getTenders = () => api.get('/tenders').then(r => r.data)
export const getTenderIntelligence = id => api.get(`/tenders/${id}/intelligence`).then(r => r.data)
export const uploadTender = ({ title, tenderNumber, description, document }) => { const form = new FormData(); form.append('title', title); form.append('tenderNumber', tenderNumber); form.append('description', description); form.append('document', document); return api.post('/tenders/upload', form).then(r => r.data) }
export const getRequirements = id => api.get(`/requirements/${id}`).then(r => r.data)
export const getBidders = id => api.get(`/bidders/${id}`).then(r => r.data)
export const createBidder = data => api.post('/bidders', data).then(r => r.data)
export const getBidderSummaries = id => api.get(`/bidders/${id}/summary`).then(r => r.data)
export const getDocuments = id => api.get(`/documents/bidder/${id}`).then(r => r.data)
export const getCompliance = id => api.get(`/compliance/bidder/${id}`).then(r => r.data)
export const uploadDocument = (bidderId, documentType, document) => { const form = new FormData(); form.append('bidderId', bidderId); form.append('documentType', documentType); form.append('document', document); return api.post('/documents/upload', form).then(r => r.data) }
const endpoint = { GST:'verify-gst', PAN:'verify-pan', ITR:'verify-itr', OEM_AUTHORIZATION:'verify-oem', LOCAL_CONTENT:'verify-local-content', EXPERIENCE:'verify-experience', UDYAM:'verify-udyam' }
export const verifyDocument = (id, type) => api.post(`/documents/${id}/${endpoint[type]}`).then(r => r.data)
export const verifyBlacklist = id => api.post(`/bidders/${id}/verify-blacklist`).then(r => r.data)
export const saveOfficerDecision = (id, decision, remarks) => api.post(`/compliance/bidder/${id}/decision`, { decision, remarks }).then(r => r.data)
