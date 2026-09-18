<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=yes, maximum-scale=1.0">
    <title>Leave Management</title>
    
    <!-- Firebase SDK -->
    <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-storage-compat.js"></script>
    
    <script src="script/firebase-config.js"></script>
    <link rel="stylesheet" href="css/leave-styles.css">
    <link rel="stylesheet" href="css/portal-theme.css?v=23">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
<style>
/* Leave page uses the shared Staff Portal navigation only. */
.leave-page-title{
 margin:14px 14px 4px;padding:14px 16px;border:1px solid #d9eaf4;border-radius:16px;
 background:linear-gradient(135deg,#f1fbff,#fff);box-shadow:0 8px 22px rgba(36,105,146,.06)
}
.leave-page-title h1{margin:0;color:#1d5879;font-size:1.12rem}
.leave-page-title p{margin:4px 0 0;color:#78909f;font-size:.73rem}
</style>

<style id="leaveSharedNavbarFix">
/* Leave page uses the project-wide portal-navbar.js only. */
.leave-page .app-header{display:none!important}
.leave-page .app-container{min-height:100vh}
.leave-page .leave-page-title{margin-top:14px}
@media(max-width:768px){
    .leave-page .leave-page-title{margin:10px 10px 4px}
}
</style>


<style id="leaveModernColorfulV3">
:root{
  --lm-navy:#123b52;
  --lm-blue:#2f80ed;
  --lm-cyan:#55c2da;
  --lm-teal:#35b7a5;
  --lm-gold:#f2b84b;
  --lm-purple:#8b78e6;
  --lm-bg:#f6f9fc;
  --lm-card:#ffffff;
  --lm-text:#183747;
  --lm-muted:#738895;
  --lm-line:#e4ebf0;
  --lm-shadow:0 12px 32px rgba(25,72,96,.08);
}

/* ===== PAGE ===== */
body.leave-page{
  margin:0;
  color:var(--lm-text);
  background:
    radial-gradient(circle at 4% 0%,rgba(85,194,218,.16),transparent 24%),
    radial-gradient(circle at 96% 2%,rgba(242,184,75,.13),transparent 22%),
    linear-gradient(180deg,#f8fbfd 0%,#f4f7fa 100%);
}

.leave-page .app-container{
  width:min(1180px,calc(100% - 28px));
  margin:0 auto;
  padding:18px 0 34px;
  box-sizing:border-box;
  min-height:100vh;
}

.leave-page .scroll-content{
  padding:0!important;
}

/* ===== PAGE TITLE ===== */
.leave-page .leave-page-title{
  position:relative;
  overflow:hidden;
  margin:14px 0 16px!important;
  padding:22px 24px!important;
  border:0!important;
  border-radius:22px!important;
  background:linear-gradient(135deg,#123b52 0%,#176377 62%,#258aa0 100%)!important;
  box-shadow:0 16px 38px rgba(18,59,82,.14)!important;
}

.leave-page .leave-page-title:after{
  content:"";
  position:absolute;
  width:170px;
  height:170px;
  right:-45px;
  top:-75px;
  border-radius:50%;
  border:28px solid rgba(255,255,255,.09);
}

.leave-page .leave-page-title h1{
  position:relative;
  z-index:1;
  margin:0!important;
  color:#fff!important;
  font-size:1.45rem!important;
  font-weight:850!important;
  letter-spacing:-.02em;
}

.leave-page .leave-page-title p{
  position:relative;
  z-index:1;
  margin:6px 0 0!important;
  color:#dcecf1!important;
  font-size:.82rem!important;
}

/* ===== SESSION ===== */
.leave-page .session-status{
  margin:0 0 14px!important;
  padding:11px 14px!important;
  border:1px solid #d8e8ee!important;
  border-radius:14px!important;
  background:rgba(255,255,255,.82)!important;
  box-shadow:0 6px 18px rgba(18,59,82,.04)!important;
}

.leave-page .session-role{
  background:#e9f7f4!important;
  color:#23806d!important;
  border-radius:999px!important;
  padding:4px 8px!important;
}

/* ===== BALANCE ===== */
.leave-page .balance-section{
  margin:0 0 16px!important;
  padding:18px!important;
  border:1px solid var(--lm-line)!important;
  border-radius:20px!important;
  background:var(--lm-card)!important;
  box-shadow:var(--lm-shadow)!important;
}

.leave-page .section-title,
.leave-page .card-title,
.leave-page .sub-title{
  color:var(--lm-navy)!important;
  font-weight:850!important;
  letter-spacing:-.01em;
}

.leave-page .section-title{
  margin-bottom:12px!important;
  font-size:1rem!important;
}

.leave-page .balance-cards{
  display:grid!important;
  grid-template-columns:repeat(2,minmax(0,1fr))!important;
  gap:12px!important;
}

.leave-page .balance-item{
  position:relative;
  overflow:hidden;
  min-height:96px!important;
  padding:16px!important;
  border:1px solid #dfe9ef!important;
  border-radius:17px!important;
  background:linear-gradient(145deg,#f4fbff,#ffffff)!important;
  box-shadow:none!important;
}

.leave-page .balance-item.highlight{
  background:linear-gradient(145deg,#fff9ec,#ffffff)!important;
  border-color:#f1dfae!important;
}

.leave-page .balance-item:after{
  content:"";
  position:absolute;
  width:72px;
  height:72px;
  right:-22px;
  bottom:-26px;
  border-radius:50%;
  background:rgba(47,128,237,.08);
}

.leave-page .balance-item.highlight:after{
  background:rgba(242,184,75,.13);
}

.leave-page .balance-label{
  color:#6b8391!important;
  font-size:.76rem!important;
  font-weight:750!important;
}

.leave-page .balance-value{
  color:var(--lm-navy)!important;
  font-size:1.8rem!important;
  font-weight:900!important;
  margin-top:7px!important;
}

.leave-page .balance-footer{
  margin-top:12px!important;
  padding-top:11px!important;
  border-top:1px solid #edf1f4!important;
  color:#7a8f9b!important;
  font-size:.76rem!important;
}

/* ===== TABS ===== */
.leave-page .tab-nav{
  position:relative;
  display:flex!important;
  gap:8px!important;
  margin:0 0 14px!important;
  padding:5px!important;
  border:1px solid var(--lm-line)!important;
  border-radius:15px!important;
  background:#fff!important;
  box-shadow:0 6px 18px rgba(18,59,82,.04)!important;
}

.leave-page .tab-btn{
  flex:1!important;
  min-height:42px!important;
  border:0!important;
  border-radius:11px!important;
  background:transparent!important;
  color:#6c8290!important;
  font-weight:800!important;
  font-size:.8rem!important;
  transition:.18s ease!important;
}

.leave-page .tab-btn.active{
  background:linear-gradient(135deg,#2f80ed,#55c2da)!important;
  color:#fff!important;
  box-shadow:0 8px 18px rgba(47,128,237,.20)!important;
}

/* ===== CARDS ===== */
.leave-page .form-card,
.leave-page .admin-section{
  margin:0 0 16px!important;
  padding:18px!important;
  border:1px solid var(--lm-line)!important;
  border-radius:20px!important;
  background:#fff!important;
  box-shadow:var(--lm-shadow)!important;
}

.leave-page .card-title{
  display:flex;
  align-items:center;
  gap:7px;
  margin-bottom:14px!important;
  font-size:1rem!important;
}

.leave-page .field-row{
  margin-bottom:13px!important;
}

.leave-page .field-row label{
  display:block;
  margin-bottom:6px!important;
  color:#425f70!important;
  font-size:.75rem!important;
  font-weight:800!important;
}

.leave-page input,
.leave-page select,
.leave-page textarea{
  width:100%;
  box-sizing:border-box;
  border:1px solid #dce6ec!important;
  border-radius:12px!important;
  background:#fbfdfe!important;
  color:#213f50!important;
  font-family:inherit!important;
  font-size:.82rem!important;
  outline:none!important;
  transition:.16s ease!important;
}

.leave-page input,
.leave-page select{
  min-height:44px!important;
  padding:0 12px!important;
}

.leave-page textarea{
  padding:11px 12px!important;
  resize:vertical!important;
}

.leave-page input:focus,
.leave-page select:focus,
.leave-page textarea:focus{
  border-color:#7ac9de!important;
  background:#fff!important;
  box-shadow:0 0 0 4px rgba(85,194,218,.12)!important;
}

/* ===== FILE UPLOAD ===== */
.leave-page .file-upload-btn{
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  min-height:38px!important;
  padding:0 12px!important;
  border:1px solid #d8e6ec!important;
  border-radius:10px!important;
  background:#f7fbfd!important;
  color:#356276!important;
  font-size:.75rem!important;
  font-weight:800!important;
  cursor:pointer!important;
}

/* ===== REPORTED TIME ===== */
.leave-page .reported-time{
  margin:5px 0 12px!important;
  padding:10px 12px!important;
  border:1px dashed #dce6eb!important;
  border-radius:11px!important;
  background:#f9fbfc!important;
  color:#6e8490!important;
  font-size:.72rem!important;
}

/* ===== BUTTONS ===== */
.leave-page .btn-primary{
  width:100%;
  min-height:46px!important;
  border:0!important;
  border-radius:13px!important;
  background:linear-gradient(135deg,#2f80ed,#35b7a5)!important;
  color:#fff!important;
  font-weight:850!important;
  font-size:.82rem!important;
  box-shadow:0 9px 20px rgba(47,128,237,.17)!important;
  cursor:pointer!important;
  transition:.18s ease!important;
}

.leave-page .btn-primary:hover{
  transform:translateY(-1px)!important;
  box-shadow:0 12px 24px rgba(47,128,237,.22)!important;
}

/* ===== EMPTY STATES ===== */
.leave-page .empty-state{
  padding:22px 14px!important;
  border:1px dashed #dce5ea!important;
  border-radius:13px!important;
  background:#fbfcfd!important;
  color:#8495a0!important;
}

/* ===== ADMIN ===== */
.leave-page .admin-section{
  border-top:4px solid #8b78e6!important;
}

.leave-page .admin-divider{
  margin:18px 0!important;
  border:0!important;
  border-top:1px solid #edf1f3!important;
}

.leave-page .sub-title{
  margin-bottom:10px!important;
  color:#5b4ab2!important;
}

/* ===== FOOTER ===== */
.leave-page .app-footer{
  margin-top:18px!important;
  padding:12px!important;
  border-radius:13px!important;
  background:linear-gradient(90deg,#eef8fb,#fff9ed)!important;
  color:#748893!important;
  font-size:.72rem!important;
  text-align:center!important;
}

/* =========================================================
   IMPORTANT: MODALS STAY HIDDEN UNTIL YOUR EXISTING JS OPENS THEM
   ========================================================= */
.leave-page .modal-overlay{
  display:none!important;
  position:fixed!important;
  inset:0!important;
  z-index:20000!important;
  align-items:center!important;
  justify-content:center!important;
  padding:16px!important;
  background:rgba(13,42,56,.45)!important;
  backdrop-filter:blur(5px)!important;
  -webkit-backdrop-filter:blur(5px)!important;
}

/* Support common existing open-state classes */
.leave-page .modal-overlay.show,
.leave-page .modal-overlay.active,
.leave-page .modal-overlay.open{
  display:flex!important;
}

.leave-page .modal-container{
  width:min(430px,100%)!important;
  max-height:90vh!important;
  overflow:auto!important;
  border:1px solid rgba(255,255,255,.75)!important;
  border-radius:20px!important;
  background:#fff!important;
  box-shadow:0 24px 70px rgba(9,40,54,.24)!important;
}

.leave-page .modal-wide{
  width:min(620px,100%)!important;
}

.leave-page .modal-header{
  background:linear-gradient(135deg,#123b52,#247789)!important;
  color:#fff!important;
}

.leave-page .modal-close{
  color:#fff!important;
}

/* Password/pattern panes must not appear in normal page flow */
.leave-page .tab-pane{
  display:none!important;
}

.leave-page .tab-pane.active-pane{
  display:block!important;
}

/* Only apply pane visibility inside a visible modal */
.leave-page .modal-overlay:not(.show):not(.active):not(.open) .tab-pane{
  display:none!important;
}

/* ===== LOADING POPUP / TOAST stay controlled by original CSS/JS ===== */
.leave-page .message-toast{
  border-radius:13px!important;
  box-shadow:0 14px 34px rgba(12,50,67,.18)!important;
}

/* ===== DESKTOP FORM LAYOUT ===== */
@media(min-width:900px){
  .leave-page .tab-content .form-card form{
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:0 14px;
  }

  .leave-page .tab-content .form-card form > .field-row:nth-of-type(3),
  .leave-page .tab-content .form-card form > .field-row:nth-of-type(4),
  .leave-page .tab-content .form-card form > .reported-time,
  .leave-page .tab-content .form-card form > .form-feedback,
  .leave-page .tab-content .form-card form > .btn-primary{
    grid-column:1 / -1;
  }

  .leave-page .admin-section .balance-edit-row{
    display:grid!important;
    grid-template-columns:repeat(3,minmax(0,1fr))!important;
    gap:10px!important;
  }
}

/* ===== MOBILE ===== */
@media(max-width:768px){
  .leave-page .app-container{
    width:calc(100% - 18px)!important;
    padding:8px 0 22px!important;
  }

  .leave-page .leave-page-title{
    margin:8px 0 12px!important;
    padding:17px!important;
    border-radius:18px!important;
  }

  .leave-page .leave-page-title h1{
    font-size:1.2rem!important;
  }

  .leave-page .balance-section,
  .leave-page .form-card,
  .leave-page .admin-section{
    padding:14px!important;
    border-radius:17px!important;
  }

  .leave-page .balance-cards{
    grid-template-columns:1fr 1fr!important;
    gap:8px!important;
  }

  .leave-page .balance-item{
    min-height:84px!important;
    padding:13px!important;
  }

  .leave-page .balance-value{
    font-size:1.45rem!important;
  }

  .leave-page .tab-nav{
    position:sticky;
    top:64px;
    z-index:20;
  }
}

@media(max-width:430px){
  .leave-page .balance-cards{
    grid-template-columns:1fr!important;
  }
}
</style>


<style id="leaveHeaderUserV1">
.leave-page .session-status{display:none!important}
.leave-page .portal-navbar .portal-user,
.leave-page .portal-navbar .portal-user-area,
.leave-page .portal-navbar .portal-user-section,
.leave-page .portal-navbar .portal-user-info,
.leave-page .portal-navbar .portal-role-chip,
.leave-page .portal-navbar .portal-logout{display:none!important}
.leave-page .leave-header-main{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:20px}
.leave-page .leave-header-user{display:flex;align-items:center;justify-content:flex-end;gap:8px;min-width:0}
.leave-page .leave-header-role{padding:7px 10px;border-radius:999px;background:rgba(242,184,75,.18);border:1px solid rgba(242,184,75,.3);color:#ffe19a;font-size:10px;font-weight:900;text-transform:uppercase;white-space:nowrap}
.leave-page .leave-header-profile{display:flex;align-items:center;gap:8px;min-width:0;padding:5px 10px 5px 5px;border:1px solid rgba(255,255,255,.16);border-radius:13px;background:rgba(255,255,255,.09)}
.leave-page .leave-header-avatar{width:32px;height:32px;flex:0 0 32px;display:grid;place-items:center;border-radius:10px;background:linear-gradient(135deg,#f2b84b,#ffe19a);color:#123b52;font-weight:900;font-size:12px}
.leave-page .leave-header-profile-text{display:flex;flex-direction:column;gap:3px;min-width:0}
.leave-page .leave-header-profile-text small{color:#c9e2e9;font-size:9px}
.leave-page .leave-header-profile-text strong{color:#fff;font-size:12px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.leave-page .leave-header-logout{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:42px;padding:0 12px;border:1px solid rgba(255,255,255,.2);border-radius:12px;background:rgba(255,255,255,.1);color:#fff;font:800 11px inherit;cursor:pointer;white-space:nowrap}
.leave-page .leave-header-logout:hover{background:rgba(255,255,255,.2)}
@media(max-width:760px){
 .leave-page .leave-header-main{flex-direction:column;align-items:stretch;gap:15px}
 .leave-page .leave-header-user{justify-content:flex-start;padding-top:12px;border-top:1px solid rgba(255,255,255,.14)}
 .leave-page .leave-header-profile{flex:1}
 .leave-page .leave-header-profile-text strong{max-width:180px}
}
@media(max-width:390px){
 .leave-page .leave-header-logout{width:42px;padding:0;flex:0 0 42px}
 .leave-page .leave-header-logout span{display:none}
 .leave-page .leave-header-profile-text strong{max-width:100px}
}
</style>
</head>
<body class="leave-page">

    <div class="app-container">
        <div class="leave-page-title">
            <div class="leave-header-main">
                <div>
                    <h1>🌴 Leave Management</h1>
                    <p>Apply, track status and manage pending leave requests.</p>
                </div>
                <div class="leave-header-user" id="leaveHeaderUser">
                    <span id="leaveHeaderRole" class="leave-header-role">Staff</span>
                    <div class="leave-header-profile">
                        <span id="leaveHeaderAvatar" class="leave-header-avatar">S</span>
                        <span class="leave-header-profile-text"><small>Signed in as</small><strong id="leaveHeaderName">Staff</strong></span>
                    </div>
                    <button type="button" id="leaveHeaderLogout" class="leave-header-logout" title="Logout"><i class="fa-solid fa-arrow-right-from-bracket"></i><span>Logout</span></button>
                </div>
            </div>
        </div>
<!-- SCROLLABLE CONTENT -->
        <div class="scroll-content">

            <!-- SESSION STATUS -->
            <div class="session-status" id="sessionStatus" style="display: none;">
                <div class="session-user">
                    👤 Logged in as: <strong id="sessionUserName">—</strong>
                    <span class="session-role" id="sessionUserRole">—</span>
                </div>
            </div>

            <!-- LEAVE BALANCE -->
            <section class="balance-section">
                <div class="section-title">📊 Leave Balance</div>
                <div class="balance-cards">
                    <div class="balance-item">
                        <span class="balance-label">🤒 Sick Leave</span>
                        <span class="balance-value" id="sickBalance">-</span>
                    </div>
                    <div class="balance-item highlight">
                        <span class="balance-label">👨‍👩‍👧‍👦 FRL</span>
                        <span class="balance-value" id="frlBalance">-</span>
                    </div>
                </div>
                <div class="balance-footer">
                    FRL Renewal: <span id="frlRenewalDate">Not set</span>
                </div>
            </section>

            <!-- TAB NAVIGATION -->
            <nav class="tab-nav" id="tabNav">
                <button class="tab-btn active" data-tab="sick" onclick="switchTab('sick')">🤒 Sick</button>
                <button class="tab-btn" data-tab="frl" onclick="switchTab('frl')">👨‍👩‍👧‍👦 FRL</button>
            </nav>

            <!-- SICK LEAVE TAB -->
            <div class="tab-content active" id="sickTab">
                <div class="form-card">
                    <div class="card-title">🤒 Apply for Sick Leave</div>
                    <form id="sickLeaveForm">
                        <div class="field-row">
                            <label>Date <span class="required">*</span></label>
                            <input type="date" id="sickDate" required>
                        </div>
                        <div class="field-row">
                            <label>Duty Time</label>
                            <select id="sickDutyTime">
                                <option value="Morning 0730">🌅 Morning 0730</option>
                                <option value="Morning 0830">🌅 Morning 0830</option>
                                <option value="Afternoon 1530">🌇 Afternoon 1530</option>
                                <option value="Afternoon 1630">🌇 Afternoon 1630</option>
                                <option value="Night 0030">🌙 Night 0030</option>
                            </select>
                        </div>
                        <div class="field-row">
                            <label>Reason <span class="required">*</span></label>
                            <select id="sickReason" required>
                                <option value="">Select Reason</option>
                                <option value="Abdominal pain">Abdominal pain</option>
                                <option value="Accident Injuries">Accident Injuries</option>
                                <option value="Allergic">Allergic</option>
                                <option value="Anxiety">Anxiety</option>
                                <option value="Arthritis">Arthritis</option>
                                <option value="Asthma">Asthma</option>
                                <option value="Back Pain">Back Pain</option>
                                <option value="Bacterial Conjunctivitis">Bacterial Conjunctivitis</option>
                                <option value="Common Cold / Flu and Fever">Common Cold / Flu and Fever</option>
                                <option value="Dental issue">Dental issue</option>
                                <option value="Depression">Depression</option>
                                <option value="Eye Infection">Eye Infection</option>
                                <option value="Fatigue">Fatigue</option>
                                <option value="Gastric">Gastric</option>
                                <option value="Headache">Headache</option>
                                <option value="Hernia">Hernia</option>
                                <option value="Infection">Infection</option>
                                <option value="Joint Pain">Joint Pain</option>
                                <option value="Medical Appointments">Medical Appointments</option>
                                <option value="Menstrual Pain">Menstrual Pain</option>
                                <option value="Migraines">Migraines</option>
                                <option value="Minor surgery">Minor surgery</option>
                                <option value="Muscle Pain">Muscle Pain</option>
                                <option value="Pharyngitis">Pharyngitis</option>
                                <option value="Physical injuries">Physical injuries</option>
                                <option value="Senile Cataract">Senile Cataract</option>
                                <option value="Spasrnodic Torticollis">Spasrnodic Torticollis</option>
                                <option value="Stomach upset">Stomach upset</option>
                                <option value="Tonsillitis">Tonsillitis</option>
                                <option value="Viral Conjunctivitis">Viral Conjunctivitis</option>
                            </select>
                        </div>
                        <div class="field-row">
                            <label>Additional Details</label>
                            <textarea id="sickDetails" rows="2" placeholder="Any additional details..."></textarea>
                        </div>
                        <div class="field-row">
                            <label>Attach Document (Optional)</label>
                            <div class="file-upload-wrapper">
                                <input type="file" id="sickAttachment" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                                <label for="sickAttachment" class="file-upload-btn">📎 Choose File</label>
                                <span id="sickFileName" class="file-name">No file chosen</span>
                            </div>
                            <small style="color:#888;font-size:0.7rem;">Upload PDF, JPG, PNG, DOC, DOCX (max 2.5MB)</small>
                            <div id="sickAttachmentInfo" class="attachment-info"></div>
                            <div id="uploadProgressContainer" style="display: none; margin-top: 8px;">
                                <div style="background: #f0f0f0; border-radius: 4px; height: 6px; overflow: hidden;">
                                    <div id="uploadProgressBar" style="background: #4CAF50; height: 100%; width: 0%; transition: width 0.3s;"></div>
                                </div>
                                <div style="font-size: 0.8rem; color: #666; margin-top: 4px;">
                                    <span id="uploadProgressText">0%</span>
                                </div>
                            </div>
                        </div>
                        <div class="reported-time">
                            <span class="label">⏰ Reported (GMT+5):</span>
                            <span class="value" id="sickReportedDateTime">-</span>
                        </div>
                        <div id="sickFeedback" class="form-feedback"></div>
                        <button type="submit" class="btn-primary" id="sickSubmitBtn">🤒 Submit Sick Leave</button>
                    </form>
                </div>
            </div>

            <!-- FRL TAB -->
            <div class="tab-content" id="frlTab">
                <div class="form-card">
                    <div class="card-title">👨‍👩‍👧‍👦 Apply for FRL</div>
                    <form id="frlLeaveForm">
                        <div class="field-row">
                            <label>Date <span class="required">*</span></label>
                            <input type="date" id="frlDate" required>
                        </div>
                        <div class="field-row">
                            <label>Duty Time</label>
                            <select id="frlDutyTime">
                                <option value="Morning 0730">🌅 Morning 0730</option>
                                <option value="Morning 0830">🌅 Morning 0830</option>
                                <option value="Afternoon 1530">🌇 Afternoon 1530</option>
                                <option value="Afternoon 1630">🌇 Afternoon 1630</option>
                                <option value="Night 0030">🌙 Night 0030</option>
                            </select>
                        </div>
                        <div class="field-row">
                            <label>Reason <span class="required">*</span></label>
                            <select id="frlReason" required>
                                <option value="">Select Reason</option>
                                <option value="Leave according to the leave plan">Leave according to the leave plan</option>
                                <option value="Moving to a new House">Moving to a new House</option>
                                <option value="To attend a family event">To attend a family event</option>
                                <option value="To take family to and from Island">To take family to and from Island</option>
                                <option value="Urgent work at home">Urgent work at home</option>
                                <option value="Baby sitting">Baby sitting</option>
                                <option value="Parent-Teacher meeting">Parent-Teacher meeting</option>
                                <option value="House Renovation">House Renovation</option>
                                <option value="Family member sick/admitted">Family member sick/admitted</option>
                                <option value="Court appearance">Court appearance</option>
                                <option value="To attend a funeral">To attend a funeral</option>
                            </select>
                        </div>
                        <div class="field-row">
                            <label>Additional Details</label>
                            <textarea id="frlDetails" rows="2" placeholder="Any additional details..."></textarea>
                        </div>
                        <div class="reported-time">
                            <span class="label">⏰ Reported (GMT+5):</span>
                            <span class="value" id="frlReportedDateTime">-</span>
                        </div>
                        <div id="frlFeedback" class="form-feedback"></div>
                        <button type="submit" class="btn-primary" id="frlSubmitBtn">👨‍👩‍👧‍👦 Submit FRL</button>
                    </form>
                </div>
            </div>

            <!-- MY REQUESTS -->
            <section class="form-card">
                <div class="card-title">📋 My Leave Requests</div>
                <div id="myLeaveRequests">
                    <div class="empty-state">
                        <div class="icon">📭</div>
                        Login to see your requests
                    </div>
                </div>
            </section>

            <!-- ADMIN SECTION -->
            <section class="admin-section" id="adminSection" style="display: none;">
                <div class="section-title">🛡️ Admin Panel</div>
                
                <div class="sub-title">📊 Manage Staff Balances</div>
                <div class="field-row">
                    <label>Select Staff</label>
                    <select id="adminStaffSelect" class="admin-select"></select>
                </div>
                <div class="balance-edit-row">
                    <div class="field-row">
                        <label>Sick Leave</label>
                        <input type="number" id="adminSickBalance" class="admin-input" min="0">
                    </div>
                    <div class="field-row">
                        <label>FRL Balance</label>
                        <input type="number" id="adminFrlBalance" class="admin-input" min="0">
                    </div>
                    <div class="field-row">
                        <label>FRL Renewal</label>
                        <input type="date" id="adminFrlRenewal" class="admin-input">
                    </div>
                </div>
                <button class="btn-primary" id="updateBalanceBtn">💾 Update Balance</button>
                <div id="adminFeedback" class="form-feedback"></div>

                <hr class="admin-divider">

                <div class="sub-title">📋 Pending Requests</div>
                <div id="pendingLeaveRequests">
                    <div class="empty-state">No pending requests</div>
                </div>

                <hr class="admin-divider">

                <div class="sub-title">🗂️ Submitted / Cancelled Leave History</div>
                <div id="adminLeaveHistory">
                    <div class="empty-state">Loading...</div>
                </div>

                <hr class="admin-divider">

                <div class="sub-title">🚨 FRL Usage Report</div>
                <div id="frlReport">
                    <div class="empty-state">Loading...</div>
                </div>
            </section>

            <!-- FOOTER -->
            <div class="app-footer">
                🌴 Leave requests require admin approval • Status is shown in the Staff Portal
            </div>
        </div>
    </div>

    <!-- PASSWORD MODAL -->
    <div id="passwordModal" class="modal-overlay">
        <div class="modal-container">
            <div class="modal-header">
                <h3 id="modalStaffName">🔐 Verify Identity</h3>
                <button class="modal-close" id="modalCloseBtn">&times;</button>
            </div>
            <div class="modal-tabs">
                <button class="modal-tab-btn active-tab" data-modal-tab="pattern">🎨 Pattern</button>
                <button class="modal-tab-btn" data-modal-tab="numeric">🔢 PIN</button>
            </div>
            <div id="patternTab" class="tab-pane active-pane">
                <div class="pattern-wrapper">
                    <div class="pattern-grid" id="patternGrid"></div>
                    <canvas id="patternCanvas" width="260" height="260"></canvas>
                </div>
                <div class="pattern-status" id="patternStatus">✏️ Draw pattern</div>
                <div class="pattern-actions">
                    <button id="resetPatternBtn" class="action-btn">⟳ Reset</button>
                </div>
            </div>
            <div id="numericTab" class="tab-pane">
                <div class="numeric-display" id="numericInput">●●●●</div>
                <div class="keypad-grid" id="keypad"></div>
                <div style="display: flex; gap: 8px; justify-content: center; margin-top: 8px;">
                    <button id="clearNumericBtn" class="action-btn">Clear</button>
                    <button id="deleteNumericBtn" class="action-btn">⌫</button>
                </div>
            </div>
        </div>
    </div>

    <!-- CHANGE PASSWORD MODAL -->
    <div id="changePasswordModal" class="modal-overlay">
        <div class="modal-container">
            <div class="modal-header">
                <h3>🔐 Change Login Code</h3>
                <button class="modal-close" id="closeChangeModalBtn">&times;</button>
            </div>
            <div class="change-pass-tabs">
                <button class="change-method-btn active-method" data-change-method="pattern">🎨 Pattern</button>
                <button class="change-method-btn" data-change-method="pin">🔢 PIN</button>
            </div>
            <div id="changePatternPane" class="tab-pane active-pane">
                <div class="pattern-wrapper">
                    <div class="pattern-grid" id="changePatternGrid"></div>
                    <canvas id="changePatternCanvas" width="260" height="260"></canvas>
                </div>
                <div class="pattern-status" id="changePatternStatus">📌 Draw new pattern</div>
                <div class="pattern-actions">
                    <button id="resetChangePatternBtn" class="action-btn">⟳ Reset</button>
                </div>
            </div>
            <div id="changePinPane" class="tab-pane">
                <div class="numeric-display" id="changePinDisplay">●●●●●●</div>
                <div class="keypad-grid" id="changePinKeypad"></div>
                <div style="display: flex; gap: 8px; justify-content: center; margin-top: 8px;">
                    <button id="clearChangePinBtn" class="action-btn">Clear</button>
                    <button id="deleteChangePinBtn" class="action-btn">⌫</button>
                </div>
            </div>
            <div class="confirm-buttons">
                <button id="cancelChangeBtn" class="action-btn">Cancel</button>
                <button id="saveNewCodeBtn" class="action-btn" style="background:#e4bc78;">💾 Save</button>
            </div>
            <div id="changeFeedback" class="feedback-msg"></div>
        </div>
    </div>

    <!-- ATTACHMENT UPLOAD MODAL -->
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
                            <span id="attachmentFileNameFallback" class="file-name" style="display: none;">No file chosen</span>
                        </div>
                        <small style="color:#888;font-size:0.7rem;">Maximum file size: 2.5MB</small>
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

    <!-- LOADING POPUP -->
    <div id="loadingPopup" class="loading-popup">
        <div class="loading-content">
            <div id="loadingSpinner" class="spinner"></div>
            <div id="loadingIcon" style="display: none;"></div>
            <div class="loading-title" id="loadingTitle">Processing...</div>
            <div class="loading-subtitle" id="loadingSubtitle">Please wait</div>
        </div>
    </div>

    <!-- TOAST -->
    <div id="messageToast" class="message-toast"></div>

    <!-- SCRIPT -->
    <script type="importmap">
        {
            "imports": {
                "./staff.js": "./staff.js"
            }
        }
    </script>
    <script src="script/email-config.js?v=34"></script>
    <script src="script/email-helper.js?v=34"></script>
    <script src="script/user.js?v=1"></script>
    <script type="module" src="script/leave-app.js?v=36"></script>
    <script src="script/portal-navbar.js?v=29"></script>
    <script src="script/notification-service.js?v=29"></script>
    <script src="script/inbox.js?v=29"></script>

<script id="leaveHeaderUserScript">
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 function session(){
  try{
   const raw =
    sessionStorage.getItem('koveliUser') ||
    localStorage.getItem('koveliUser') ||
    sessionStorage.getItem('koveliActiveSession') ||
    localStorage.getItem('koveliActiveSession') ||
    localStorage.getItem('staffPortalSession');

   return raw ? JSON.parse(raw) : null;
  }catch(e){
   console.warn('Leave header session error:',e);
   return null;
  }
 }
 function render(){
  const s=session();
  const box=$('leaveHeaderUser');
  if(!box)return;
  box.style.display=s&&(s.id||s.username||s.name)?'flex':'none';
  if(!s||!(s.id||s.username||s.name))return;
  const name=String(s.name||'Staff');
  $('leaveHeaderName').textContent=name;
  $('leaveHeaderRole').textContent=s.role||'Staff';
  $('leaveHeaderAvatar').textContent=name.trim().charAt(0).toUpperCase()||'S';
 }
 function init(){
  render();
  $('leaveHeaderLogout')?.addEventListener('click',function(){
   sessionStorage.removeItem('koveliUser');
   localStorage.removeItem('koveliUser');
   localStorage.removeItem('staffPortalSession');
   localStorage.removeItem('koveliRememberLogin');
   localStorage.removeItem('koveliActiveSession');
   sessionStorage.removeItem('koveliActiveSession');
   location.href='login.html';
  });
  window.addEventListener('storage',render);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
 else init();
})();
</script>
</body>
</html>
