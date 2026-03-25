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
    loading.style.display = "block";
    const url = encodeURIComponent("https://www.vaticannews.va/bin/rcs/getonairscheduling.dir/en.json");
    const res = await fetch(`https://corsproxy.io/?url=${url}`);
    const data = await res.json();

    // Combine episodes and special
    const combined = [...data.episodes, ...data.special];

    // Remove duplicates using startDate + title as key
    const seen = new Set();
    const uniqueItems = combined.filter(item => {
        const key = item.startDate + (item.titleFromProgram || item.title || "");
        if(seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Sort by start time
    uniqueItems.sort((a,b)=> new Date(a.startDate) - new Date(b.startDate));

    renderSchedule(uniqueItems);

  } catch(e){
    //nowPlaying.innerHTML = "Failed to load schedule. <a href='#' onclick='loadSchedule()'>Retry..</a>";
	loadSchedule();
	setInterval(loadSchedule,1000);
  }
}

function renderSchedule(items){
    scheduleDiv.innerHTML = "";
    const now = new Date();
    let currentItem = null;

    items.forEach(item=>{
        const start = new Date(item.startDate);
        const end = item.endDate ? new Date(item.endDate) : new Date(start.getTime() + (item.duration*1000));

        let title = item.titleFromProgram || item.title || "No title";

        // Add artist if it's a song
        let artist = "";
        if(item.rcsType === "Song") {
            artist = item.artist || "Unknown Artist";
            title += ` - ${artist}`;
        }

        // Add description
        let description = item.descriptionFromProgram || "";
        if(item.translate && item.translate.description){
            description = item.translate.description;
        }

        const div = document.createElement("div");
        div.className="item";
        if(item.isSpecial) {
			div.classList.add("special");
		} else {
			div.classList.add("normal");
		}
		
		if(item.translate && item.translate.title){
			title = item.translate.title + (artist ? ` - ${artist}` : "");
		}

        // Determine display date for the time
		let displayTime = '';
		if (start.toDateString() !== now.toDateString()) {
			// Not today → show date + time
			displayTime = `${start.toLocaleDateString([], {month:'short', day:'numeric', year:'numeric'})}  ${formatTime(start)} - ${formatTime(end)}`;
		} else {
			// Today → only show time
			displayTime = `${formatTime(start)} - ${formatTime(end)}`;
		}

		// Determine type tag
		let typeTag = '';
		if(item.isSpecial) {
			typeTag = '<span class="tag special-tag">Special</span>';
		} else if(item.rcsType === "Song") {
			typeTag = '<span class="tag song-tag">Song</span>';
		}

		div.innerHTML = `
			<div class="time">${displayTime}</div>
			<div class="info">
				<div class="title">${title} </div>
				${description ? `<div class="description">${description}</div>` : ""}
				${typeTag ? `<div class="tag-container">${typeTag}</div>` : ""}
			</div>
		`;

        // Check if currently playing
		const isActive = now >= start && now <= end;
		if(isActive){
			div.classList.add("active");
			currentItem = title;

			// Add active class to tag
			const tagEl = div.querySelector(".tag");
			if(tagEl){
				tagEl.classList.add("active-tag");
			}
		}

        scheduleDiv.appendChild(div);
        scheduleDiv.style.display = "block";
    });

    nowPlaying.innerHTML = currentItem 
        ? "Now Playing: <span class='title'>" + currentItem + "</span>"
        : "No program or song is currently playing.";
}

function formatTime(date){
  return date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}

let currentVersion = null;

async function checkVersion() {
	  try {
		const res = await fetch("./manifest.json?cacheBust=" + Date.now());
		const data = await res.json();

		if (!currentVersion) {
			// First load
			currentVersion = data.version;
			console.log("[INFO] Current version: ", currentVersion);
			return;
		}

		if (data.version !== currentVersion) {
			console.log("[NOTICE] New version detected: ", data.version);

			// Optional: show message before reload
			// alert("New version available. Reloading...");

			location.reload(true); // force reload
		}

	} catch (e) {
		console.error("[ERROR] Version check failed: ", e);
	}
}

// Example usage
checkVersion().then(version => {
	document.getElementById("version").innerText = "v" + (currentVersion ?? "0.0.0");
});

setInterval(loadSchedule,30000);
loadSchedule();
checkVersion();