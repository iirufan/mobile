const nodemailer = require("nodemailer");

function list(v){ return String(v||"").split(",").map(x=>x.trim()).filter(Boolean); }
function safe(v){ return String(v??"").trim(); }

module.exports = async (req,res) => {
  if(req.method!=="POST") return res.status(405).json({ok:false,error:"Method not allowed"});
  try{
    const b=req.body||{};

    const host=process.env.SMTP_HOST;
    const port=Number(process.env.SMTP_PORT||587);
    const secure=String(process.env.SMTP_SECURE||"false")==="true";
    const user=process.env.SMTP_USER;
    const pass=process.env.SMTP_PASS;
    const from=process.env.MAIL_FROM||user;
    if(!host||!user||!pass||!from) throw new Error("SMTP environment variables are incomplete.");

    // Use the same recipients already configured for Leave email.
    const attachmentRecipients=list(process.env.LEAVE_ATTACHMENT_TO);
    const textRecipients=list(process.env.LEAVE_TEXT_TO);
    const recipients=[...new Set([...attachmentRecipients,...textRecipients])];

    if(!recipients.length) throw new Error("No duty change email recipients configured.");

    const transporter=nodemailer.createTransport({host,port,secure,auth:{user,pass}});
    const subject=`Duty Change Accepted - ${safe(b.fullname)} - ${safe(b.changeDate)}`;

    const text=[
      "KOVELI STAFF - DUTY CHANGE ACCEPTED","",
      `Date: ${safe(b.changeDate)}`,
      `From: ${safe(b.fullname)} (${safe(b.rcno)}) - ${safe(b.currentDuty)}`,
      `With: ${safe(b.withFullname)} (${safe(b.withRCNo)}) - ${safe(b.requestedDuty)}`,
      `Reason: ${safe(b.reason)}`,
      `Accepted by: ${safe(b.acceptedByFullname)}`
    ].join("\n");

    await transporter.sendMail({from,to:recipients.join(","),subject,text});

    return res.status(200).json({ok:true,recipientCount:recipients.length});
  }catch(e){
    console.error("send-duty-change-email:",e);
    return res.status(500).json({ok:false,error:e?.message||String(e)});
  }
};
