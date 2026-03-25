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
  }
}

function renderSchedule(items){
    scheduleDiv.innerHTML = "";
    const now = new Date();
    let currentItem = null;

    items.forEach(item => {
		const start = new Date(item.startDate);
		const end = item.endDate ? new Date(item.endDate) : new Date(start.getTime() + (item.duration*1000));
		let title = item.titleFromProgram || item.title || "No title";

		// Add artist if it's a song
		if(item.rcsType === "Song") {
			const artist = item.artist || "Unknown Artist";
			title += ` - ${artist}`;
		}

		const description = item.translate?.description || item.descriptionFromProgram || "";

		const div = document.createElement("div");
		div.className = "item";
		if(item.isSpecial) div.classList.add("special");
		else div.classList.add("normal");

		// Determine if this item is currently playing
		const now = new Date();
		const isActive = now >= start && now <= end;
		if(isActive) div.classList.add("active");

		// Determine type tag
		let typeTag = '';
		if(item.isSpecial) {
			typeTag = '<span class="tag special-tag">Special</span>';
		} else if(item.rcsType === "Song") {
			typeTag = '<span class="tag song-tag">Song</span>';
		}

		// Insert HTML
		div.innerHTML = `
			<div class="time">${formatTime(start)} - ${formatTime(end)}</div>
			<div class="info">
				<div class="title">${title}</div>
				${description ? `<div class="description">${description}</div>` : ""}
				${typeTag}
			</div>
		`;

		// **JS: Change tag color if active**
		const tagEl = div.querySelector(".tag");
		if(tagEl && isActive) {
			if(tagEl.classList.contains("song-tag")) {
				tagEl.style.backgroundColor = "#ffffff"; // white background
				tagEl.style.color = "#1a73e8";          // text blue
			}
			if(tagEl.classList.contains("special-tag")) {
				tagEl.style.backgroundColor = "#ffd700"; // solid gold
				tagEl.style.color = "#000";              // black text
			}
		}

		scheduleDiv.appendChild(div);
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