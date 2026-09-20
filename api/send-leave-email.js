const nodemailer = require("nodemailer");

const MAX_ATTACHMENT_BYTES = 2.5 * 1024 * 1024;

function list(v){ return String(v||"").split(",").map(x=>x.trim()).filter(Boolean); }
function safe(v){ return String(v??"").trim(); }

module.exports = async (req,res) => {
  if(req.method!=="POST") return res.status(405).json({ok:false,error:"Method not allowed"});
  try{
    const b=req.body||{};
    const attachment=b.attachment||null;
    if(attachment?.base64){
      const bytes=Buffer.from(attachment.base64,"base64").length;
      if(bytes>MAX_ATTACHMENT_BYTES) return res.status(413).json({ok:false,error:"Attachment exceeds 2.5 MB"});
    }

    const host=process.env.SMTP_HOST;
    const port=Number(process.env.SMTP_PORT||587);
    const secure=String(process.env.SMTP_SECURE||"false")==="true";
    const user=process.env.SMTP_USER;
    const pass=process.env.SMTP_PASS;
    const from=process.env.MAIL_FROM||user;
    if(!host||!user||!pass||!from) throw new Error("SMTP environment variables are incomplete.");

    const attachmentRecipients=list(process.env.LEAVE_ATTACHMENT_TO);
    const textRecipients=list(process.env.LEAVE_TEXT_TO);
    if(!attachmentRecipients.length && !textRecipients.length) throw new Error("No leave email recipients configured.");

    const transporter=nodemailer.createTransport({host,port,secure,auth:{user,pass}});
    const subject=`Leave Application - ${safe(b.fullname)} - ${safe(b.leaveDate)}`;
    const text=[
      "KOVELI STAFF - LEAVE APPLICATION","",
      `Name: ${safe(b.fullname)} (${safe(b.rcno)})`,
      `Leave Date: ${safe(b.leaveDate)}`,
      `Duty Time: ${safe(b.dutyTime)}`,
      `Reason: ${safe(b.reason)}`
    ].join("\n");

    const jobs=[];
    // Group A: gets identical text + attachment (when supplied).
    if(attachmentRecipients.length){
      jobs.push(transporter.sendMail({
        from,to:attachmentRecipients.join(","),subject,text,
        attachments:attachment?.base64?[{filename:safe(attachment.name)||"document",content:attachment.base64,encoding:"base64",contentType:safe(attachment.type)||undefined}]:[]
      }));
    }
    // Group B: gets identical text only, never the attachment.
    if(textRecipients.length){
      jobs.push(transporter.sendMail({from,to:textRecipients.join(","),subject,text}));
    }
    await Promise.all(jobs);
    return res.status(200).json({ok:true});
  }catch(e){
    console.error("send-leave-email:",e);
    return res.status(500).json({ok:false,error:e?.message||String(e)});
  }
};
