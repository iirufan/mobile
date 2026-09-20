
const DB = () => firebase.firestore();
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clean = v => String(v ?? "").trim();
const lower = v => clean(v).toLowerCase();

function getUsers(){ return Array.isArray(window.PORTAL_USERS) ? window.PORTAL_USERS : []; }
function session(){ try{return JSON.parse(localStorage.getItem("koveli_session")||"null")}catch{return null} }
function setSession(u){ localStorage.setItem("koveli_session",JSON.stringify({username:u.username,fullname:u.fullname,rcno:u.rcno,email:u.email||"",contact:u.contact||"",role:u.role||"staff"})); }
function logout(){ localStorage.removeItem("koveli_session"); location.href="index.html"; }
function requireLogin(admin=false){
  const s=session(); if(!s){location.href="index.html";return null}
  if(admin && s.role!=="admin"){location.href="dashboard.html";return null}
  return s;
}
function esc(v){return clean(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function msg(el,text,type="ok"){el.innerHTML=`<div class="notice ${type}">${esc(text)}</div>`}
function today(){return new Date().toISOString().slice(0,10)}
function stamp(){return firebase.firestore.FieldValue.serverTimestamp()}

async function login(username,password){
  const u=getUsers().find(x=>lower(x.username)===lower(username) && clean(x.password)===clean(password) && x.active!==false);
  if(!u) throw new Error("Invalid username/password, or the account has not yet been added to user.js by Admin.");
  setSession(u); return u;
}

async function register(data){
  const username=lower(data.username), rcno=lower(data.rcno);
  if(getUsers().some(x=>lower(x.username)===username)) throw new Error("Username already exists in user.js.");
  const dupe=await DB().collection("registrations").where("usernameLower","==",username).limit(1).get();
  if(!dupe.empty) throw new Error("A registration with this username already exists.");
  await DB().collection("registrations").add({
    username:clean(data.username), usernameLower:username, fullname:clean(data.fullname),
    rcno:clean(data.rcno), rcnoLower:rcno, email:clean(data.email), contact:clean(data.contact),
    password:clean(data.password), role:"staff", status:"pending", createdAt:stamp()
  });
}

async function requestPasswordChange(currentPassword,newPassword){
  const s=requireLogin(); if(!s)return;
  const u=getUsers().find(x=>lower(x.username)===lower(s.username));
  if(!u || clean(u.password)!==clean(currentPassword)) throw new Error("Current password is incorrect.");
  await DB().collection("passwordChanges").add({
    username:s.username, fullname:s.fullname, rcno:s.rcno, newPassword:clean(newPassword),
    status:"pending", createdAt:stamp()
  });
}

function nav(active=""){
 const s=session(); if(!s)return "";
 const admin=s.role==="admin";
 return `<div class="topbar"><div class="inner"><div class="brandwrap"><img src="koveli-logo.png?v=4" class="toplogo" alt="Koveli Lounge"><span>Koveli Staff</span></div><div class="userchip">${esc(s.fullname)} · ${esc(s.role)}</div>
 <div class="nav"><a class="${active==="dashboard"?"active":""}" href="dashboard.html">Dashboard</a>
 <a class="${active==="leave"?"active":""}" href="leave.html">Leave</a>
 <a class="${active==="duty"?"active":""}" href="dutychange.html">Duty Change</a>
 <a class="${active==="security"?"active":""}" href="security.html">Security</a> <a class="${active==="notifications"?"active":""}" href="notifications.html">Notifications <span id="navNotifBadge" class="notif-badge" style="display:none">0</span></a>
 ${admin?`<a class="${active==="admin"?"active":""}" href="admin.html">Admin</a>`:""}
 <button onclick="logout()">Logout</button></div></div></div>`;
}

async function api(path,payload){
 const r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
 let d={}; try{d=await r.json()}catch{}
 if(!r.ok || d.ok===false) throw new Error(d.error||`Request failed (${r.status})`);
 return d;
}

/* ================= PWA + PUSH NOTIFICATIONS ================= */
function pwaConfig(){return window.KOVELI_PWA_CONFIG||{}}
function notifKey(s=session()){return s?`${lower(s.username)}_${clean(s.rcno)}`:""}
async function registerPWA(){
  if(!("serviceWorker" in navigator)) return null;
  try{
    await navigator.serviceWorker.register("/sw.js");
    return await navigator.serviceWorker.register("/firebase-messaging-sw.js",{scope:"/firebase-cloud-messaging-push-scope"});
  }catch(e){console.warn("PWA service worker:",e);return null}
}
async function installKoveliPWA(){
  if(window.__koveliInstallPrompt){
    window.__koveliInstallPrompt.prompt();
    await window.__koveliInstallPrompt.userChoice;
    window.__koveliInstallPrompt=null;
  }else{
    alert("Use your browser's Install app / Add to Home Screen option.");
  }
}
async function enablePushNotifications(){
  const s=requireLogin(); if(!s)return;
  if(!("Notification" in window)) throw new Error("Notifications are not supported on this browser.");
  const permission=await Notification.requestPermission();
  if(permission!=="granted") throw new Error("Notification permission was not granted.");
  if(!firebase.messaging) throw new Error("Firebase Messaging SDK is not loaded.");
  const vapid=clean(pwaConfig().vapidKey);
  if(!vapid || vapid.includes("PASTE_YOUR")) throw new Error("Set the Firebase Web Push VAPID public key in script/pwa-config.js.");
  const reg=await navigator.serviceWorker.register("/firebase-messaging-sw.js",{scope:"/firebase-cloud-messaging-push-scope"});
  const token=await firebase.messaging().getToken({vapidKey:vapid,serviceWorkerRegistration:reg});
  if(!token) throw new Error("Firebase did not return a notification token.");
  const tokenId=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token)).then(b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join(""));
  await DB().collection("pushTokens").doc(tokenId).set({
    token,username:s.username,usernameLower:lower(s.username),fullname:s.fullname,rcno:s.rcno,
    role:s.role||"staff",enabled:true,userAgent:navigator.userAgent,updatedAt:stamp()
  },{merge:true});
  await DB().collection("notificationUsers").doc(notifKey(s)).set({
    username:s.username,usernameLower:lower(s.username),fullname:s.fullname,rcno:s.rcno,role:s.role||"staff",
    notificationsEnabled:true,updatedAt:stamp()
  },{merge:true});
  await refreshNotificationBadge();
  return token;
}
async function unreadNotificationCount(){
  const s=session(); if(!s)return 0;
  const keys=[notifKey(s),lower(s.username),clean(s.rcno)].filter(Boolean);
  const seen=new Map();
  for(const key of keys){
    const snap=await DB().collection("notifications").where("recipientKeys","array-contains",key).get();
    snap.forEach(d=>seen.set(d.id,{id:d.id,...d.data()}));
  }
  let n=0;
  seen.forEach(x=>{if(!(x.readBy||[]).includes(notifKey(s)))n++});
  return n;
}
async function refreshNotificationBadge(){
  try{
    const n=await unreadNotificationCount();
    const el=document.getElementById("navNotifBadge");
    if(el){el.textContent=n>99?"99+":String(n);el.style.display=n?"inline-grid":"none"}
    if("setAppBadge" in navigator){if(n)await navigator.setAppBadge(n);else if("clearAppBadge" in navigator)await navigator.clearAppBadge()}
    return n;
  }catch(e){console.warn("Badge refresh:",e);return 0}
}
async function markNotificationRead(id){
  const s=session();if(!s)return;
  await DB().collection("notifications").doc(id).update({readBy:firebase.firestore.FieldValue.arrayUnion(notifKey(s))});
  await refreshNotificationBadge();
}
async function markAllNotificationsRead(){
  const s=session();if(!s)return;
  const key=notifKey(s);
  const snap=await DB().collection("notifications").where("recipientKeys","array-contains",key).get();
  const batch=DB().batch();snap.forEach(d=>batch.update(d.ref,{readBy:firebase.firestore.FieldValue.arrayUnion(key)}));await batch.commit();await refreshNotificationBadge();
}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();window.__koveliInstallPrompt=e});
window.addEventListener("load",()=>{registerPWA();if(session())refreshNotificationBadge()});

/* ================= LIVE PWA UPDATE SYSTEM ================= */
let __koveliUpdateRegistration = null;
let __koveliRefreshing = false;

function showKoveliUpdateAvailable(registration){
  __koveliUpdateRegistration = registration;
  if(document.getElementById("koveliUpdateBar")) return;

  const bar = document.createElement("div");
  bar.id = "koveliUpdateBar";
  bar.className = "koveli-update-bar";
  bar.innerHTML = `
    <div class="koveli-update-copy">
      <strong>New Update Available</strong>
      <span>A newer version of Koveli Staff is ready.</span>
    </div>
    <button type="button" id="koveliUpdateNow">Update Now</button>
  `;
  document.body.appendChild(bar);

  document.getElementById("koveliUpdateNow").onclick = async () => {
    const btn = document.getElementById("koveliUpdateNow");
    btn.disabled = true;
    btn.textContent = "Updating…";
    const waiting = __koveliUpdateRegistration && __koveliUpdateRegistration.waiting;
    if(waiting){
      waiting.postMessage({type:"SKIP_WAITING"});
    }else{
      await forceFreshReload();
    }
  };
}

async function forceFreshReload(){
  try{
    if("caches" in window){
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  }catch(e){}
  const u = new URL(location.href);
  u.searchParams.set("_update", Date.now().toString());
  location.replace(u.toString());
}

async function checkForKoveliUpdate(){
  if(!("serviceWorker" in navigator)) return;
  try{
    const regs = await navigator.serviceWorker.getRegistrations();
    const appReg = regs.find(r => r.active?.scriptURL?.endsWith("/sw.js") ||
                                  r.waiting?.scriptURL?.endsWith("/sw.js") ||
                                  r.installing?.scriptURL?.endsWith("/sw.js"));
    if(!appReg) return;

    await appReg.update();

    if(appReg.waiting){
      showKoveliUpdateAvailable(appReg);
      return;
    }

    appReg.addEventListener("updatefound", () => {
      const worker = appReg.installing;
      if(!worker) return;
      worker.addEventListener("statechange", () => {
        if(worker.state === "installed" && navigator.serviceWorker.controller){
          showKoveliUpdateAvailable(appReg);
        }
      });
    });
  }catch(e){
    console.warn("Update check failed:", e);
  }
}

if("serviceWorker" in navigator){
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if(__koveliRefreshing) return;
    __koveliRefreshing = true;
    location.reload();
  });

  window.addEventListener("load", () => {
    setTimeout(checkForKoveliUpdate, 1500);
    setInterval(checkForKoveliUpdate, 5 * 60 * 1000);
  });

  document.addEventListener("visibilitychange", () => {
    if(document.visibilityState === "visible") checkForKoveliUpdate();
  });

  window.addEventListener("focus", checkForKoveliUpdate);
}
