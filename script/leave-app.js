
function getTodayLocalISO() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
function applyLeaveDateMinimum() {
    const today = getTodayLocalISO();
    document.querySelectorAll('input[type="date"]').forEach(el => {
        if (!el.hasAttribute('data-allow-past')) el.min = today;
    });
}

// ========== STAFF DATA LOADED FROM FIRESTORE ==========
// ========== FIREBASE ==========
let db = null;
let firebaseConnected = false;
let staffData = [];
let currentLoggedInStaff = null;
let pendingAuthResolve = null;
let pendingAuth = { staff: null, viewType: null, selectEl: null, prevDropdownValue: null };
let staffLoaded = false;
let isStaffLoading = false;
let searchTimeout = null;
let isDropdownOpen = false;
let dropdownList = null;
let searchInput = null;

// ========== SESSION KEY ==========
const SESSION_KEY = 'koveliUser';
const LEGACY_SESSION_KEY = 'staffPortalSession';

function normalizePortalUser(user) {
    if (!user || typeof user !== 'object') return null;

    const username = String(
        user.username ||
        user.userName ||
        ''
    ).trim().toLowerCase();

    const id = String(
        user.id ||
        user.uid ||
        user.staffId ||
        user.rcno ||
        username
    ).trim();

    if (!id && !username) return null;

    return {
        ...user,
        id: id || username,
        rcno: String(user.rcno || user.staffId || id || username),
        username,
        name: String(user.name || user.fullName || username || 'Staff'),
        role: String(user.role || 'staff'),
        contact: String(user.contact || user.phone || ''),
        email: String(user.email || ''),
        pass: String(user.pass || user.pin || ''),
        pattern: String(user.pattern || ''),
        active:
            user.active !== false &&
            String(user.status || 'active').toLowerCase() !== 'disabled'
    };
}

function getUserJsUsers() {
    const candidates = [
        window.KOVELI_USERS,
        window.USERS,
        window.users,
        window.USER_DATA,
        window.userData
    ];

    for (const list of candidates) {
        if (Array.isArray(list)) {
            return list
                .map(normalizePortalUser)
                .filter(Boolean);
        }
    }

    return [];
}

// ========== APP VERSION ==========
const APP_VERSION = '2.1';

// Make currentLoggedInStaff globally accessible
window.currentLoggedInStaff = currentLoggedInStaff;
window.staffList = [];

// ========== GET SESSION ==========
function getSession() {
    const keys = [
        'koveliUser',
        'koveliActiveSession',
        LEGACY_SESSION_KEY,
        'koveliUserSession',
        'userSession'
    ];

    for (const key of keys) {
        try {
            const raw =
                sessionStorage.getItem(key) ||
                localStorage.getItem(key);

            if (!raw) continue;

            const session = JSON.parse(raw);
            if (!session || typeof session !== 'object') continue;

            if (
                session.timestamp &&
                Date.now() - Number(session.timestamp) > 24 * 60 * 60 * 1000
            ) {
                sessionStorage.removeItem(key);
                localStorage.removeItem(key);
                continue;
            }

            const username = String(
                session.username ||
                session.userName ||
                ''
            ).trim().toLowerCase();

            let approvedUser = null;

            if (
                username &&
                typeof window.getKoveliUserByUsername === 'function'
            ) {
                approvedUser =
                    window.getKoveliUserByUsername(username);
            }

            if (!approvedUser && username) {
                approvedUser =
                    getUserJsUsers().find(
                        u =>
                            String(u.username || '')
                                .trim()
                                .toLowerCase() === username
                    ) || null;
            }

            // New Koveli login: use the authorized user.js record,
            // merged with the active session.
            if (approvedUser) {
                const normalized =
                    normalizePortalUser({
                        ...approvedUser,
                        ...session,
                        username:
                            approvedUser.username ||
                            username,
                        name:
                            approvedUser.name ||
                            session.name ||
                            username,
                        role:
                            approvedUser.role ||
                            session.role ||
                            'staff'
                    });

                if (normalized && normalized.active) {
                    return normalized;
                }
            }

            // Compatibility for already-active legacy sessions.
            const legacy =
                normalizePortalUser(session);

            if (legacy && legacy.active) {
                return legacy;
            }

        } catch (error) {
            console.warn(
                'Unable to read portal session:',
                key,
                error
            );
        }
    }

    return null;
}


// ========== HELPER: GET GMT+5 DATE/TIME ==========
function getGMT5DateTime() {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const gmt5Time = new Date(utcTime + (5 * 60 * 60 * 1000));
    return gmt5Time;
}

function getGMT5DateString() {
    const dt = getGMT5DateTime();
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getGMT5TimeString() {
    const dt = getGMT5DateTime();
    const hours = String(dt.getHours()).padStart(2, '0');
    const minutes = String(dt.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function getGMT5DateTimeString() {
    const dt = getGMT5DateTime();
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const hours = String(dt.getHours()).padStart(2, '0');
    const minutes = String(dt.getMinutes()).padStart(2, '0');
    const seconds = String(dt.getSeconds()).padStart(2, '0');
    const ampm = dt.getHours() >= 12 ? 'PM' : 'AM';
    const hour12 = dt.getHours() % 12 || 12;
    return `${month}/${day}/${year} ${hour12}:${minutes}:${seconds} ${ampm}`;
}

// ========== FIREBASE INITIALIZATION ==========
function initFirebase() {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        try {
            db = firebase.firestore();
            firebaseConnected = true;
            console.log("✅ Firebase connected");
            return true;
        } catch (error) { 
            console.error("Firestore error:", error);
            return false;
        }
    }
    return false;
}

// ========== STAFF DATA FUNCTIONS ==========
function getStaffById(id) {
    return staffData.find(s => s.id === id);
}

function getStaffByName(name) {
    return staffData.find(s => s.name === name);
}

// ========== LOAD SPECIFIC STAFF CREDENTIALS ==========
async function loadSpecificStaffCredentials(staffId) {
    if (!db || !firebaseConnected) {
        const staff = staffData.find(s => s.id === staffId);
        return !!staff;
    }
    
    try {
        const doc = await db.collection('staff').doc(staffId).get();
        if (doc.exists) {
            const data = doc.data();
            const staff = staffData.find(s => s.id === staffId);
            if (staff) {
                staff.pass = data.pass || staff.pass || '';
                staff.pattern = data.pattern || staff.pattern || '';
                staff.email = data.email || staff.email || '';
                staff.sickLeave = data.sickLeave ?? 30;
                staff.frlBalance = data.frlBalance ?? 5;
                staff.frlRenewal = data.frlRenewal || null;
            }
            return true;
        }
        return false;
    } catch (e) {
        console.warn('Load staff credentials error:', e);
        return false;
    }
}

// ========== EMAIL DISABLED ==========
// Leave requests and approvals are handled entirely inside the staff portal.

// ========== LEAVE REQUEST MANAGER ==========
class LeaveRequestManager {
    constructor() {
        this.requests = [];
        this.isLoaded = false;
    }

    static STATUS = {
        PENDING: 'pending',
        APPROVED: 'approved',
        REJECTED: 'rejected',
        CANCELLED: 'cancelled'
    };

    static TYPES = {
        SICK: 'sick',
        FRL: 'frl'
    };

    async loadRequests(filters = {}) {
        if (!db || !firebaseConnected) {
            const localData = localStorage.getItem('leaveRequests');
            if (localData) {
                this.requests = JSON.parse(localData);
                this.isLoaded = true;
                return this.filterRequests(this.requests, filters);
            }
            return [];
        }

        try {
            let query = db.collection('leaveRequests');
            if (filters.staffId) query = query.where('staffId', '==', filters.staffId);
            if (filters.status) query = query.where('status', '==', filters.status);
            if (filters.type) query = query.where('type', '==', filters.type);

            const snapshot = await query.get();
            this.requests = [];
            snapshot.forEach(doc => {
                this.requests.push({ id: doc.id, ...doc.data() });
            });
            this.isLoaded = true;
            return this.filterRequests(this.requests, filters);
        } catch (e) {
            console.error('Error loading requests:', e);
            return [];
        }
    }

    filterRequests(requests, filters) {
        return requests.filter(r => {
            if (filters.staffId && r.staffId !== filters.staffId) return false;
            if (filters.status && r.status !== filters.status) return false;
            if (filters.type && r.type !== filters.type) return false;
            return true;
        });
    }

    async saveRequest(request) {
        if (!db || !firebaseConnected) {
            const docId = `${request.staffId}_${request.type}_${Date.now()}`;
            const newRequest = {
                id: docId,
                ...request,
                status: LeaveRequestManager.STATUS.PENDING,
                createdAt: new Date().toISOString(),
                attachmentUploaded: false,
                attachmentFileName: null
            };
            this.requests.push(newRequest);
            localStorage.setItem('leaveRequests', JSON.stringify(this.requests));
            return true;
        }

        try {
            const docRef = await db.collection('leaveRequests').add({
                ...request,
                status: LeaveRequestManager.STATUS.PENDING,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                attachmentUploaded: false,
                attachmentFileName: null
            });
            return true;
        } catch (e) {
            console.error('Error saving request:', e);
            return false;
        }
    }

    async updateRequestAttachment(requestId, fileName) {
        if (!db || !firebaseConnected) {
            const request = this.requests.find(r => r.id === requestId);
            if (request) {
                request.attachmentUploaded = true;
                request.attachmentFileName = fileName;
                localStorage.setItem('leaveRequests', JSON.stringify(this.requests));
            }
            return true;
        }
        
        try {
            await db.collection('leaveRequests').doc(requestId).update({
                attachmentUploaded: true,
                attachmentFileName: fileName,
                attachmentUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (e) {
            console.error('Error updating attachment:', e);
            return false;
        }
    }

    async removeRequestAttachment(requestId) {
        if (!db || !firebaseConnected) {
            const request = this.requests.find(r => r.id === requestId);
            if (request) {
                request.attachmentUploaded = false;
                request.attachmentFileName = null;
                localStorage.setItem('leaveRequests', JSON.stringify(this.requests));
            }
            return true;
        }
        
        try {
            await db.collection('leaveRequests').doc(requestId).update({
                attachmentUploaded: false,
                attachmentFileName: null,
                attachmentRemovedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (e) {
            console.error('Error removing attachment:', e);
            return false;
        }
    }

    async updateRequestStatus(requestId, status, reason = '') {
        const reviewerName =
            currentLoggedInStaff?.name ||
            'Admin';

        const reviewerRole =
            String(
                currentLoggedInStaff?.role ||
                'Admin'
            );

        if (!db || !firebaseConnected) {
            const request =
                this.requests.find(
                    r => r.id === requestId
                );

            if (request) {
                request.status = status;
                request.reviewReason = reason;
                request.reviewedAt =
                    new Date().toISOString();
                request.reviewedBy =
                    reviewerName;
                request.reviewedByRole =
                    reviewerRole;

                localStorage.setItem(
                    'leaveRequests',
                    JSON.stringify(
                        this.requests
                    )
                );
            }

            return true;
        }

        try {
            await db
                .collection('leaveRequests')
                .doc(requestId)
                .update({
                    status,
                    reviewedAt:
                        firebase.firestore
                            .FieldValue
                            .serverTimestamp(),
                    reviewedBy:
                        reviewerName,
                    reviewedByRole:
                        reviewerRole,
                    reviewReason:
                        reason || ''
                });

            return true;

        } catch (e) {
            console.error(
                'Error updating request:',
                e
            );

            return false;
        }
    }

    async deleteRequest(requestId) {
        if (!db || !firebaseConnected) {
            this.requests = this.requests.filter(r => r.id !== requestId);
            localStorage.setItem('leaveRequests', JSON.stringify(this.requests));
            return true;
        }
        
        try {
            await db.collection('leaveRequests').doc(requestId).delete();
            return true;
        } catch (e) {
            console.error('Error deleting request:', e);
            return false;
        }
    }

    async getRequestsWithoutAttachment(staffId) {
        const requests = await this.loadRequests({ staffId });
        return requests.filter(r => 
            r.status === 'pending' && 
            (!r.attachmentUploaded || r.attachmentUploaded === false) &&
            r.type === 'sick'
        );
    }
}

// ========== STAFF BALANCE MANAGER ==========
class StaffBalanceManager {
    constructor() {
        this.balances = {};
        this.isLoaded = false;
    }

    async loadBalances(staffId = null) {
        if (!db || !firebaseConnected) {
            const localData = localStorage.getItem('staffBalances');
            if (localData) {
                this.balances = JSON.parse(localData);
                this.isLoaded = true;
                if (staffId) return this.balances[staffId] || null;
                return this.balances;
            }
            return staffId ? null : {};
        }

        try {
            let query = db.collection('staffBalances');
            if (staffId) query = query.where('staffId', '==', staffId);
            
            const snapshot = await query.get();
            snapshot.forEach(doc => {
                const data = doc.data();
                this.balances[data.staffId] = {
                    id: doc.id,
                    ...data
                };
            });
            this.isLoaded = true;
            return staffId ? this.balances[staffId] || null : this.balances;
        } catch (e) {
            console.error('Error loading balances:', e);
            return staffId ? null : {};
        }
    }

    async updateBalance(staffId, balanceData) {
        const data = {
            staffId,
            sickLeave: Number(balanceData.sickLeave ?? 0),
            frlBalance: Number(balanceData.frlBalance ?? 0),
            frlRenewal: balanceData.frlRenewal || null,
            updatedAt: new Date().toISOString()
        };

        if (!db || !firebaseConnected) {
            this.balances[staffId] = data;
            localStorage.setItem('staffBalances', JSON.stringify(this.balances));
            return true;
        }

        try {
            const existing = await this.loadBalances(staffId);
            if (existing && existing.id) {
                await db.collection('staffBalances').doc(existing.id).update(data);
            } else {
                await db.collection('staffBalances').add(data);
            }
            this.balances[staffId] = data;
            return true;
        } catch (e) {
            console.error('Error updating balance:', e);
            return false;
        }
    }

    async deductLeave(staffId, type, amount = 1) {
        const balance = await this.loadBalances(staffId);
        if (!balance) return false;

        const updates = {};
        if (type === LeaveRequestManager.TYPES.SICK) {
            updates.sickLeave = Number(balance.sickLeave ?? 0) - amount;
        } else if (type === LeaveRequestManager.TYPES.FRL) {
            updates.frlBalance = Number(balance.frlBalance ?? 0) - amount;
        }

        return await this.updateBalance(staffId, { ...balance, ...updates });
    }

    async addLeave(staffId, type, amount = 1) {
        const balance = await this.loadBalances(staffId);
        if (!balance) {
            // Create new balance if it doesn't exist
            const newBalance = {
                sickLeave: type === LeaveRequestManager.TYPES.SICK ? amount : 30,
                frlBalance: type === LeaveRequestManager.TYPES.FRL ? amount : 5,
                frlRenewal: null
            };
            return await this.updateBalance(staffId, newBalance);
        }

        const updates = {};
        if (type === LeaveRequestManager.TYPES.SICK) {
            updates.sickLeave = (balance.sickLeave || 0) + amount;
        } else if (type === LeaveRequestManager.TYPES.FRL) {
            updates.frlBalance = (balance.frlBalance || 0) + amount;
        }

        return await this.updateBalance(staffId, { ...balance, ...updates });
    }
}

// ========== INSTANTIATE MANAGERS ==========
const leaveManager = new LeaveRequestManager();
const balanceManager = new StaffBalanceManager();

// ========== FRL MANAGER ==========
class FRLManager {
    constructor() {
        this.frlData = [];
        this.threshold = 3;
        this.timeWindow = 30;
        this.isLoaded = false;
    }

    async loadFRLData() {
        console.log('🔄 Loading FRL data...');
        if (!db || !firebaseConnected) {
            const localData = localStorage.getItem('frlData');
            if (localData) {
                this.frlData = JSON.parse(localData);
                this.isLoaded = true;
                return this.frlData;
            }
            this.isLoaded = true;
            return [];
        }

        try {
            const snapshot = await db.collection('frlData').get();
            this.frlData = [];
            snapshot.forEach(doc => {
                this.frlData.push({ id: doc.id, ...doc.data() });
            });
            this.isLoaded = true;
            return this.frlData;
        } catch (e) {
            console.error('Error loading FRL data:', e);
            this.isLoaded = true;
            return [];
        }
    }

    async addRequestToFRL(staffId, requestType, requestDetails) {
        const record = {
            staffId,
            requestType: requestType || 'frl_request',
            timestamp: new Date().toISOString(),
            details: requestDetails,
            createdAt: new Date().toISOString()
        };
        
        try {
            if (db && firebaseConnected) {
                const docRef = await db.collection('frlData').add(record);
                record.id = docRef.id;
            }
            this.frlData.push(record);
            localStorage.setItem('frlData', JSON.stringify(this.frlData));
            return true;
        } catch (e) {
            console.error('Error saving FRL record:', e);
            return false;
        }
    }

    async checkStaffFRLStatus(staffId, requestType = 'frl_request') {
        if (!this.isLoaded) {
            await this.loadFRLData();
        }
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.timeWindow);
        
        const staffRecords = this.frlData.filter(r => {
            const recordDate = r.timestamp ? new Date(r.timestamp) : 
                              (r.createdAt ? new Date(r.createdAt) : new Date());
            return r.staffId === staffId && 
                   r.requestType === requestType && 
                   recordDate >= cutoffDate;
        });
        
        const count = staffRecords.length;
        const isFrequent = count >= this.threshold;
        
        return {
            staffId,
            requestType,
            count,
            isFrequent,
            threshold: this.threshold,
            records: staffRecords,
            warning: isFrequent ? `⚠️ This staff has made ${count} ${requestType} requests in the last ${this.timeWindow} days` : null
        };
    }

    async getFRLReport() {
        if (!this.isLoaded) {
            await this.loadFRLData();
        }
        
        const report = {};
        this.frlData.forEach(record => {
            const key = `${record.staffId}_${record.requestType}`;
            if (!report[key]) {
                report[key] = { 
                    staffId: record.staffId, 
                    requestType: record.requestType, 
                    count: 0, 
                    records: [] 
                };
            }
            report[key].count++;
            report[key].records.push(record);
        });
        
        const flagged = Object.values(report).filter(r => r.count >= this.threshold);
        for (let item of flagged) {
            const staff = getStaffById(item.staffId);
            item.staffName = staff?.name || 'Unknown';
            item.staffRcno = staff?.id || 'N/A';
        }
        return flagged;
    }

    async clearFRLRecords(staffId, requestType = null) {
        if (!db || !firebaseConnected) {
            this.frlData = this.frlData.filter(r => {
                if (requestType) return r.staffId !== staffId || r.requestType !== requestType;
                return r.staffId !== staffId;
            });
            localStorage.setItem('frlData', JSON.stringify(this.frlData));
            return true;
        }
        
        try {
            let query = db.collection('frlData').where('staffId', '==', staffId);
            if (requestType) query = query.where('requestType', '==', requestType);
            const snapshot = await query.get();
            const batch = db.batch();
            snapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            
            this.frlData = this.frlData.filter(r => {
                if (requestType) return r.staffId !== staffId || r.requestType !== requestType;
                return r.staffId !== staffId;
            });
            localStorage.setItem('frlData', JSON.stringify(this.frlData));
            return true;
        } catch (e) {
            console.error('Error clearing FRL records:', e);
            return false;
        }
    }
}

const frlManager = new FRLManager();

// ========== LEAVE EMAIL + ATTACHMENT DELIVERY (v25) ==========
function emailArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        return value.split(/[;,]/).map(v => v.trim()).filter(Boolean);
    }
    return [];
}

function uniqueEmails(values) {
    return [...new Set(
        values
            .flatMap(emailArray)
            .map(v => String(v || '').trim())
            .filter(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
    )];
}

function getLeaveEmailRoutes(leaveData) {
    const portal = window.PORTAL_EMAILS?.leave || window.PORTAL_EMAILS?.leaveRequest || {};
    const legacy = window.EMAIL_RECIPIENTS || {};

    // Recipients who should receive the actual medical/supporting attachment.
    // Configure any of these in email-config.js:
    // PORTAL_EMAILS.leave.attachmentTo = ['address@example.com']
    // PORTAL_EMAILS.leave.attachmentRecipients = [...]
    // If not configured, legacy Admin + Supervisor addresses receive attachment.
    const attachmentTo = uniqueEmails([
        portal.attachmentTo,
        portal.attachmentRecipients,
        portal.withAttachment,
        legacy.attachmentTo,
        legacy.attachmentRecipients,
        legacy.admin,
        legacy.supervisor
    ]);

    // Text-only recipients. CC lists and the staff member are deliberately
    // text-only so the supporting document is not distributed unnecessarily.
    const staff = getStaffById(leaveData.staffId) || {};
    const textOnlyTo = uniqueEmails([
        portal.textOnlyTo,
        portal.textOnlyRecipients,
        portal.cc,
        legacy.textOnlyTo,
        legacy.textOnlyRecipients,
        legacy.ccList,
        staff.email || '',
        leaveData.staffEmail || ''
    ]).filter(email => !attachmentTo.includes(email));

    // If a project has only a generic `to` route, use it as text-only unless
    // attachmentTo was explicitly configured.
    const genericTo = uniqueEmails([portal.to, portal.recipients]);
    genericTo.forEach(email => {
        if (!attachmentTo.includes(email) && !textOnlyTo.includes(email)) {
            textOnlyTo.push(email);
        }
    });

    return { attachmentTo, textOnlyTo };
}

async function fileToEmailAttachment(file) {
    if (!file) return null;
    if (file.size > 5 * 1024 * 1024) {
        throw new Error('Attachment must be 5 MB or smaller.');
    }
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || '');
            resolve({
                filename: file.name,
                contentType: file.type || 'application/octet-stream',
                contentBase64: result.includes(',') ? result.split(',')[1] : result
            });
        };
        reader.onerror = () => reject(new Error('Could not read attachment.'));
        reader.readAsDataURL(file);
    });
}

function buildLeaveEmailMessage(leaveData, attachmentFile, attachmentIncluded) {
    return [
        `${leaveData.leaveType || 'Leave Request'}`,
        '========================================',
        `Date: ${leaveData.date || 'N/A'}`,
        `Duty Time: ${leaveData.dutyTime || 'N/A'}`,
        `Staff: ${leaveData.staffName || leaveData.name || 'N/A'}`,
        `Staff ID: ${leaveData.staffRcno || leaveData.rcno || leaveData.staffId || 'N/A'}`,
        `Designation: ${leaveData.staffRole || 'Staff'}`,
        `Reason: ${leaveData.reason || 'N/A'}`,
        leaveData.details ? `Additional Details: ${leaveData.details}` : '',
        `Reported: ${leaveData.reportedDateTime || 'N/A'}`,
        leaveData.status ? `Status: ${leaveData.status}` : '',
        attachmentFile
            ? (attachmentIncluded
                ? `Attachment included: ${attachmentFile.name}`
                : `Attachment submitted: ${attachmentFile.name} (not attached to this email)`)
            : 'Attachment: None',
        '========================================',
        'Koveli Staff Portal'
    ].filter(Boolean).join('\n');
}

async function postPortalEmail(payload) {
    const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    let body = null;
    try { body = await response.json(); }
    catch (_) {
        try { body = { text: await response.text() }; }
        catch (_) { body = {}; }
    }

    if (!response.ok) {
        throw new Error(body?.error || body?.message || `Email API returned ${response.status}`);
    }
    return body;
}

async function sendLeaveEmail(leaveData, attachmentFile = null) {
    const { attachmentTo, textOnlyTo } = getLeaveEmailRoutes(leaveData);

    if (!attachmentTo.length && !textOnlyTo.length) {
        console.warn('No Leave email recipients configured. Inbox/Firestore save will continue.');
        return { sent: false, attachmentSent: false, textSent: false, reason: 'no-recipients' };
    }

    const subject =
        `Leave Request - ${leaveData.staffName || 'Staff'} - ` +
        `${leaveData.leaveType || leaveData.type || 'Leave'} - ${leaveData.date || ''}`;

    let attachmentSent = false;
    let textSent = false;
    const errors = [];

    // Send the attachment ONLY to designated attachment recipients.
    if (attachmentFile && attachmentTo.length) {
        try {
            const attachment = await fileToEmailAttachment(attachmentFile);
            await postPortalEmail({
                to: attachmentTo,
                subject,
                message: buildLeaveEmailMessage(leaveData, attachmentFile, true),
                attachment
            });
            attachmentSent = true;
            console.log('✅ Leave attachment email sent to:', attachmentTo);
        } catch (error) {
            console.error('Leave attachment email failed:', error);
            errors.push('Attachment email: ' + (error.message || error));
        }
    }

    // If there is no file, attachment recipients still need the text notice.
    const plainRecipients = uniqueEmails([
        textOnlyTo,
        attachmentFile ? [] : attachmentTo
    ]);

    if (plainRecipients.length) {
        try {
            await postPortalEmail({
                to: plainRecipients,
                subject,
                message: buildLeaveEmailMessage(leaveData, attachmentFile, false)
            });
            textSent = true;
            console.log('✅ Leave text-only email sent to:', plainRecipients);
        } catch (error) {
            console.error('Leave text-only email failed:', error);
            errors.push('Text email: ' + (error.message || error));
        }
    }

    if (errors.length) {
        throw new Error(errors.join(' | '));
    }

    return {
        sent: attachmentSent || textSent,
        attachmentSent,
        textSent,
        attachmentRecipients: attachmentTo,
        textOnlyRecipients: textOnlyTo
    };
}



async function sendLeaveEmailV31(leaveData, attachmentFile=null){
    const staff=getStaffById(leaveData.staffId)||{};
    const cfg=window.PORTAL_EMAILS?.leave || window.PORTAL_EMAILS?.leaveRequest || {};

    const DEFAULT_ATTACHMENT_TO=[
        "abdulla.irufan@macl.aero",
        "shifaza.aminath@macl.aero"
    ];
    const DEFAULT_TEXT_ONLY_TO=[
        "mohamed.i@macl.aero",
        "ahmed.tholal@macl.aero",
        "mariyam.shiara@macl.aero",
        "mohamed.sobah@macl.aero",
        "koveli.lounge@macl.aero"
    ];

    const arr=v=>{
        if(!v)return[];
        if(Array.isArray(v))return v;
        return String(v).split(/[;,]/).map(x=>x.trim()).filter(Boolean);
    };

    const uniq=values=>[...new Set(
        values.flatMap(arr)
              .map(x=>String(x||'').trim().toLowerCase())
              .filter(x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))
    )];

    let attachmentTo=uniq([cfg.attachmentTo,cfg.attachmentRecipients]);
    let textOnlyTo=uniq([cfg.textOnlyTo,cfg.textOnlyRecipients,cfg.to,cfg.recipients,cfg.cc]);

    if(!attachmentTo.length)attachmentTo=[...DEFAULT_ATTACHMENT_TO];
    if(!textOnlyTo.length)textOnlyTo=[...DEFAULT_TEXT_ONLY_TO];

    if(staff.email && !attachmentTo.includes(String(staff.email).toLowerCase())){
        textOnlyTo=uniq([textOnlyTo,staff.email]);
    }
    textOnlyTo=textOnlyTo.filter(e=>!attachmentTo.includes(e));

    const subject=`Leave Request - ${leaveData.staffName||staff.name||'Staff'} - ${leaveData.leaveType||leaveData.type||'Leave'} - ${leaveData.date||''}`;

    const message=[
        `${leaveData.leaveType||leaveData.type||'Leave Request'}`,
        '========================================',
        `Date: ${leaveData.date||'N/A'}`,
        `Duty Time: ${leaveData.dutyTime||'N/A'}`,
        `Staff: ${leaveData.staffName||leaveData.name||staff.name||'N/A'}`,
        `Staff ID: ${leaveData.staffRcno||leaveData.rcno||staff.rcno||leaveData.staffId||'N/A'}`,
        `Designation: ${leaveData.staffRole||staff.role||'Staff'}`,
        `Reason: ${leaveData.reason||'N/A'}`,
        leaveData.details?`Additional Details: ${leaveData.details}`:'',
        `Reported: ${leaveData.reportedDateTime||'N/A'}`,
        attachmentFile?`Attachment: ${attachmentFile.name}`:'Attachment: None',
        leaveData.status?`Status: ${leaveData.status}`:'',
        '========================================',
        'Koveli Staff Portal'
    ].filter(Boolean).join('\n');

    async function sendJson(to){
        if(!to.length)return null;

        const response=await fetch('/api/send-email',{
            method:'POST',
            headers:{
                'Content-Type':'application/json',
                'Accept':'application/json'
            },
            body:JSON.stringify({
                to,
                subject,
                message
            })
        });

        const raw=await response.text();
        let body={};
        try{body=raw?JSON.parse(raw):{}}catch{body={raw}}

        if(!response.ok || body?.success===false){
            throw new Error(body?.error||body?.message||`Email API returned ${response.status}`);
        }
        return body;
    }

    async function sendMultipart(to,file){
        if(!to.length)return null;

        const form=new FormData();
        form.append('to',to.join(','));
        form.append('subject',subject);
        form.append('message',message);
        form.append('attachment',file,file.name);

        const response=await fetch('/api/send-email',{
            method:'POST',
            headers:{'Accept':'application/json'},
            body:form
        });

        const raw=await response.text();
        let body={};
        try{body=raw?JSON.parse(raw):{}}catch{body={raw}}

        if(!response.ok || body?.success===false){
            throw new Error(body?.error||body?.message||`Email API returned ${response.status}`);
        }
        return body;
    }

    // FRL / Sick Leave with no file:
    // everybody gets the same text email.
    if(!attachmentFile){
        const allRecipients=uniq([attachmentTo,textOnlyTo]);
        if(!allRecipients.length){
            throw new Error('No Leave email recipients configured.');
        }

        const response=await sendJson(allRecipients);

        return {
            sent:true,
            attachmentSent:false,
            textOnlySent:true,
            recipients:allRecipients,
            response
        };
    }

    // Sick Leave with file:
    // attachment recipients = same text + file
    // text-only recipients   = same text without file
    const attachmentResponse=await sendMultipart(attachmentTo,attachmentFile);
    const textResponse=await sendJson(textOnlyTo);

    return {
        sent:true,
        attachmentSent:!!attachmentResponse,
        textOnlySent:!!textResponse,
        attachmentRecipients:attachmentTo,
        textOnlyRecipients:textOnlyTo,
        attachmentResponse,
        textResponse
    };
}

// ========== CHECK FOR EXISTING LEAVE ON SAME DAY ==========
async function checkExistingLeaveOnSameDay(staffId, date, leaveType) {
    const requests = await leaveManager.loadRequests({ 
        staffId: staffId
    });
    
    const pendingOrApproved = requests.filter(r => 
        r.status === 'pending' || r.status === 'approved'
    );
    
    const existingRequest = pendingOrApproved.find(r => {
        if (r.type === 'annual' && r.startDate && r.endDate) {
            const requestStart = new Date(r.startDate);
            const requestEnd = new Date(r.endDate);
            const checkDate = new Date(date);
            return checkDate >= requestStart && checkDate <= requestEnd;
        }
        return r.date === date;
    });
    
    if (existingRequest) {
        const typeMap = { 'sick': 'Sick Leave', 'frl': 'FRL', 'annual': 'Annual Leave' };
        return {
            hasExisting: true,
            existingType: typeMap[existingRequest.type] || existingRequest.type,
            existingDate: existingRequest.date || existingRequest.startDate,
            status: existingRequest.status
        };
    }
    
    return {
        hasExisting: false,
        existingType: null,
        existingDate: null,
        status: null
    };
}

// ========== UPDATE REPORTED DATE/TIME DISPLAY ==========
function updateReportedDateTime() {
    const sickDateTime = document.getElementById('sickReportedDateTime');
    const frlDateTime = document.getElementById('frlReportedDateTime');
    const currentDateTime = getGMT5DateTimeString();
    if (sickDateTime) sickDateTime.textContent = currentDateTime;
    if (frlDateTime) frlDateTime.textContent = currentDateTime;
}

// ========== SCROLL TO TOP ==========
function scrollToTop() {
    const scrollContent = document.querySelector('.scroll-content');
    if (scrollContent) {
        scrollContent.scrollTop = 0;
        scrollContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== LOAD LEAVE DATA ==========
async function loadLeaveData() {
    if (!currentLoggedInStaff) return;
    await loadBalances();
    await loadMyLeaveRequests();
    if (currentLoggedInStaff.role === 'Admin') {
        const adminSection = document.getElementById('adminSection');
        if (adminSection) adminSection.style.display = 'block';
        await loadPendingLeaveRequests();
        await loadAdminLeaveHistory();
        await loadFRLReport();
        await populateAdminStaffSelect();
    }
    scrollToTop();
}

// ========== LOAD BALANCES ==========
async function loadBalances() {
    if (!currentLoggedInStaff) return;
    const balance = await balanceManager.loadBalances(currentLoggedInStaff.id);
    const sickBalance = document.getElementById('sickBalance');
    const frlBalance = document.getElementById('frlBalance');
    const frlRenewalDate = document.getElementById('frlRenewalDate');
    
    if (balance) {
        if (sickBalance) sickBalance.textContent = balance.sickLeave ?? 30;
        if (frlBalance) frlBalance.textContent = balance.frlBalance ?? 5;
        if (frlRenewalDate) frlRenewalDate.textContent = balance.frlRenewal || 'Not set';
    } else {
        if (sickBalance) sickBalance.textContent = 30;
        if (frlBalance) frlBalance.textContent = 5;
        if (frlRenewalDate) frlRenewalDate.textContent = 'Not set';
    }
}

// ========== LOAD MY LEAVE REQUESTS ==========
async function loadMyLeaveRequests() {
    const container = document.getElementById('myLeaveRequests');
    if (!container) return;
    if (!currentLoggedInStaff) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📭</div>Login to see your leave requests</div>';
        return;
    }
    const requests = await leaveManager.loadRequests({ staffId: currentLoggedInStaff.id });
    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (requests.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📭</div>No leave requests found</div>';
        return;
    }
    const statusMap = { 'pending': '⏳ Pending', 'approved': '✅ Approved', 'rejected': '❌ Rejected', 'cancelled': '🚫 Cancelled' };
    const typeMap = { 'sick': '🤒 Sick', 'frl': '👨‍👩‍👧‍👦 FRL' };
    
    const pendingWithoutAttachment = requests.filter(r => 
        r.status === 'pending' && 
        (!r.attachmentUploaded || r.attachmentUploaded === false) &&
        r.type === 'sick'
    );
    
    let html = '';
    
    if (pendingWithoutAttachment.length > 0) {
        html += `
            <div class="attachment-notification">
                <div class="notification-box">
                    <strong>📎 Pending Attachments</strong>
                    <p>You have ${pendingWithoutAttachment.length} pending sick leave request(s) without attachments. 
                    <a href="#" onclick="showAttachmentUploadSection(); return false;">Upload now</a></p>
                </div>
            </div>
        `;
    }

    html += requests.map(r => {
        const statusClass = r.status || 'pending';
        const showAttachmentUpload = r.status === 'pending' && 
                                   (!r.attachmentUploaded || r.attachmentUploaded === false) && 
                                   r.type === 'sick';
        const showRemoveAttachment = r.attachmentUploaded === true && r.status === 'pending';
        
        return `
            <div class="request-item ${statusClass}">
                <div class="request-info">
                    <div class="title">
                        <strong>${typeMap[r.type] || r.type}</strong>
                        <span class="request-type">${r.type}</span>
                        <span class="badge badge-${statusClass}">${statusMap[statusClass] || statusClass}</span>
                        ${r.attachmentUploaded ? '<span class="badge badge-attachment">📎 Attached</span>' : ''}
                    </div>
                    <div class="details">
                        📅 ${r.date}
                        ${r.dutyTime ? ` 🕐 ${r.dutyTime}` : ''}
                    </div>
                    <div class="reason">📝 ${r.reason}</div>
                    ${r.details ? `<div class="details">📋 ${r.details}</div>` : ''}

                    ${r.status === 'approved'
                        ? `<div class="details" style="margin-top:5px;color:#16794b;font-weight:800;">
                               ✅ Approved by Admin
                           </div>`
                        : ''}

                    ${r.status === 'rejected' && r.reviewReason
                        ? `<div class="details" style="color:#c25d2e;">📋 ${r.reviewReason}</div>`
                        : ''}
                    ${r.attachmentFileName ? `<div class="details file-attachment">📎 ${r.attachmentFileName} <button class="btn-remove-file-small" onclick="event.stopPropagation(); window.removeAttachmentFromRequest('${r.id}')" title="Remove attachment">✕</button></div>` : ''}
                    <div class="meta">
                        ⏰ Reported: ${r.reportedDateTime || r.reportedDate ? `${r.reportedDate} ${r.reportedTime || ''}` : 'N/A'}
                        ${r.createdAt ? ` | Submitted: ${new Date(r.createdAt).toLocaleDateString()} ${new Date(r.createdAt).toLocaleTimeString()}` : ''}
                        ${r.attachmentUpdatedAt ? ` | Attachment: ${new Date(r.attachmentUpdatedAt).toLocaleDateString()}` : ''}
                        ${r.status === 'approved' && r.reviewedBy
                            ? ` | Approved by: ${r.reviewedBy}`
                            : ''}
                    </div>
                </div>
                <div class="request-actions">
                    ${showAttachmentUpload ? `
                        <button class="btn-attachment" onclick="window.showAttachmentUpload('${r.id}')">📎 Upload Attachment</button>
                    ` : ''}
                    ${statusClass === 'pending' ? `
                        <button class="btn-danger" onclick="window.cancelLeaveRequest('${r.id}')">Cancel</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// ========== REMOVE ATTACHMENT FROM REQUEST ==========
window.removeAttachmentFromRequest = async function(requestId) {
    if (!confirm('Are you sure you want to remove the attachment from this leave request?')) return;
    
    try {
        const ok = await leaveManager.removeRequestAttachment(requestId);
        if (ok) {
            showTemporaryFeedback('📎 Attachment removed successfully');
            await loadLeaveData();
        } else {
            showTemporaryFeedback('❌ Failed to remove attachment', true);
        }
    } catch (error) {
        console.error('Error removing attachment:', error);
        showTemporaryFeedback('❌ Error removing attachment', true);
    }
};

// ========== REMOVE ATTACHMENT (Legacy) ==========
window.removeAttachment = window.removeAttachmentFromRequest;

// ========== ATTACHMENT UPLOAD SECTION ==========
function showAttachmentUploadSection() {
    const pendingRequests = document.querySelectorAll('.request-item.pending');
    for (let item of pendingRequests) {
        const uploadBtn = item.querySelector('.btn-attachment');
        if (uploadBtn) {
            uploadBtn.click();
            break;
        }
    }
}

// ========== CLOSE ATTACHMENT MODAL ==========
function closeAttachmentModal() {
    const modal = document.getElementById('attachmentModal');
    if (modal) {
        modal.classList.remove('active');
        const form = document.getElementById('attachmentUploadForm');
        if (form) form.reset();
        
        const fileSelectedInfo = document.getElementById('fileSelectedInfo');
        const fileNameFallback = document.getElementById('attachmentFileNameFallback');
        const removeBtn = document.getElementById('removeSelectedFileBtn');
        const fileInfo = document.getElementById('attachmentFileInfo');
        const feedback = document.getElementById('attachmentFeedback');
        
        if (fileSelectedInfo) fileSelectedInfo.style.display = 'none';
        if (fileNameFallback) {
            fileNameFallback.style.display = 'inline';
            fileNameFallback.textContent = 'No file chosen';
        }
        if (removeBtn) removeBtn.style.display = 'none';
        if (fileInfo) {
            fileInfo.textContent = '';
            fileInfo.className = 'attachment-info';
        }
        if (feedback) {
            feedback.textContent = '';
            feedback.className = 'form-feedback';
        }
        
        const submitBtn = document.getElementById('uploadAttachmentBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '📤 Save Attachment';
        }
    }
}

// ========== REMOVE SELECTED FILE (before upload) ==========
function removeSelectedFile() {
    const fileInput = document.getElementById('attachmentFile');
    const fileInfo = document.getElementById('attachmentFileInfo');
    const fileSelectedInfo = document.getElementById('fileSelectedInfo');
    const fileNameFallback = document.getElementById('attachmentFileNameFallback');
    const removeBtn = document.getElementById('removeSelectedFileBtn');
    const feedback = document.getElementById('attachmentFeedback');
    
    if (fileInput) fileInput.value = '';
    if (fileSelectedInfo) fileSelectedInfo.style.display = 'none';
    if (fileNameFallback) {
        fileNameFallback.style.display = 'inline';
        fileNameFallback.textContent = 'No file chosen';
    }
    if (fileInfo) {
        fileInfo.textContent = '';
        fileInfo.className = 'attachment-info';
    }
    if (removeBtn) removeBtn.style.display = 'none';
    if (feedback) {
        feedback.textContent = '';
        feedback.className = 'form-feedback';
    }
    
    showTemporaryFeedback('📎 File removed. You can select a new file.');
}

// ========== CREATE ATTACHMENT MODAL ==========
function createAttachmentModal() {
    if (document.getElementById('attachmentModal')) {
        return;
    }
    
    const modalHTML = `
        <div id="attachmentModal" class="modal-overlay">
            <div class="modal-container modal-wide">
                <div class="modal-header">
                    <h3>📎 Upload Attachment</h3>
                    <button class="modal-close" id="closeAttachmentModal">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="color: #666; margin-bottom: 15px; font-size: 14px;">
                        Upload a medical certificate or supporting document for your sick leave request.
                    </p>
                    <form id="attachmentUploadForm">
                        <input type="hidden" id="attachmentRequestId">
                        <div class="field-row">
                            <label>Select File (PDF, JPG, PNG, DOC, DOCX) <span class="required">*</span></label>
                            <div class="file-upload-wrapper">
                                <input type="file" id="attachmentFile" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" required>
                                <label for="attachmentFile" class="file-upload-btn">📎 Choose File</label>
                                <div class="file-selected-info" id="fileSelectedInfo" style="display: none;">
                                    <span id="attachmentFileName" class="file-name">No file chosen</span>
                                    <button type="button" class="btn-remove-file-small" id="removeSelectedFileBtn" title="Remove file">✕</button>
                                </div>
                                <span id="attachmentFileNameFallback" class="file-name" style="display: inline;">No file chosen</span>
                            </div>
                            <small style="color:#888;font-size:0.7rem;">Maximum file size: 5MB</small>
                            <div id="attachmentFileInfo" class="attachment-info"></div>
                        </div>
                        <div id="attachmentFeedback" class="form-feedback"></div>
                        <div class="modal-actions">
                            <button type="button" class="btn-secondary" onclick="closeAttachmentModal()">Cancel</button>
                            <button type="submit" class="btn-primary" id="uploadAttachmentBtn" style="width: auto; padding: 8px 24px;">📤 Save Attachment</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    const container = document.createElement('div');
    container.innerHTML = modalHTML;
    document.body.appendChild(container.firstElementChild);
    
    const closeBtn = document.getElementById('closeAttachmentModal');
    const removeBtn = document.getElementById('removeSelectedFileBtn');
    
    if (closeBtn) closeBtn.addEventListener('click', closeAttachmentModal);
    if (removeBtn) removeBtn.addEventListener('click', removeSelectedFile);
    
    document.getElementById('attachmentFile')?.addEventListener('change', function() {
        const fileInfo = document.getElementById('attachmentFileInfo');
        const fileSelectedInfo = document.getElementById('fileSelectedInfo');
        const fileNameDisplay = document.getElementById('attachmentFileName');
        const fileNameFallback = document.getElementById('attachmentFileNameFallback');
        const removeBtn = document.getElementById('removeSelectedFileBtn');
        const feedback = document.getElementById('attachmentFeedback');
        
        if (feedback) {
            feedback.textContent = '';
            feedback.className = 'form-feedback';
        }
        
        if (this.files[0]) {
            const file = this.files[0];
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                if (fileInfo) {
                    fileInfo.textContent = '⚠️ File is too large. Maximum size is 5MB';
                    fileInfo.className = 'attachment-info show error';
                }
                this.value = '';
                if (fileSelectedInfo) fileSelectedInfo.style.display = 'none';
                if (fileNameFallback) {
                    fileNameFallback.style.display = 'inline';
                    fileNameFallback.textContent = 'No file chosen';
                }
                if (removeBtn) removeBtn.style.display = 'none';
            } else {
                if (fileInfo) {
                    fileInfo.textContent = `📎 ${file.name} (${(file.size / 1024).toFixed(1)} KB) - Ready to upload`;
                    fileInfo.className = 'attachment-info show success';
                }
                if (fileSelectedInfo) fileSelectedInfo.style.display = 'flex';
                if (fileNameDisplay) fileNameDisplay.textContent = file.name;
                if (fileNameFallback) fileNameFallback.style.display = 'none';
                if (removeBtn) removeBtn.style.display = 'inline-flex';
            }
        } else {
            if (fileInfo) {
                fileInfo.textContent = '';
                fileInfo.className = 'attachment-info';
            }
            if (fileSelectedInfo) fileSelectedInfo.style.display = 'none';
            if (fileNameFallback) {
                fileNameFallback.style.display = 'inline';
                fileNameFallback.textContent = 'No file chosen';
            }
            if (removeBtn) removeBtn.style.display = 'none';
        }
    });
    
    document.getElementById('attachmentUploadForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const requestId = document.getElementById('attachmentRequestId')?.value;
        const fileInput = document.getElementById('attachmentFile');
        const feedback = document.getElementById('attachmentFeedback');
        
        if (!fileInput || !fileInput.files[0]) {
            if (feedback) {
                feedback.textContent = 'Please select a file';
                feedback.className = 'form-feedback error';
            }
            return;
        }
        
        const file = fileInput.files[0];
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            if (feedback) {
                feedback.textContent = 'File is too large. Maximum size is 5MB';
                feedback.className = 'form-feedback error';
            }
            return;
        }
        
        try {
            const submitBtn = document.getElementById('uploadAttachmentBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '⏳ Uploading...';
            }
            
            if (feedback) {
                feedback.textContent = '⏳ Uploading attachment...';
                feedback.className = 'form-feedback info';
            }
            
            const requests = await leaveManager.loadRequests({});
            const request = requests.find(r => r.id === requestId);
            
            if (!request) {
                throw new Error('Request not found');
            }
            
            await leaveManager.updateRequestAttachment(requestId, file.name);
            
            const emailData = {
                staffId: request.staffId,
                staffName: request.staffName || request.name || 'Staff',
                staffRole: request.staffRole || request.role || 'Staff',
                staffRcno: request.staffRcno || request.rcno || request.id,
                leaveType: request.leaveType || request.type || 'Sick Leave',
                date: request.date,
                dutyTime: request.dutyTime || 'N/A',
                reason: request.reason,
                details: request.details || '',
                reportedDateTime: request.reportedDateTime || 'N/A',
                status: 'Pending (with attachment)'
            };
            
            const emailResult = await sendLeaveEmailV31(emailData, file);
            
            if (feedback) {
                feedback.textContent = emailResult.attachmentSent ? '✅ Attachment saved and sent to attachment recipients. Other recipients received text only.' : '✅ Attachment saved. Email notification sent.';
                feedback.className = 'form-feedback success';
            }
            
            setTimeout(() => {
                closeAttachmentModal();
                loadLeaveData();
                showTemporaryFeedback(emailResult.attachmentSent ? '📎 Attachment sent only to designated recipients; others received text only.' : '📎 Attachment saved and notification sent.');
            }, 1000);
            
        } catch (error) {
            console.error('Error uploading attachment:', error);
            if (feedback) {
                feedback.textContent = '❌ Failed to upload attachment: ' + error.message;
                feedback.className = 'form-feedback error';
            }
            
            const submitBtn = document.getElementById('uploadAttachmentBtn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '📤 Save Attachment';
            }
        }
    });
    
    document.getElementById('attachmentModal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            closeAttachmentModal();
        }
    });
}

// ========== SHOW ATTACHMENT UPLOAD ==========
window.showAttachmentUpload = function(requestId) {
    if (!document.getElementById('attachmentModal')) {
        createAttachmentModal();
    }
    
    const requestIdInput = document.getElementById('attachmentRequestId');
    if (requestIdInput) requestIdInput.value = requestId;
    
    const form = document.getElementById('attachmentUploadForm');
    if (form) form.reset();
    
    const fileSelectedInfo = document.getElementById('fileSelectedInfo');
    const fileNameFallback = document.getElementById('attachmentFileNameFallback');
    const removeBtn = document.getElementById('removeSelectedFileBtn');
    const fileInfo = document.getElementById('attachmentFileInfo');
    const feedback = document.getElementById('attachmentFeedback');
    
    if (fileSelectedInfo) fileSelectedInfo.style.display = 'none';
    if (fileNameFallback) {
        fileNameFallback.style.display = 'inline';
        fileNameFallback.textContent = 'No file chosen';
    }
    if (removeBtn) removeBtn.style.display = 'none';
    if (fileInfo) {
        fileInfo.textContent = '';
        fileInfo.className = 'attachment-info';
    }
    if (feedback) {
        feedback.textContent = '';
        feedback.className = 'form-feedback';
    }
    
    const submitBtn = document.getElementById('uploadAttachmentBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '📤 Save Attachment';
    }
    
    const modal = document.getElementById('attachmentModal');
    if (modal) modal.classList.add('active');
};

// ========== LOAD PENDING LEAVE REQUESTS ==========
async function loadPendingLeaveRequests() {
    const container = document.getElementById('pendingLeaveRequests');
    if (!container) return;
    if (!currentLoggedInStaff || currentLoggedInStaff.role !== 'Admin') {
        container.innerHTML = '';
        return;
    }
    const requests = await leaveManager.loadRequests({ status: 'pending' });
    if (requests.length === 0) {
        container.innerHTML = '<div class="empty-state">No pending leave requests</div>';
        return;
    }
    const typeMap = { 'sick': '🤒 Sick', 'frl': '👨‍👩‍👧‍👦 FRL' };
    const grouped = {};
    requests.forEach(r => {
        if (!grouped[r.staffId]) {
            const staff = getStaffById(r.staffId);
            grouped[r.staffId] = {
                name: staff?.name || r.staffName || 'Unknown',
                id: staff?.id || r.staffId || 'N/A',
                requests: []
            };
        }
        grouped[r.staffId].requests.push(r);
    });
    container.innerHTML = Object.entries(grouped).map(([staffId, data]) => `
        <div style="margin-bottom: 12px; background: #f0f5f0; border-radius: 10px; padding: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #c8dcc8;">
                <strong>👤 ${data.name}</strong>
                <span class="rc-display">ID: ${data.id}</span>
            </div>
            ${data.requests.map(r => {
                const hasAttachment = r.attachmentUploaded || false;
                return `
                    <div class="request-item pending" style="margin-bottom: 8px;">
                        <div class="request-info">
                            <div class="title">
                                <strong>${typeMap[r.type] || r.type}</strong>
                                <span class="badge badge-pending">⏳ Pending</span>
                                ${hasAttachment ? '<span class="badge badge-attachment">📎 Has Attachment</span>' : '<span class="badge badge-no-attachment">📎 No Attachment</span>'}
                            </div>
                            <div class="details">
                                📅 ${r.date}
                                ${r.dutyTime ? ` 🕐 ${r.dutyTime}` : ''}
                            </div>
                            <div class="reason">📝 ${r.reason}</div>
                            ${r.details ? `<div class="details">📋 ${r.details}</div>` : ''}
                            ${r.attachmentFileName ? `<div class="details file-attachment">📎 ${r.attachmentFileName}</div>` : ''}
                            <div class="meta">
                                ⏰ Reported: ${r.reportedDateTime || r.reportedDate ? `${r.reportedDate} ${r.reportedTime || ''}` : 'N/A'}
                            </div>
                        </div>
                        <div class="request-actions">
                            <button class="btn-accept" onclick="window.approveLeaveRequest('${r.id}')">✅ Approve</button>
                            <button class="btn-danger" onclick="window.rejectLeaveRequest('${r.id}')">❌ Reject</button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `).join('');
}

// ========== ADMIN LEAVE HISTORY / DELETE ==========
async function loadAdminLeaveHistory() {
    const container = document.getElementById('adminLeaveHistory');
    if (!container) return;

    if (!currentLoggedInStaff || String(currentLoggedInStaff.role || '').toLowerCase() !== 'admin') {
        container.innerHTML = '';
        return;
    }

    const requests = await leaveManager.loadRequests({});
    const visible = requests
        .filter(r => String(r.status || 'pending').toLowerCase() !== 'approved')
        .sort((a, b) => {
            const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || a.reportedDateTime || 0).getTime();
            const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || b.reportedDateTime || 0).getTime();
            return tb - ta;
        });

    if (!visible.length) {
        container.innerHTML = '<div class="empty-state">No submitted, rejected or cancelled leave records</div>';
        return;
    }

    const typeMap = { sick: '🤒 Sick Leave', frl: '👨‍👩‍👧‍👦 FRL' };
    const statusMap = {
        pending: '⏳ Submitted / Pending',
        rejected: '❌ Rejected',
        cancelled: '🚫 Cancelled'
    };

    container.innerHTML = visible.map(r => {
        const st = String(r.status || 'pending').toLowerCase();
        const staff = getStaffById(r.staffId) || {};
        const staffName = staff.name || r.staffName || r.name || 'Unknown Staff';
        const rc = staff.rcno || r.staffRcno || r.rcno || r.staffId || 'N/A';
        return `
            <div class="request-item ${st}" style="margin-bottom:8px;">
                <div class="request-info">
                    <div class="title">
                        <strong>${typeMap[r.type] || r.leaveType || r.type || 'Leave'}</strong>
                        <span class="badge badge-${st}">${statusMap[st] || st}</span>
                    </div>
                    <div class="details">👤 ${staffName} · RC/ID: ${rc}</div>
                    <div class="details">📅 ${r.date || 'N/A'} ${r.dutyTime ? ` · 🕐 ${r.dutyTime}` : ''}</div>
                    <div class="reason">📝 ${r.reason || 'No reason entered'}</div>
                    ${r.details ? `<div class="details">📋 ${r.details}</div>` : ''}
                    <div class="meta">⏰ Reported: ${r.reportedDateTime || (r.reportedDate ? `${r.reportedDate} ${r.reportedTime || ''}` : 'N/A')}</div>
                </div>
                <div class="request-actions">
                    <button class="btn-danger" onclick="window.adminDeleteLeaveRequest('${r.id}')">🗑️ Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

window.adminDeleteLeaveRequest = async function(requestId) {
    if (!currentLoggedInStaff || String(currentLoggedInStaff.role || '').toLowerCase() !== 'admin') {
        showTemporaryFeedback('❌ Only Admin can delete leave records', true);
        return;
    }

    try {
        const requests = await leaveManager.loadRequests({});
        const request = requests.find(r => String(r.id) === String(requestId));

        if (!request) {
            showTemporaryFeedback('❌ Leave record not found', true);
            return;
        }

        const status = String(request.status || 'pending').toLowerCase();
        if (status === 'approved') {
            showTemporaryFeedback('⚠️ Approved leave cannot be deleted.', true);
            return;
        }

        const staff = getStaffById(request.staffId) || {};
        const name = staff.name || request.staffName || 'this staff member';
        const warning = status === 'pending'
            ? `Delete this submitted leave for ${name}? The deducted leave day will be restored before deletion.`
            : `Permanently delete this ${status} leave record for ${name}?`;

        if (!confirm(warning)) return;

        // Pending leave had already deducted one day at submission.
        // Restore it once before permanent deletion.
        if (status === 'pending') {
            const balance = await balanceManager.loadBalances(request.staffId);
            if (balance) {
                const updates = {};
                if (request.type === 'sick') {
                    updates.sickLeave = (Number(balance.sickLeave) || 0) + 1;
                } else if (request.type === 'frl') {
                    updates.frlBalance = (Number(balance.frlBalance) || 0) + 1;
                }
                await balanceManager.updateBalance(request.staffId, { ...balance, ...updates });
            }
        }

        // Cancelled leave was already restored during user cancellation; do not restore again.
        const ok = await leaveManager.deleteRequest(requestId);
        if (!ok) {
            showTemporaryFeedback('❌ Could not delete leave record', true);
            return;
        }

        showTemporaryFeedback('✅ Leave record permanently deleted');
        await loadLeaveData();
    } catch (error) {
        console.error('Admin delete leave:', error);
        showTemporaryFeedback('❌ Error deleting leave: ' + (error.message || error), true);
    }
};

// ========== LOAD FRL REPORT ==========
async function loadFRLReport() {
    const container = document.getElementById('frlReport');
    if (!container) return;
    if (!currentLoggedInStaff || currentLoggedInStaff.role !== 'Admin') {
        container.innerHTML = '';
        return;
    }
    
    await frlManager.loadFRLData();
    
    const frlRequests = await leaveManager.loadRequests({ type: 'frl', status: 'approved' });
    
    const frlUsage = {};
    frlRequests.forEach(r => {
        if (!frlUsage[r.staffId]) {
            const staff = getStaffById(r.staffId);
            frlUsage[r.staffId] = {
                name: staff?.name || r.staffName || 'Unknown',
                id: staff?.id || r.staffId || 'N/A',
                count: 0,
                requests: []
            };
        }
        frlUsage[r.staffId].count++;
        frlUsage[r.staffId].requests.push(r);
    });

    const sorted = Object.values(frlUsage).sort((a, b) => b.count - a.count);

    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                ✅ No FRL usage records found
            </div>
        `;
        return;
    }

    container.innerHTML = sorted.map(item => `
        <div class="frl-item">
            <div class="frl-staff-info">
                <span class="name">${item.name}</span>
                <span class="id">ID: ${item.id}</span>
                <span class="frl-count">${item.count} FRL used</span>
            </div>
            <button class="btn-clear-frl" onclick="window.clearStaffFRL('${item.id}')">
                🗑️ Clear Records
            </button>
        </div>
    `).join('');
}

// ========== POPULATE ADMIN STAFF SELECT ==========
async function populateAdminStaffSelect() {
    const select = document.getElementById('adminStaffSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Select Staff</option>';
    const allStaff = staffData || [];
    allStaff.forEach(staff => {
        const option = document.createElement('option');
        option.value = staff.id;
        option.textContent = `${staff.name} (${staff.id})`;
        select.appendChild(option);
    });

    select.addEventListener('change', async (e) => {
        const staffId = e.target.value;
        if (!staffId) return;
        const balance = await balanceManager.loadBalances(staffId);
        const sickBalance = document.getElementById('adminSickBalance');
        const frlBalance = document.getElementById('adminFrlBalance');
        const frlRenewal = document.getElementById('adminFrlRenewal');
        if (balance) {
            if (sickBalance) sickBalance.value = balance.sickLeave ?? 30;
            if (frlBalance) frlBalance.value = balance.frlBalance ?? 5;
            if (frlRenewal) frlRenewal.value = balance.frlRenewal || '';
        } else {
            if (sickBalance) sickBalance.value = 30;
            if (frlBalance) frlBalance.value = 5;
            if (frlRenewal) frlRenewal.value = '';
        }
    });
}

// ========== SICK LEAVE FORM ==========
document.getElementById('sickLeaveForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!currentLoggedInStaff) {
        showTemporaryFeedback('⚠️ Please login first', true);
        return;
    }

    const submitBtn = document.getElementById('sickSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Submitting...';
    }

    const date = document.getElementById('sickDate')?.value;
    const dutyTime = document.getElementById('sickDutyTime')?.value;
    const reason = document.getElementById('sickReason')?.value;
    const details = document.getElementById('sickDetails')?.value;
    const attachmentFile = document.getElementById('sickAttachment')?.files[0];

    if (!date) { showFormFeedback('Please select date', 'error', 'sickFeedback'); if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '🤒 Submit Sick Leave'; } return; }
    if (!reason) { showFormFeedback('Please select a reason', 'error', 'sickFeedback'); if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '🤒 Submit Sick Leave'; } return; }

    const existing = await checkExistingLeaveOnSameDay(currentLoggedInStaff.id, date, 'sick');
    if (existing.hasExisting) {
        showFormFeedback(
            `⚠️ You already have a ${existing.existingType} request on ${existing.existingDate} (${existing.status}).\nYou cannot apply for Sick Leave on the same day.`, 
            'error', 
            'sickFeedback'
        );
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '🤒 Submit Sick Leave';
        }
        return;
    }

    // Negative balances are allowed. Sick Leave can be submitted even when the current balance is 0 or below.

    const reportedDateTime = getGMT5DateTimeString();
    const reportedDate = getGMT5DateString();
    const reportedTime = getGMT5TimeString();

    const request = {
        staffId: currentLoggedInStaff.id,
        staffName: currentLoggedInStaff.name,
        staffRole: currentLoggedInStaff.role || 'Staff',
        staffRcno: currentLoggedInStaff.rcno || currentLoggedInStaff.id,
        type: LeaveRequestManager.TYPES.SICK,
        leaveType: 'Sick Leave',
        date: date,
        dutyTime: dutyTime || 'Morning 0730',
        reason: reason,
        details: details || '',
        days: 1,
        reportedDate: reportedDate,
        reportedTime: reportedTime,
        reportedDateTime: reportedDateTime
    };

    showLoadingPopup('⏳ Submitting Sick Leave...', 'Please wait...');
    const saved = await leaveManager.saveRequest(request);
    
    if (saved) {
        await balanceManager.deductLeave(currentLoggedInStaff.id, LeaveRequestManager.TYPES.SICK, 1);
        
        
        let sickEmailSent=false;
        let sickEmailError='';

        try{
            const emailResult=await sendLeaveEmailV31(request,attachmentFile||null);
            sickEmailSent=!!emailResult?.sent;
        }catch(emailError){
            sickEmailError=emailError?.message||'Unknown email error';
            console.error('Sick Leave saved but email failed:',emailError);
        }

if (attachmentFile) {
            const requests = await leaveManager.loadRequests({ staffId: currentLoggedInStaff.id });
            const latestRequest = requests.find(r => 
                r.date === date && 
                r.type === 'sick' && 
                r.status === 'pending'
            );
            if (latestRequest) {
                await leaveManager.updateRequestAttachment(latestRequest.id, attachmentFile.name);
            }
            showSuccessPopup(
                '✅ Sick Leave Submitted!',
                `${reason} on ${date} at ${dutyTime}\nReported: ${reportedDateTime}\nStatus: Pending Admin approval\n📎 Attachment name recorded`
            );
        } else {
            showSuccessPopup(
                '✅ Sick Leave Submitted!',
                `${reason} on ${date} at ${dutyTime}\nReported: ${reportedDateTime}\nStatus: Pending Admin approval`
            );
        }
        
        const sickDate = document.getElementById('sickDate');
        const sickDutyTime = document.getElementById('sickDutyTime');
        const sickReason = document.getElementById('sickReason');
        const sickDetails = document.getElementById('sickDetails');
        const sickAttachment = document.getElementById('sickAttachment');
        const sickFileName = document.getElementById('sickFileName');
        const sickAttachmentInfo = document.getElementById('sickAttachmentInfo');
        
        if (sickDate) sickDate.value = '';
        if (sickDutyTime) sickDutyTime.value = 'Morning 0730';
        if (sickReason) sickReason.value = '';
        if (sickDetails) sickDetails.value = '';
        if (sickAttachment) sickAttachment.value = '';
        if (sickFileName) sickFileName.textContent = 'No file chosen';
        if (sickAttachmentInfo) {
            sickAttachmentInfo.textContent = '';
            sickAttachmentInfo.className = 'attachment-info';
        }
        await loadLeaveData();
        showFormFeedback(
            sickEmailSent
                ? '✅ Sick Leave submitted and email sent successfully!'
                : '⚠️ Sick Leave submitted, but email failed: ' + sickEmailError,
            sickEmailSent ? 'success' : 'error',
            'sickFeedback'
        );
    } else {
        hideLoadingPopup();
        showFormFeedback('❌ Failed to submit sick leave', 'error', 'sickFeedback');
    }
    
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '🤒 Submit Sick Leave';
    }
});

// ========== FRL FORM ==========
document.getElementById('frlLeaveForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!currentLoggedInStaff) {
        showTemporaryFeedback('⚠️ Please login first', true);
        return;
    }

    const submitBtn = document.getElementById('frlSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Submitting...';
    }

    const date = document.getElementById('frlDate')?.value;
    const dutyTime = document.getElementById('frlDutyTime')?.value;
    const reason = document.getElementById('frlReason')?.value;
    const details = document.getElementById('frlDetails')?.value;

    if (!date) { showFormFeedback('Please select date', 'error', 'frlFeedback'); if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '👨‍👩‍👧‍👦 Submit FRL'; } return; }
    if (!reason) { showFormFeedback('Please select a reason', 'error', 'frlFeedback'); if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '👨‍👩‍👧‍👦 Submit FRL'; } return; }

    const existing = await checkExistingLeaveOnSameDay(currentLoggedInStaff.id, date, 'frl');
    if (existing.hasExisting) {
        showFormFeedback(
            `⚠️ You already have a ${existing.existingType} request on ${existing.existingDate} (${existing.status}).\nYou cannot apply for FRL on the same day.`, 
            'error', 
            'frlFeedback'
        );
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '👨‍👩‍👧‍👦 Submit FRL';
        }
        return;
    }

    // Negative balances are allowed. FRL can be submitted even when the current balance is 0 or below.

    const reportedDateTime = getGMT5DateTimeString();
    const reportedDate = getGMT5DateString();
    const reportedTime = getGMT5TimeString();

    const request = {
        staffId: currentLoggedInStaff.id,
        staffName: currentLoggedInStaff.name,
        staffRole: currentLoggedInStaff.role || 'Staff',
        staffRcno: currentLoggedInStaff.rcno || currentLoggedInStaff.id,
        type: LeaveRequestManager.TYPES.FRL,
        leaveType: 'Family Responsibility Leave',
        date: date,
        dutyTime: dutyTime || 'Morning 0730',
        reason: reason,
        details: details || '',
        days: 1,
        reportedDate: reportedDate,
        reportedTime: reportedTime,
        reportedDateTime: reportedDateTime
    };

    await frlManager.loadFRLData();
    const frlStatus = await frlManager.checkStaffFRLStatus(currentLoggedInStaff.id, 'frl_request');
    
    if (frlStatus.isFrequent) {
        const proceed = confirm(
            `${frlStatus.warning}\n\n` +
            `This staff has made ${frlStatus.count} FRL requests in the last 30 days.\n` +
            'Do you want to proceed with this request?'
        );
        if (!proceed) {
            showFormFeedback('Request cancelled due to FRL check', 'error', 'frlFeedback');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '👨‍👩‍👧‍👦 Submit FRL';
            }
            return;
        }
    }

    showLoadingPopup('⏳ Submitting FRL...', 'Please wait...');
    const saved = await leaveManager.saveRequest(request);
    if (saved) {
        await balanceManager.deductLeave(currentLoggedInStaff.id, LeaveRequestManager.TYPES.FRL, 1);
        await frlManager.addRequestToFRL(currentLoggedInStaff.id, 'frl_request', { date, reason, details });
        
        let frlEmailSent = false;
        try {
            await sendLeaveEmailV31(request, null);
            frlEmailSent = true;
        } catch (emailError) {
            console.error('FRL saved but email failed:', emailError);
            showTemporaryFeedback(
                '⚠️ FRL saved, but email failed: ' + (emailError.message || 'Unknown email error'),
                true
            );
        }

        showSuccessPopup('✅ FRL Submitted!', `${reason} on ${date} at ${dutyTime}\nReported: ${reportedDateTime}`);
        
        const frlDate = document.getElementById('frlDate');
        const frlDutyTime = document.getElementById('frlDutyTime');
        const frlReason = document.getElementById('frlReason');
        const frlDetails = document.getElementById('frlDetails');
        
        if (frlDate) frlDate.value = '';
        if (frlDutyTime) frlDutyTime.value = 'Morning 0730';
        if (frlReason) frlReason.value = '';
        if (frlDetails) frlDetails.value = '';
        
        await loadLeaveData();
        showFormFeedback(frlEmailSent ? '✅ FRL submitted and email sent!' : '⚠️ FRL submitted, but email was not sent. Check Admin Email Diagnostics.', frlEmailSent ? 'success' : 'error', 'frlFeedback');
    } else {
        hideLoadingPopup();
        showFormFeedback('❌ Failed to submit FRL', 'error', 'frlFeedback');
    }
    
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '👨‍👩‍👧‍👦 Submit FRL';
    }
});

// ========== FORM FEEDBACK ==========
function showFormFeedback(message, type, id) {
    const feedback = document.getElementById(id);
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = 'form-feedback ' + type;
    feedback.style.display = 'block';
    setTimeout(() => { feedback.style.display = 'none'; }, 5000);
}


// ========== LEAVE INBOX NOTIFICATIONS ==========
async function notifyLeaveApproved(request) {
    if (
        !request ||
        !request.staffId
    ) {
        return false;
    }

    if (
        !window.PortalNotify ||
        typeof window.PortalNotify.send !==
            'function'
    ) {
        console.warn(
            'PortalNotify is not loaded. Leave approval was saved, but Inbox notification was not created.'
        );

        return false;
    }

    const leaveLabel =
        request.leaveType ||
        (
            String(request.type || '')
                .toLowerCase() === 'frl'
                ? 'Family Responsibility Leave'
                : 'Sick Leave'
        );

    try {
        await window.PortalNotify.send({
            recipientIds: [
                String(request.staffId)
            ],

            recipientRoles: [],

            title:
                'Leave Approved',

            detail:
                `${leaveLabel} for ${request.date || ''} was approved by Admin.`,

            url:
                'leaveapp.html',

            type:
                'leave-approved',

            sourceId:
                request.id || '',

            actorId:
                currentLoggedInStaff?.id || '',

            actorName:
                currentLoggedInStaff?.name ||
                'Admin'
        });

        return true;

    } catch (error) {
        console.warn(
            'Leave approval Inbox notification failed:',
            error
        );

        return false;
    }
}


async function sendLeaveCancelEmail(request){
 try{
  if(!window.PortalEmail?.sendLeaveSplit)return false;
  const s=getStaffById(request.staffId)||{};
  const message=['LEAVE REQUEST - CANCELLED','========================================',`Date: ${request.date||'N/A'}`,`Leave Type: ${request.leaveType||request.type||'Leave'}`,`Staff: ${request.staffName||s.name||'N/A'}`,`Staff ID: ${request.staffRcno||request.rcno||s.rcno||request.staffId||'N/A'}`,`Reason: ${request.reason||'N/A'}`,'','This Leave request was cancelled before Admin approval.','========================================','Koveli Staff Portal'].join('\n');
  await window.PortalEmail.sendLeaveSplit({subject:`Leave Cancelled - ${request.staffName||s.name||'Staff'} - ${request.date||''}`,message,attachment:null,staffEmail:s.email||'',replyTo:s.email||''});return true;
 }catch(e){console.warn('Leave cancel email failed:',e);return false}
}

// ========== LEAVE REQUEST ACTIONS ==========

// ========== CANCEL LEAVE REQUEST (UPDATED WITH BALANCE RESTORE) ==========
window.cancelLeaveRequest = async function(requestId) {
    try {
        const requests = await leaveManager.loadRequests({});
        const request = requests.find(r => String(r.id) === String(requestId));

        if (!request) {
            showTemporaryFeedback('❌ Request not found', true);
            return;
        }

        if (String(request.staffId) !== String(currentLoggedInStaff?.id)) {
            showTemporaryFeedback('❌ You can only cancel your own leave request', true);
            return;
        }

        if (String(request.status || '').toLowerCase() !== 'pending') {
            showTemporaryFeedback(
                '⚠️ Only pending leave requests can be cancelled. Approved leave is locked.',
                true
            );
            return;
        }

        if (!confirm('Cancel this pending leave request? Your leave balance will be restored.')) {
            return;
        }

        const balance = await balanceManager.loadBalances(request.staffId);
        if (balance) {
            const updates = {};
            if (request.type === 'sick') {
                updates.sickLeave = (Number(balance.sickLeave) || 0) + 1;
            } else if (request.type === 'frl') {
                updates.frlBalance = (Number(balance.frlBalance) || 0) + 1;
            }
            await balanceManager.updateBalance(request.staffId, {
                ...balance,
                ...updates
            });
        }

        // Keep the transaction in history instead of deleting it.
        const ok = await leaveManager.updateRequestStatus(
            requestId,
            'cancelled',
            'Cancelled by staff'
        );

        if (!ok) {
            showTemporaryFeedback('❌ Failed to cancel request', true);
            return;
        }

        await sendLeaveCancelEmail(request);

        if (
            window.PortalNotify &&
            typeof window.PortalNotify.send === 'function'
        ) {
            try {
                await window.PortalNotify.send({
                    recipientIds: [],
                    recipientRoles: ['admin', 'supervisor'],
                    title: 'Leave Cancelled',
                    detail:
                        `${request.staffName || 'Staff'} cancelled ` +
                        `${request.leaveType || request.type || 'leave'} for ${request.date || ''}.`,
                    url: 'leaveapp.html',
                    type: 'leave-cancelled',
                    sourceId: requestId,
                    actorId: currentLoggedInStaff?.id || '',
                    actorName: currentLoggedInStaff?.name || ''
                });
            } catch (e) {
                console.warn('Leave cancel Inbox notification:', e);
            }
        }

        showTemporaryFeedback('✅ Leave request cancelled and balance restored');
        await loadLeaveData();

    } catch (error) {
        console.error('Error cancelling request:', error);
        showTemporaryFeedback('❌ Error cancelling request: ' + error.message, true);
    }
};

window.approveLeaveRequest = async function(requestId) {
    if (
        !currentLoggedInStaff ||
        String(
            currentLoggedInStaff.role ||
            ''
        ).toLowerCase() !==
            'admin'
    ) {
        showTemporaryFeedback(
            '❌ Only Admins can approve requests',
            true
        );

        return;
    }

    try {
        const requests =
            await leaveManager.loadRequests(
                {}
            );

        const request =
            requests.find(
                r =>
                    String(r.id) ===
                    String(requestId)
            );

        if (!request) {
            showTemporaryFeedback(
                '❌ Leave request not found',
                true
            );

            return;
        }

        // One-click approval: no remarks prompt.
        const ok =
            await leaveManager
                .updateRequestStatus(
                    requestId,
                    'approved',
                    ''
                );

        if (!ok) {
            showTemporaryFeedback(
                '❌ Could not approve leave request',
                true
            );

            return;
        }

        request.status =
            'approved';

        request.reviewedBy =
            currentLoggedInStaff?.name ||
            'Admin';

        request.reviewedByRole =
            'Admin';

        // No email. Send only to the staff portal Inbox.
        await notifyLeaveApproved(
            request
        );

        showTemporaryFeedback(
            '✅ Leave request approved'
        );

        await loadLeaveData();

    } catch (error) {
        console.error(
            'Approve leave request:',
            error
        );

        showTemporaryFeedback(
            '❌ Error approving leave request',
            true
        );
    }
};

window.rejectLeaveRequest = async function(requestId) {
    if (
        !currentLoggedInStaff ||
        String(currentLoggedInStaff.role || '').toLowerCase() !== 'admin'
    ) {
        showTemporaryFeedback('❌ Only Admins can reject requests', true);
        return;
    }
    const reason = prompt('Please provide a reason for rejection:');
    if (reason === null) return;
    const ok = await leaveManager.updateRequestStatus(requestId, 'rejected', reason);
    if (ok) {
        showTemporaryFeedback('❌ Leave request rejected');
        await loadLeaveData();
    }
};

window.clearStaffFRL = async function(staffId) {
    if (!confirm(`Clear all FRL records for this staff?`)) return;
    const ok = await frlManager.clearFRLRecords(staffId);
    if (ok) {
        showTemporaryFeedback('✅ FRL records cleared');
        await loadFRLReport();
    }
};

// ========== ADMIN: UPDATE BALANCE ==========
document.getElementById('updateBalanceBtn')?.addEventListener('click', async function() {
    const staffId = document.getElementById('adminStaffSelect')?.value;
    if (!staffId) {
        showFormFeedback('Please select a staff member', 'error', 'adminFeedback');
        return;
    }

    const sickLeave = parseInt(document.getElementById('adminSickBalance')?.value) || 0;
    const frlBalance = parseInt(document.getElementById('adminFrlBalance')?.value) || 0;
    const frlRenewal = document.getElementById('adminFrlRenewal')?.value || null;

    const ok = await balanceManager.updateBalance(staffId, {
        sickLeave,
        frlBalance,
        frlRenewal
    });

    if (ok) {
        showFormFeedback('✅ Balance updated successfully!', 'success', 'adminFeedback');
        await loadLeaveData();
    } else {
        showFormFeedback('❌ Failed to update balance', 'error', 'adminFeedback');
    }
});

// ========== LOGOUT ==========
window.logoutUser = function() {
    if (!currentLoggedInStaff) {
        showTemporaryFeedback('⚠️ You are not logged in', true);
        return;
    }
    if (!confirm(`Logout ${currentLoggedInStaff.name}?`)) return;
    currentLoggedInStaff = null;

    sessionStorage.removeItem('koveliUser');
    localStorage.removeItem('koveliUser');

    sessionStorage.removeItem('koveliActiveSession');
    localStorage.removeItem('koveliActiveSession');

    localStorage.removeItem(LEGACY_SESSION_KEY);

    window.location.href = 'login.html';
};

// ========== LOADING POPUP ==========

function showLoadingPopup(title, subtitle) {
    const popup = document.getElementById('loadingPopup');
    const spinner = document.getElementById('loadingSpinner');
    const icon = document.getElementById('loadingIcon');
    const titleEl = document.getElementById('loadingTitle');
    const subtitleEl = document.getElementById('loadingSubtitle');
    if (!popup) return;
    if (spinner) spinner.style.display = 'block';
    if (icon) icon.style.display = 'none';
    if (titleEl) titleEl.textContent = title || 'Processing...';
    if (subtitleEl) subtitleEl.textContent = subtitle || 'Please wait';
    popup.classList.add('active');
}

function showSuccessPopup(title, subtitle) {
    const popup = document.getElementById('loadingPopup');
    const spinner = document.getElementById('loadingSpinner');
    const icon = document.getElementById('loadingIcon');
    const titleEl = document.getElementById('loadingTitle');
    const subtitleEl = document.getElementById('loadingSubtitle');
    if (!popup) return;
    if (spinner) spinner.style.display = 'none';
    if (icon) {
        icon.style.display = 'block';
        icon.innerHTML = '✅';
        icon.style.fontSize = '4rem';
        icon.style.marginBottom = '15px';
        icon.style.animation = 'popIn 0.5s ease';
    }
    if (titleEl) titleEl.textContent = title || 'Success!';
    if (subtitleEl) subtitleEl.textContent = subtitle || 'Operation completed successfully';
    setTimeout(() => hideLoadingPopup(), 3000);
}

function hideLoadingPopup() {
    const popup = document.getElementById('loadingPopup');
    if (popup) popup.classList.remove('active');
}

// ========== TOAST ==========
function showTemporaryFeedback(message, isError = false) {
    const toast = document.getElementById('messageToast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'message-toast' + (isError ? ' error' : '');
    toast.style.display = 'block';
    toast.style.opacity = '1';
    setTimeout(() => { 
        toast.style.opacity = '0';
        setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 3000);
}

// ========== AUTH SYSTEM ==========
let currentPatternSequence = [];
let currentNumericValue = '';
let isDrawing = false;
let dotElements = [];
let ctx = null;
let canvas = null;
let patternWrapper = null;

function initPatternLock() {
    const grid = document.getElementById('patternGrid');
    if (!grid) return;
    grid.innerHTML = '';
    dotElements = [];
    for (let i = 1; i <= 9; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        dot.dataset.value = i;
        dot.addEventListener('mousedown', (e) => startPattern(e, i));
        dot.addEventListener('touchstart', (e) => { e.preventDefault(); startPattern(e, i); });
        grid.appendChild(dot);
        dotElements.push(dot);
    }
    canvas = document.getElementById('patternCanvas');
    ctx = canvas ? canvas.getContext('2d') : null;
    patternWrapper = document.querySelector('#patternTab .pattern-wrapper');
    resizeCanvas();
    window.addEventListener('resize', () => resizeCanvas());
    attachGlobalEvents();
}

function resizeCanvas() {
    if (!patternWrapper || !canvas || !ctx) return;
    const rect = patternWrapper.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function startPattern(e, val) {
    if (!pendingAuth.staff) return;
    e.preventDefault();
    isDrawing = true;
    const idx = currentPatternSequence.indexOf(val);
    if (idx === -1) currentPatternSequence.push(val);
    else currentPatternSequence = currentPatternSequence.slice(0, idx + 1);
    dotElements.forEach((dot, index) => {
        if (currentPatternSequence.includes(index + 1)) dot.classList.add('temp-selected');
        else dot.classList.remove('temp-selected');
    });
}

function onPatternMove(e) {
    if (!isDrawing || !pendingAuth.staff) return;
    const touch = e.touches ? e.touches[0] : e;
    const elem = document.elementsFromPoint(touch.clientX, touch.clientY);
    for (let el of elem) {
        if (el.classList?.contains('dot')) {
            const val = parseInt(el.dataset.value);
            if (val && currentPatternSequence[currentPatternSequence.length - 1] !== val) {
                if (!currentPatternSequence.includes(val)) currentPatternSequence.push(val);
                else {
                    const idx = currentPatternSequence.indexOf(val);
                    if (idx !== -1 && idx !== currentPatternSequence.length - 1)
                        currentPatternSequence = currentPatternSequence.slice(0, idx + 1);
                }
                dotElements.forEach((dot, index) => {
                    if (currentPatternSequence.includes(index + 1)) dot.classList.add('temp-selected');
                    else dot.classList.remove('temp-selected');
                });
            }
            break;
        }
    }
}

function endPattern() {
    if (isDrawing) {
        isDrawing = false;
        dotElements.forEach(dot => dot.classList.remove('selected', 'temp-selected'));
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (pendingAuth.staff && pendingAuthResolve && currentPatternSequence.length > 0) {
            attemptAutoVerify('pattern');
        } else {
            resetPattern();
        }
    }
}

function attachGlobalEvents() {
    window.addEventListener('mouseup', endPattern);
    window.addEventListener('touchend', endPattern);
    window.addEventListener('mousemove', onPatternMove);
    window.addEventListener('touchmove', (e) => { e.preventDefault(); onPatternMove(e); });
}

function resetPattern() {
    currentPatternSequence = [];
    dotElements.forEach(dot => dot.classList.remove('selected', 'temp-selected'));
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    const statusEl = document.getElementById('patternStatus');
    if (statusEl) statusEl.innerText = "✏️ Draw pattern";
}

function getPatternString() {
    return currentPatternSequence.join('');
}

function buildKeypad() {
    const pad = document.getElementById('keypad');
    if (!pad) return;
    pad.innerHTML = '';
    for (let i = 1; i <= 9; i++) {
        const btn = document.createElement('div');
        btn.className = 'key-btn';
        btn.innerText = i;
        btn.addEventListener('click', () => appendNumeric(i.toString()));
        pad.appendChild(btn);
    }
    const zeroBtn = document.createElement('div');
    zeroBtn.className = 'key-btn';
    zeroBtn.innerText = '0';
    zeroBtn.addEventListener('click', () => appendNumeric('0'));
    pad.appendChild(zeroBtn);
    const dummy = document.createElement('div');
    dummy.style.visibility = 'hidden';
    pad.appendChild(dummy);
}

function appendNumeric(digit) {
    if (!pendingAuth.staff) return;
    if (currentNumericValue.length < 8) currentNumericValue += digit;
    updateNumericDisplay();
    const storedPass = String(pendingAuth.staff.pass || '');
    if (storedPass && currentNumericValue === storedPass && pendingAuthResolve)
        attemptAutoVerify('numeric');
}

function clearNumeric() {
    currentNumericValue = '';
    updateNumericDisplay();
}

function deleteNumeric() {
    currentNumericValue = currentNumericValue.slice(0, -1);
    updateNumericDisplay();
}

function updateNumericDisplay() {
    const disp = document.getElementById('numericInput');
    if (disp) disp.innerText = '●'.repeat(currentNumericValue.length) || '●●●●';
}

async function attemptAutoVerify(source) {
    if (!pendingAuth.staff || !pendingAuthResolve) return;
    const staff = pendingAuth.staff;
    let isValid = source === 'pattern' ?
        getPatternString() === String(staff.pattern || '') :
        currentNumericValue === String(staff.pass || '');

    if (isValid) {
        const resolve = pendingAuthResolve;
        pendingAuthResolve = null;
        closeAuthModal(true);
        resolve({ success: true, staff: staff });

        currentLoggedInStaff = staff;
        window.currentLoggedInStaff = staff;
        
        const profileShortName = document.getElementById('profileShortName');
        const profileAvatar = document.getElementById('profileAvatar');
        if (profileShortName) profileShortName.textContent = staff.name.split(' ')[0];
        if (profileAvatar) profileAvatar.textContent = staff.name.charAt(0).toUpperCase();

        saveSession(staff);
        await loadLeaveData();
        showTemporaryFeedback(`✅ Welcome ${staff.name}!`);
    } else {
        if (source === 'pattern') { resetPattern(); } else { clearNumeric(); }
        const statusDiv = document.getElementById(source === 'pattern' ? 'patternStatus' : 'numericInput');
        if (statusDiv) {
            statusDiv.textContent = '❌ Wrong!';
            statusDiv.style.color = '#c25d2e';
            setTimeout(() => {
                if (source === 'pattern') statusDiv.textContent = 'Draw pattern';
                else updateNumericDisplay();
                statusDiv.style.color = '#a57334';
            }, 1200);
        }
    }
}

function closeAuthModal(success = false) {
    const modal = document.getElementById('passwordModal');
    if (modal) modal.classList.remove('active');
    if (!success && pendingAuthResolve && pendingAuth.selectEl && pendingAuth.prevDropdownValue) {
        const resolve = pendingAuthResolve;
        pendingAuthResolve = null;
        if (pendingAuth.selectEl) pendingAuth.selectEl.value = pendingAuth.prevDropdownValue;
        resolve({ success: false });
    }
    resetPattern();
    currentNumericValue = '';
    updateNumericDisplay();
}

function openPasswordModal(staff, selectEl, prevVal) {
    return new Promise((resolve) => {
        pendingAuth = { staff, viewType: 'login', selectEl, prevDropdownValue: prevVal };
        pendingAuthResolve = resolve;
        const modalStaffName = document.getElementById('modalStaffName');
        if (modalStaffName) modalStaffName.innerHTML = `🔐 ${staff.name} (ID: ${staff.id})`;
        resetPattern();
        currentNumericValue = '';
        updateNumericDisplay();
        const activeTab = document.querySelector('.modal-tab-btn.active-tab');
        if (activeTab) activeTab.click();
        const modal = document.getElementById('passwordModal');
        if (modal) modal.classList.add('active');
        setTimeout(() => resizeCanvas(), 30);
    });
}

// ========== SAVE SESSION ==========
function saveSession(staff) {
    if (staff) {
        const sessionData = {
            id: staff.id,
            name: staff.name,
            role: staff.role,
            rcno: staff.rcno || staff.id,
            contact: staff.contact || '',
            email: staff.email || '',
            pass: staff.pass || '',
            pattern: staff.pattern || '',
            annualLeave: staff.annualLeave || 21,
            sickLeave: staff.sickLeave || 30,
            frlBalance: staff.frlBalance || 5,
            frlRenewal: staff.frlRenewal || null,
            timestamp: Date.now()
        };
        // Keep the active Koveli session in sessionStorage.
        sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify({
                ...sessionData,
                username:
                    staff.username ||
                    staff.id ||
                    staff.rcno ||
                    ''
            })
        );
    }
}

// ========== CHANGE PASSWORD ==========
let changeMode = 'pattern';
let changePatternSeq = [];
let changePinValue = '';
let activeStaffForChange = null;
let changeDotElements = [];
let changeCtx = null;
let changeCanvas = null;
let changeWrapper = null;
let isDrawingChange = false;

function initChangePatternGrid() {
    const grid = document.getElementById('changePatternGrid');
    if (!grid) return;
    grid.innerHTML = '';
    changeDotElements = [];
    for (let i = 1; i <= 9; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        dot.dataset.value = i;
        dot.addEventListener('mousedown', (e) => startChangePattern(e, i));
        dot.addEventListener('touchstart', (e) => { e.preventDefault(); startChangePattern(e, i); });
        grid.appendChild(dot);
        changeDotElements.push(dot);
    }
    changeCanvas = document.getElementById('changePatternCanvas');
    changeCtx = changeCanvas ? changeCanvas.getContext('2d') : null;
    changeWrapper = document.querySelector('#changePatternPane .pattern-wrapper');
    window.addEventListener('resize', () => resizeChangeCanvas());
    window.addEventListener('mouseup', endChangePattern);
    window.addEventListener('touchend', endChangePattern);
    window.addEventListener('mousemove', onChangePatternMove);
    window.addEventListener('touchmove', (e) => { e.preventDefault(); onChangePatternMove(e); });
}

function resizeChangeCanvas() {
    if (!changeWrapper || !changeCanvas || !changeCtx) return;
    const rect = changeWrapper.getBoundingClientRect();
    changeCanvas.width = rect.width;
    changeCanvas.height = rect.height;
}

function startChangePattern(e, val) {
    e.preventDefault();
    isDrawingChange = true;
    const idx = changePatternSeq.indexOf(val);
    if (idx === -1) changePatternSeq.push(val);
    else changePatternSeq = changePatternSeq.slice(0, idx + 1);
    changeDotElements.forEach((dot, index) => {
        if (changePatternSeq.includes(index + 1)) dot.classList.add('temp-selected');
        else dot.classList.remove('temp-selected');
    });
    const statusEl = document.getElementById('changePatternStatus');
    if (statusEl) statusEl.innerHTML = `Pattern: ${'●'.repeat(changePatternSeq.length)} dots`;
}

function onChangePatternMove(e) {
    if (!isDrawingChange) return;
    const touch = e.touches ? e.touches[0] : e;
    const elem = document.elementsFromPoint(touch.clientX, touch.clientY);
    for (let el of elem) {
        if (el.classList?.contains('dot')) {
            const val = parseInt(el.dataset.value);
            if (val && changePatternSeq[changePatternSeq.length - 1] !== val) {
                if (!changePatternSeq.includes(val)) changePatternSeq.push(val);
                else {
                    const idx = changePatternSeq.indexOf(val);
                    if (idx !== -1 && idx !== changePatternSeq.length - 1)
                        changePatternSeq = changePatternSeq.slice(0, idx + 1);
                }
                changeDotElements.forEach((dot, index) => {
                    if (changePatternSeq.includes(index + 1)) dot.classList.add('temp-selected');
                    else dot.classList.remove('temp-selected');
                });
                const statusEl = document.getElementById('changePatternStatus');
                if (statusEl) statusEl.innerHTML = `Pattern: ${'●'.repeat(changePatternSeq.length)} dots`;
            }
            break;
        }
    }
}

function endChangePattern() {
    isDrawingChange = false;
    changeDotElements.forEach(dot => dot.classList.remove('selected', 'temp-selected'));
    if (changeCtx) changeCtx.clearRect(0, 0, changeCanvas.width, changeCanvas.height);
}

function resetChangePattern() {
    changePatternSeq = [];
    changeDotElements.forEach(dot => dot.classList.remove('selected', 'temp-selected'));
    const statusEl = document.getElementById('changePatternStatus');
    if (statusEl) statusEl.innerHTML = '📌 Draw new pattern';
}

function buildChangePinKeypad() {
    const pad = document.getElementById('changePinKeypad');
    if (!pad) return;
    pad.innerHTML = '';
    for (let i = 1; i <= 9; i++) {
        const btn = document.createElement('div');
        btn.className = 'key-btn';
        btn.innerText = i;
        btn.addEventListener('click', () => {
            changePinValue += i.toString();
            if (changePinValue.length > 8) changePinValue = changePinValue.slice(0, 8);
            const display = document.getElementById('changePinDisplay');
            if (display) display.innerHTML = '●'.repeat(changePinValue.length) || '●●●●●●';
        });
        pad.appendChild(btn);
    }
    const zero = document.createElement('div');
    zero.className = 'key-btn';
    zero.innerText = '0';
    zero.addEventListener('click', () => {
        changePinValue += '0';
        if (changePinValue.length > 8) changePinValue = changePinValue.slice(0, 8);
        const display = document.getElementById('changePinDisplay');
        if (display) display.innerHTML = '●'.repeat(changePinValue.length) || '●●●●●●';
    });
    pad.appendChild(zero);
    const dummy = document.createElement('div');
    dummy.style.visibility = 'hidden';
    pad.appendChild(dummy);
    
    const clearBtn = document.getElementById('clearChangePinBtn');
    if (clearBtn) {
        clearBtn.onclick = () => {
            changePinValue = '';
            const display = document.getElementById('changePinDisplay');
            if (display) display.innerHTML = '●●●●●●';
        };
    }
    
    const deleteBtn = document.getElementById('deleteChangePinBtn');
    if (deleteBtn) {
        deleteBtn.onclick = () => {
            changePinValue = changePinValue.slice(0, -1);
            const display = document.getElementById('changePinDisplay');
            if (display) display.innerHTML = '●'.repeat(changePinValue.length) || '●●●●●●';
        };
    }
}

async function saveNewCode() {
    let newCode = changeMode === 'pattern' ? changePatternSeq.join('') : changePinValue;
    const feedbackEl = document.getElementById('changeFeedback');
    if (!newCode) {
        if (feedbackEl) feedbackEl.innerHTML = '<span style="color:#c25d2e;">⚠️ Enter a code</span>';
        return;
    }
    if (!/^\d+$/.test(newCode)) {
        if (feedbackEl) feedbackEl.innerHTML = '<span style="color:#c25d2e;">❌ Only numbers</span>';
        return;
    }
    if (changeMode === 'pattern' && newCode.length < 3) {
        if (feedbackEl) feedbackEl.innerHTML = '<span style="color:#c25d2e;">⚠️ 3+ dots</span>';
        return;
    }
    if (changeMode === 'pin' && newCode.length < 4) {
        if (feedbackEl) feedbackEl.innerHTML = '<span style="color:#c25d2e;">⚠️ 4+ digits</span>';
        return;
    }

    if (feedbackEl) feedbackEl.innerHTML = '<span>💾 Saving...</span>';
    if (changeMode === 'pattern') activeStaffForChange.pattern = newCode;
    else activeStaffForChange.pass = newCode;

    const synced = await syncStaffToFirebase(activeStaffForChange);
    if (synced) {
        if (feedbackEl) feedbackEl.innerHTML = `<span style="color:#2c6e2c;">✅ Saved!</span>`;
        setTimeout(() => {
            const modal = document.getElementById('changePasswordModal');
            if (modal) modal.classList.remove('active');
        }, 1200);
        showTemporaryFeedback('Login code updated successfully!');
        saveSession(activeStaffForChange);
    } else {
        if (feedbackEl) feedbackEl.innerHTML = '<span style="color:#e67e22;">⚠️ Save failed</span>';
    }
}

async function syncStaffToFirebase(staff) {
    if (!db || !firebaseConnected) return false;
    try {
        await db.collection('staff').doc(staff.id).set({
            id: staff.id,
            name: staff.name,
            role: staff.role,
            contact: staff.contact || '',
            rcno: staff.rcno || '',
            pass: staff.pass || '',
            pattern: staff.pattern || '',
            email: staff.email || '',
            sickLeave: staff.sickLeave || 30,
            frlBalance: staff.frlBalance || 5,
            frlRenewal: staff.frlRenewal || null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return true;
    } catch (e) {
        console.warn('Sync error:', e);
        return false;
    }
}

// ========== FILE INPUT HANDLERS ==========
document.getElementById('sickAttachment')?.addEventListener('change', function() {
    const fileName = this.files[0]?.name || 'No file chosen';
    const fileNameEl = document.getElementById('sickFileName');
    if (fileNameEl) fileNameEl.textContent = fileName;
    
    const infoEl = document.getElementById('sickAttachmentInfo');
    if (!infoEl) return;
    if (this.files[0]) {
        const file = this.files[0];
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            infoEl.textContent = '⚠️ File is too large. Maximum size is 5MB';
            infoEl.className = 'attachment-info show error';
            infoEl.style.color = '#c25d2e';
            infoEl.style.background = '#f8d7da';
            this.value = '';
            if (fileNameEl) fileNameEl.textContent = 'No file chosen';
        } else {
            infoEl.textContent = `📎 ${file.name} (${(file.size / 1024).toFixed(1)} KB) will be attached`;
            infoEl.className = 'attachment-info show success';
            infoEl.style.color = '#2c6e2c';
            infoEl.style.background = '#d4e8d4';
        }
    } else {
        infoEl.textContent = '';
        infoEl.className = 'attachment-info';
    }
});

// ========== INIT ==========
async function initApp() {
    console.log('🚀 Initializing Leave Management App...');
    initFirebase();
    initPatternLock();
    buildKeypad();
    initChangePatternGrid();
    buildChangePinKeypad();

    updateReportedDateTime();
    setInterval(updateReportedDateTime, 1000);

    await frlManager.loadFRLData();

    // Load authorized staff from script/user.js first.
    // Firebase Authentication is NOT used.
    staffData = getUserJsUsers();

    // Keep Firestore as a legacy fallback only when user.js has no users.
    if (!staffData.length && db && firebaseConnected) {
        try {
            const staffSnap = await db.collection('staff').get();

            staffSnap.forEach(doc => {
                const d = doc.data();

                const normalized = normalizePortalUser({
                    id: doc.id,
                    ...d,
                    rcno: d.rcno || doc.id
                });

                if (normalized) {
                    staffData.push(normalized);
                }
            });

        } catch (e) {
            console.warn(
                'Could not load legacy Firestore staff list:',
                e
            );
        }
    }

    staffData.sort(
        (a, b) =>
            String(a.name || '')
                .localeCompare(String(b.name || ''))
    );

    window.staffList = staffData;
    staffLoaded = true;

    const sessionStaff = getSession();
    if (sessionStaff) {
        currentLoggedInStaff = sessionStaff;
        window.currentLoggedInStaff = sessionStaff;
        const profileShortName = document.getElementById('profileShortName');
        const profileAvatar = document.getElementById('profileAvatar');
        if (profileShortName) profileShortName.textContent = sessionStaff.name.split(' ')[0];
        if (profileAvatar) profileAvatar.textContent = sessionStaff.name.charAt(0).toUpperCase();
        
        const statusEl = document.getElementById('sessionStatus');
        if (statusEl) {
            statusEl.style.display = 'block';
            const userName = document.getElementById('sessionUserName');
            const userRole = document.getElementById('sessionUserRole');
            if (userName) userName.textContent = sessionStaff.name;
            if (userRole) userRole.textContent = sessionStaff.role;
        }
        
        await loadLeaveData();
        showTemporaryFeedback(`👋 Welcome ${sessionStaff.name}!`);
    } else {
        window.location.href = 'login.html';
        return;
    }

    const profileBtn = document.getElementById('profileButton');
    const profileMenu = document.getElementById('profileMenu');
    if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (profileMenu) profileMenu.classList.toggle('show');
        });
    }
    document.addEventListener('click', () => {
        if (profileMenu) profileMenu.classList.remove('show');
    });

    const profileViewAction = document.getElementById('profileViewAction');
    if (profileViewAction) {
        profileViewAction.onclick = () => {
            if (currentLoggedInStaff) {
                alert(`👤 ${currentLoggedInStaff.name}\nRole: ${currentLoggedInStaff.role}\nID: ${currentLoggedInStaff.id}\nContact: ${currentLoggedInStaff.contact || 'N/A'}`);
            } else {
                showTemporaryFeedback('Please login first', true);
            }
            if (profileMenu) profileMenu.classList.remove('show');
        };
    }

    const profileChangePass = document.getElementById('profileChangePass');
    if (profileChangePass) {
        profileChangePass.onclick = () => {
            if (currentLoggedInStaff) {
                activeStaffForChange = currentLoggedInStaff;
                changePatternSeq = [];
                changePinValue = '';
                resetChangePattern();
                const pinDisplay = document.getElementById('changePinDisplay');
                if (pinDisplay) pinDisplay.innerHTML = '●●●●●●';
                const feedback = document.getElementById('changeFeedback');
                if (feedback) feedback.innerHTML = '';
                const modal = document.getElementById('changePasswordModal');
                if (modal) modal.classList.add('active');
            } else {
                showTemporaryFeedback('Please login first', true);
            }
            if (profileMenu) profileMenu.classList.remove('show');
        };
    }

    const logoutAction = document.getElementById('logoutAction');
    if (logoutAction) {
        logoutAction.addEventListener('click', function(e) {
            e.stopPropagation();
            window.logoutUser();
            if (profileMenu) profileMenu.classList.remove('show');
        });
    }

    document.querySelectorAll('.modal-tab-btn').forEach(btn => btn.addEventListener('click', () => {
        const tabId = btn.dataset.modalTab;
        document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active-tab'));
        btn.classList.add('active-tab');
        const patternTab = document.getElementById('patternTab');
        const numericTab = document.getElementById('numericTab');
        if (patternTab) patternTab.classList.toggle('active-pane', tabId === 'pattern');
        if (numericTab) numericTab.classList.toggle('active-pane', tabId === 'numeric');
        if (tabId === 'pattern') setTimeout(() => resizeCanvas(), 30);
    }));

    const resetPatternBtn = document.getElementById('resetPatternBtn');
    const clearNumericBtn = document.getElementById('clearNumericBtn');
    const deleteNumericBtn = document.getElementById('deleteNumericBtn');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    if (resetPatternBtn) resetPatternBtn.onclick = resetPattern;
    if (clearNumericBtn) clearNumericBtn.onclick = clearNumeric;
    if (deleteNumericBtn) deleteNumericBtn.onclick = deleteNumeric;
    if (modalCloseBtn) modalCloseBtn.onclick = () => closeAuthModal(false);

    document.querySelectorAll('.change-method-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            changeMode = btn.dataset.changeMethod;
            document.querySelectorAll('.change-method-btn').forEach(b => b.classList.remove('active-method'));
            btn.classList.add('active-method');
            const changePatternPane = document.getElementById('changePatternPane');
            const changePinPane = document.getElementById('changePinPane');
            if (changePatternPane) changePatternPane.classList.toggle('active-pane', changeMode === 'pattern');
            if (changePinPane) changePinPane.classList.toggle('active-pane', changeMode === 'pin');
            if (changeMode === 'pattern') setTimeout(() => resizeChangeCanvas(), 30);
        });
    });

    const resetChangePatternBtn = document.getElementById('resetChangePatternBtn');
    const saveNewCodeBtn = document.getElementById('saveNewCodeBtn');
    const cancelChangeBtn = document.getElementById('cancelChangeBtn');
    const closeChangeModalBtn = document.getElementById('closeChangeModalBtn');

    if (resetChangePatternBtn) resetChangePatternBtn.onclick = resetChangePattern;
    if (saveNewCodeBtn) saveNewCodeBtn.onclick = saveNewCode;
    if (cancelChangeBtn) cancelChangeBtn.onclick = () => {
        const modal = document.getElementById('changePasswordModal');
        if (modal) modal.classList.remove('active');
    };
    if (closeChangeModalBtn) closeChangeModalBtn.onclick = () => {
        const modal = document.getElementById('changePasswordModal');
        if (modal) modal.classList.remove('active');
    };

    const today = getGMT5DateString();
    const defaultDutyTime = 'Morning 0730';
    
    const sickDate = document.getElementById('sickDate');
    const sickDuty = document.getElementById('sickDutyTime');
    const frlDate = document.getElementById('frlDate');
    const frlDuty = document.getElementById('frlDutyTime');
    
    if (sickDate) sickDate.value = today;
    if (sickDuty) sickDuty.value = defaultDutyTime;
    if (frlDate) frlDate.value = today;
    if (frlDuty) frlDuty.value = defaultDutyTime;

    console.log('✅ Leave Management App initialized');
}

document.addEventListener('DOMContentLoaded', initApp);

// ========== TAB SWITCH FUNCTION ==========
window.switchTab = function(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
    const tabContent = document.getElementById(`${tab}Tab`);
    if (tabBtn) tabBtn.classList.add('active');
    if (tabContent) tabContent.classList.add('active');
};

document.addEventListener('DOMContentLoaded', applyLeaveDateMinimum);
