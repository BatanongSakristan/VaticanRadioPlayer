
}

/* LOAD SCHEDULE (ENGLISH FIX) */
async function loadSchedule(){
 try{
  const url=encodeURIComponent("https://www.vaticannews.va/bin/rcs/getonairscheduling.dir/en.json");
  const res=await fetch(`https://api.allorigins.win/raw?url=${url}`);
  const data=await res.json();

  const combined=[...data.episodes,...data.special];
  combined.sort((a,b)=>new Date(a.startDate)-new Date(b.startDate));

  renderSchedule(combined);
 }catch(e){
  nowPlaying.innerText="Failed to load schedule";
 }
}

function renderSchedule(items){
 scheduleDiv.innerHTML="";
 const now=new Date();
 let current=null;

 items.forEach(item=>{
  const start=new Date(item.startDate);
  const end=item.endDate?new Date(item.endDate):new Date(start.getTime()+(item.duration*1000));

  let title=item.titleFromProgram || item.title || "No title";

  if(item.rcsType==="Song"){
   title += " - " + (item.artist || "Unknown Artist");
  }

  if(item.descriptionFromProgram){
   title += " (" + item.descriptionFromProgram + ")";
  }

  const div=document.createElement("div");
  div.className="item";

  if(item.isSpecial) div.classList.add("special");

  div.innerHTML=`<span class="time">${formatTime(start)} - ${formatTime(end)}</span>${title}`;

  if(now>=start && now<=end){
   current=title;
  }

  scheduleDiv.appendChild(div);
 });

 nowPlaying.innerText=current?"Now Playing: "+current:"No program playing";
}

function formatTime(date){
 return date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}

setInterval(loadSchedule,30000);
loadSchedule();

/* PWA */
if('serviceWorker' in navigator){
 navigator.serviceWorker.register('sw.js');
}
