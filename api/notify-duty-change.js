const admin = require("firebase-admin");

function clean(v){ return String(v ?? "").trim(); }
function lower(v){ return clean(v).toLowerCase(); }

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

function app(){
  if(admin.apps.length) return admin.app();
  return admin.initializeApp({credential:admin.credential.cert(readServiceAccount())});
}

module.exports=async(req,res)=>{
  if(req.method!=="POST") return res.status(405).json({ok:false,error:"Method not allowed"});
  try{
    const requestId=clean(req.body?.requestId);
    if(!requestId) return res.status(400).json({ok:false,error:"Request ID is required."});

    const a=app(), db=admin.firestore(a);
    const snap=await db.collection("dutyChanges").doc(requestId).get();
    if(!snap.exists) return res.status(404).json({ok:false,error:"Duty change request not found."});
    const d=snap.data()||{};
    if(lower(d.status)!=="pending") return res.status(409).json({ok:false,error:"Duty change is no longer pending."});

    const username=lower(d.withUsername), rcno=clean(d.withRCNo);
    if(!username && !rcno) return res.status(400).json({ok:false,error:"Selected staff details are missing."});

    const tokenSnap=await db.collection("pushTokens").get();
    const tokens=[];
    tokenSnap.forEach(doc=>{
      const x=doc.data()||{};
      if(x.enabled===false) return;
      const matches =
        (username && [x.username,x.usernameLower].some(v=>lower(v)===username)) ||
        (rcno && clean(x.rcno)===rcno);
      const token=clean(x.token||doc.id);
      if(matches && token) tokens.push(token);
    });

    if(!tokens.length) return res.status(200).json({ok:true,sent:0,message:"No registered push device for selected staff."});

    let sent=0, failed=0;
    for(let i=0;i<tokens.length;i+=500){
      const chunk=tokens.slice(i,i+500);
      const r=await admin.messaging(a).sendEachForMulticast({
        tokens:chunk,
        data:{
          notificationId:`duty-${requestId}`,
          title:"Duty Change Request",
          body:`${clean(d.fullname)} requested a duty change with you for ${clean(d.changeDate)}.`,
          url:"/dutychange.html"
        },
        webpush:{headers:{Urgency:"high"}}
      });
      sent+=r.successCount; failed+=r.failureCount;
    }
    return res.status(200).json({ok:true,sent,failed});
  }catch(e){
    console.error("notify-duty-change:",e);
    return res.status(500).json({ok:false,error:e?.message||String(e)});
  }
};
