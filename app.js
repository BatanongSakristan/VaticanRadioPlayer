const audio = document.getElementById("audio");
const scheduleDiv = document.getElementById("schedule");
const nowPlaying = document.getElementById("nowPlaying");
const wave = document.getElementById("wave");

function playRadio(){ 
	audio.play(); 
}

function pauseRadio(){ 
	audio.pause(); 
}

async function loadSchedule(){
  try{
    const url = encodeURIComponent("https://www.vaticannews.va/bin/rcs/getonairscheduling.dir/en.json");
    const res = await fetch(`https://api.allorigins.win/raw?url=${url}`);
    const data = await res.json();

    const combined = [...data.episodes, ...data.special];
    combined.sort((a,b)=> new Date(a.startDate) - new Date(b.startDate));
    renderSchedule(combined);

  } catch(e){
    nowPlaying.innerHTML = "Failed to load schedule.";
  }
}

function renderSchedule(items){
	  scheduleDiv.innerHTML = "";
	  const now = new Date();
	  let currentItem=null;

	  items.forEach(item=>{
		const start = new Date(item.startDate);
		const end = item.endDate ? new Date(item.endDate) : new Date(start.getTime() + (item.duration*1000));

		let title = item.titleFromProgram || item.title || "No title";

		// ADD ARTIST ONLY IF SONG
		if(item.rcsType === "Song"){
		  const artist = item.artist || "Unknown Artist";
		  title += ` - ${artist}`;
		}

		// ADD DESCRIPTION
		if(item.descriptionFromProgram){
		  title += ` (${item.descriptionFromProgram})`;
		}

		const div = document.createElement("div");
		div.className="item";

		// SPECIAL STYLE
		if(item.isSpecial) div.classList.add("special");

		div.innerHTML = `
		  <span class="time">${formatTime(start)} - ${formatTime(end)}</span>
		  <span class="title">${title}</span>
		`;

		if(now>=start && now<=end){
		  div.classList.add("active");
		  currentItem=title;
		}

		scheduleDiv.appendChild(div);
		scheduleDiv.style.display = "block";
	  });

	  nowPlaying.innerHTML = currentItem ? "Now Playing: <span class='title'>" + currentItem + "</span>": "No program or song is currently playing.";
}

function formatTime(date){
  return date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}

setInterval(loadSchedule,30000);
loadSchedule();