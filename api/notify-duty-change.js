const admin = require("firebase-admin");

function clean(v){ return String(v ?? "").trim(); }
function lower(v){ return clean(v).toLowerCase(); }
function unique(v){ return [...new Set((Array.isArray(v)?v:[v]).map(clean).filter(Boolean))]; }

function readServiceAccount(){
  if(process.env.FIREBASE_SERVICE_ACCOUNT_JSON){
    const a=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if(a.private_key) a.private_key=String(a.private_key).replace(/\\n/g,"\n");
    return a;
  }
  const projectId=clean(process.env.FIREBASE_PROJECT_ID);
  const clientEmail=clean(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey=String(process.env.FIREBASE_PRIVATE_KEY||"").replace(/\\n/g,"\n");
  if(!projectId||!clientEmail||!privateKey) throw new Error("Firebase Admin credentials are incomplete.");
  return {project_id:projectId,client_email:clientEmail,private_key:privateKey};
}
function getApp(){
  if(admin.apps.length) return admin.app();
  return admin.initializeApp({credential:admin.credential.cert(readServiceAccount())});
}
function recipientKeys(d){
  const u=lower(d.withUsername), r=lower(d.withRCNo), f=lower(d.withFullname);
  return new Set(unique([u,r,f,u&&r?`${u}_${r}`:""]));
}

module.exports=async(req,res)=>{
  if(req.method!=="POST") return res.status(405).json({ok:false,error:"Method not allowed"});
  try{
    const requestId=clean(req.body?.requestId);
    if(!requestId) return res.status(400).json({ok:false,error:"Request ID is required."});

    const app=getApp(), db=admin.firestore(app), messaging=admin.messaging(app);
    const snap=await db.collection("dutyChanges").doc(requestId).get();
    if(!snap.exists) return res.status(404).json({ok:false,error:"Duty change request not found."});
    const d=snap.data()||{};
    if(lower(d.status)!=="pending") return res.status(409).json({ok:false,error:"Duty change is no longer pending."});

    const wanted=recipientKeys(d);
    const tokenSnap=await db.collection("pushTokens").get();
    const tokens=new Set();
    const matches=[];

    tokenSnap.forEach(doc=>{
      const x=doc.data()||{};
      if(x.enabled!==true) return;
      const candidates=unique([
        lower(x.username),lower(x.usernameLower),lower(x.rcno),lower(x.fullname),
        lower(x.username)&&lower(x.rcno)?`${lower(x.username)}_${lower(x.rcno)}`:""
      ]);
      const matched=candidates.find(k=>wanted.has(k));
      if(matched && clean(x.token)){
        tokens.add(clean(x.token));
        matches.push({username:clean(x.username),rcno:clean(x.rcno),matchedBy:matched});
      }
    });

    if(!tokens.size){
      return res.status(200).json({
        ok:true,sent:0,failed:0,registeredDevices:0,
        warning:`${clean(d.withFullname)||"Selected staff"} has no enabled notification device. Open Notifications on that phone and tap Enable Notifications.`
      });
    }

    let sent=0,failed=0;
    const list=[...tokens];
    for(let i=0;i<list.length;i+=500){
      const response=await messaging.sendEachForMulticast({
        tokens:list.slice(i,i+500),
        data:{
          notificationId:`duty-${requestId}`,
          title:"Duty Change Request",
          body:`${clean(d.fullname)} sent you a duty change request for ${clean(d.changeDate)}. Tap to review.`,
          url:"/dashboard.html"
        },
        webpush:{
          headers:{Urgency:"high"},
          notification:{
            title:"Duty Change Request",
            body:`${clean(d.fullname)} sent you a duty change request for ${clean(d.changeDate)}. Tap to review.`,
            icon:"/koveli-logo.png",badge:"/koveli-logo.png",tag:`duty-${requestId}`,renotify:true
          },
          fcmOptions:{link:"/dashboard.html"}
        }
      });
      sent+=response.successCount; failed+=response.failureCount;
    }
    return res.status(200).json({ok:true,sent,failed,registeredDevices:tokens.size,matches});
  }catch(e){
    console.error("notify-duty-change:",e);
    return res.status(500).json({ok:false,error:e?.message||String(e)});
  }
};
