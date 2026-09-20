const nodemailer = require("nodemailer");

function clean(v){ return String(v ?? "").trim(); }
function list(v){ return String(v || "").split(",").map(x => x.trim()).filter(Boolean); }

module.exports = async function handler(req,res){
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate");
  if(req.method !== "POST"){
    res.setHeader("Allow","POST");
    return res.status(405).json({ok:false,error:"Method not allowed"});
  }

  try{
    const b = req.body || {};
    const requestId = clean(b.requestId);
    if(!requestId) return res.status(400).json({ok:false,error:"Duty change request ID is required."});

    // Verify the request from Firestore instead of trusting browser-supplied details.
    const admin = require("firebase-admin");
    let app;
    if(admin.apps && admin.apps.length){
      app = admin.app();
    }else{
      let serviceAccount;
      if(process.env.FIREBASE_SERVICE_ACCOUNT_JSON){
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        if(serviceAccount.private_key) serviceAccount.private_key = String(serviceAccount.private_key).replace(/\\n/g,"\n");
      }else{
        const projectId=clean(process.env.FIREBASE_PROJECT_ID);
        const clientEmail=clean(process.env.FIREBASE_CLIENT_EMAIL);
        const privateKey=String(process.env.FIREBASE_PRIVATE_KEY||"").replace(/\\n/g,"\n");
        if(!projectId || !clientEmail || !privateKey) throw new Error("Firebase Admin credentials are incomplete.");
        serviceAccount={project_id:projectId,client_email:clientEmail,private_key:privateKey};
      }
      app=admin.initializeApp({credential:admin.credential.cert(serviceAccount)});
    }

    const db=admin.firestore(app);
    const ref=db.collection("dutyChanges").doc(requestId);
    const snap=await ref.get();
    if(!snap.exists) return res.status(404).json({ok:false,error:"Duty change request was not found."});
    const d=snap.data() || {};

    if(clean(d.status).toLowerCase() !== "accepted"){
      return res.status(409).json({ok:false,error:"Duty change has not been accepted yet."});
    }

    const host=process.env.SMTP_HOST;
    const port=Number(process.env.SMTP_PORT||587);
    const secure=String(process.env.SMTP_SECURE||"false")==="true";
    const user=process.env.SMTP_USER;
    const pass=process.env.SMTP_PASS;
    const from=process.env.MAIL_FROM||user;

    if(!host||!user||!pass||!from) throw new Error("SMTP environment variables are incomplete.");

    // Set this in Vercel, for example:
    // DUTY_CHANGE_TO=supervisor1@example.com,supervisor2@example.com
    const recipients=list(process.env.DUTY_CHANGE_TO);
    if(!recipients.length) throw new Error("DUTY_CHANGE_TO is not configured in Vercel.");

    const transporter=nodemailer.createTransport({host,port,secure,auth:{user,pass}});
    const subject=`Duty Change Accepted - ${clean(d.fullname)} - ${clean(d.changeDate)}`;
    const text=[
      "KOVELI STAFF - DUTY CHANGE ACCEPTED","",
      `Request ID: ${requestId}`,
      `Date: ${clean(d.changeDate)}`,"",
      "REQUESTING STAFF",
      `Name: ${clean(d.fullname)}`,
      `RC No: ${clean(d.rcno)}`,
      `Current Duty: ${clean(d.currentDuty)}`,"",
      "ACCEPTED BY",
      `Name: ${clean(d.withFullname)}`,
      `RC No: ${clean(d.withRCNo)}`,
      `Requested Duty: ${clean(d.requestedDuty)}`,"",
      `Reason: ${clean(d.reason)}`,
      `Accepted At: ${clean(d.acceptedAtText)}`
    ].join("\n");

    await transporter.sendMail({from,to:recipients.join(","),subject,text});

    await ref.set({
      emailStatus:"sent",
      emailSentAt:admin.firestore.FieldValue.serverTimestamp()
    },{merge:true});

    return res.status(200).json({ok:true,recipientCount:recipients.length});
  }catch(e){
    console.error("send-duty-change-email:",e);
    return res.status(500).json({ok:false,error:e?.message||String(e)});
  }
};
