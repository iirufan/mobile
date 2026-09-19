importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");
importScripts("/script/firebase-config.js");

const messaging=firebase.messaging();

messaging.onBackgroundMessage(payload=>{
  const data=payload.data||{};
  const title=data.title||"Koveli Lounge";
  const options={
    body:data.body||"",
    icon:"/koveli-logo.png",
    badge:"/koveli-logo.png",
    tag:data.notificationId||"koveli-message",
    renotify:true,
    data:{url:data.url||"/notifications.html",notificationId:data.notificationId||""}
  };
  self.registration.showNotification(title,options);
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const url=(event.notification.data&&event.notification.data.url)||"/notifications.html";
  event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    for(const c of list){ if("focus" in c){c.navigate(url);return c.focus()} }
    if(clients.openWindow) return clients.openWindow(url);
  }));
});
