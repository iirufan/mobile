const admin=require("firebase-admin");

function initAdmin(){
 if(admin.apps.length)return admin.app();
 let sa;
 if(process.env.FIREBASE_SERVICE_ACCOUNT_JSON){
   sa=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
   if(sa.private_key)sa.private_key=sa.private_key.replace(/\\n/g,"\n");
 }else{
   sa={project_id:process.env.FIREBASE_PROJECT_ID,client_email:process.env.FIREBASE_CLIENT_EMAIL,private_key:String(process.env.FIREBASE_PRIVATE_KEY||"").replace(/\\n/g,"\n")};
 }
 admin.initializeApp({credential:admin.credential.cert(sa)});
 return admin.app();
}
function clean(v){return String(v||"").trim()}
module.exports=async(req,res)=>{
 if(req.method!=="POST")return res.status(405).json({ok:false,error:"Method not allowed"});
 try{
   if(!process.env.PUSH_ADMIN_KEY)return res.status(500).json({ok:false,error:"PUSH_ADMIN_KEY is not configured in Vercel."});
   if(clean(req.headers["x-admin-key"])!==clean(process.env.PUSH_ADMIN_KEY))return res.status(401).json({ok:false,error:"Invalid notification admin key."});
   initAdmin();
   const {title,body,url,targetType,targetValue}=req.body||{};
   if(!clean(title)||!clean(body))return res.status(400).json({ok:false,error:"Title and message are required."});
   const db=admin.firestore();
   const users=Array.isArray(req.body.recipients)?req.body.recipients:[];
   const recipientKeys=users.map(u=>`${clean(u.username).toLowerCase()}_${clean(u.rcno)}`);
   if(!recipientKeys.length)return res.status(400).json({ok:false,error:"No recipients selected."});
   const ref=await db.collection("notifications").add({
     title:clean(title),body:clean(body),url:clean(url)||"/notifications.html",
     targetType:clean(targetType)||"selected",targetValue:clean(targetValue),
     recipientKeys,readBy:[],createdAt:admin.firestore.FieldValue.serverTimestamp()
   });
   const usernames=users.map(u=>clean(u.username).toLowerCase());
   const tokenSnap=await db.collection("pushTokens").where("usernameLower","in",usernames.slice(0,30)).get();
   const tokens=[];tokenSnap.forEach(d=>{const x=d.data();if(x.enabled!==false&&x.token)tokens.push(x.token)});
   let successCount=0,failureCount=0;
   for(let i=0;i<tokens.length;i+=500){
     const r=await admin.messaging().sendEachForMulticast({
       tokens:tokens.slice(i,i+500),
       data:{title:clean(title),body:clean(body),url:clean(url)||"/notifications.html",notificationId:ref.id}
     });
     successCount+=r.successCount;failureCount+=r.failureCount;
   }
   return res.json({ok:true,id:ref.id,recipients:recipientKeys.length,devices:tokens.length,successCount,failureCount});
 }catch(e){console.error(e);return res.status(500).json({ok:false,error:e.message||"Notification send failed"})}
};
