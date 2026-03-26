const audio = document.getElementById("audio");
const scheduleDiv = document.getElementById("schedule");
const nowPlaying = document.getElementById("nowPlaying");
const wave = document.getElementById("wave");
const channelBtn = document.getElementById("channelBtn");
const channelPopup = document.querySelector(".channel-popup");
const currentChannelName = document.getElementById("currentChannelName");
const volumeBtn = document.getElementById("volumeBtn");
const volumePopup = document.querySelector(".volume-popup");
const volumeSlider = document.getElementById("volumeSlider");
const volumeIcon = document.getElementById("volumeIcon");
const loading = document.getElementById("loading");
// ---------------- SERVICE WORKER ----------------
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(() => console.log('Service Worker Registered'))
        .catch(err => console.error('Service Worker Registration Failed:', err));
}

// ---------------- INSTALL PROMPT ----------------
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('installBtn');
    installBtn.style.display = 'inline-block';
    installBtn.addEventListener('click', async () => {
        installBtn.style.display = 'none';
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('User choice:', outcome);
        deferredPrompt = null;
    });
});

// ---------------- COOKIES ----------------
function setCookie(name, value, days=365) {
    const expires = new Date(Date.now() + days*24*60*60*1000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )'+name+'=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

// ---------------- CHANNELS ----------------
const channels = [
  { code: 'sq', name: 'Albanian' }, { code: 'am', name: 'Amharic' }, { code: 'ar', name: 'Arabic' },
  { code: 'hy', name: 'Armenian' }, { code: 'be', name: 'Belarusian' }, { code: 'bg', name: 'Bulgarian' },
  { code: 'zh', name: 'Chinese' }, { code: 'hr', name: 'Croatian' }, { code: 'cs', name: 'Czech' },
  { code: 'en', name: 'English' }, { code: 'fr', name: 'French' }, { code: 'de', name: 'German' },
  { code: 'hi', name: 'Hindi' }, { code: 'hu', name: 'Hungarian' }, { code: 'it', name: 'Italian' },
  { code: 'lv', name: 'Latvian' }, { code: 'lt', name: 'Lithuanian' }, { code: 'ml', name: 'Malayalam' },
  { code: 'pl', name: 'Polish' }, { code: 'pt', name: 'Portuguese' }, { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian' }, { code: 'sk', name: 'Slovak' }, { code: 'sl', name: 'Slovenian' },
  { code: 'es', name: 'Spanish' }, { code: 'sw', name: 'Swahili' }, { code: 'ta', name: 'Tamil' },
  { code: 'ti', name: 'Tigrinya' }, { code: 'uk', name: 'Ukrainian' }, { code: 'vi', name: 'Vietnamese' },
];

let defaultChannel = 'en';
let currentChannel = getCookie("vrp_channel") || defaultChannel; // default

// ---------------- CHANNEL POPUP ----------------
function populateChannels() {
    channelPopup.innerHTML = "";
    channels.forEach(ch => {
        const div = document.createElement("div");
        div.dataset.code = ch.code;
        div.classList.toggle("active-channel", ch.code === currentChannel);

        // Channel name span
        const nameSpan = document.createElement("span");
        nameSpan.className = "channel-name";  // styled in CSS
        nameSpan.innerText = ch.name;
        div.appendChild(nameSpan);

        // Default tag for current channel
        if (ch.code === defaultChannel) {
            const defaultTag = document.createElement("span");
            defaultTag.className = "default-tag"; // styled in CSS
            defaultTag.innerText = "Default";
            div.appendChild(defaultTag);
        }

        channelPopup.appendChild(div);
    });
	
	// Apply ripple to each channel div
    applyRipple(".channel-popup div");
}

populateChannels();

// Delegated click for channel popup
channelPopup.addEventListener("click", e => {
    const div = e.target.closest("div");
    if(!div) return;
    const code = div.dataset.code;
    switchChannel(code);
    channelPopup.classList.remove("show");
});

// Toggle popup
channelBtn.addEventListener("click", e => {
    e.stopPropagation();
    channelPopup.classList.toggle("show");
});

// Close popup when clicking outside
document.addEventListener("click", e => {
    if(!channelBtn.contains(e.target) && !channelPopup.contains(e.target)){
        channelPopup.classList.remove("show");
    }
});

// Switch channel function
function switchChannel(code){
    currentChannel = code;
    audio.src = `https://radio.vaticannews.va/stream-${code}`;
    audio.play();
    loadSchedule(code);
    updateChannelLabel(code);
    document.querySelectorAll(".channel-popup div").forEach(div => {
        div.classList.toggle("active-channel", div.dataset.code === code);
    });
    setCookie("vrp_channel", code);
}

function updateChannelLabel(code){
    const channel = channels.find(c => c.code === code);
    if(channel) currentChannelName.innerText = channel.name;
}

// ---------------- VOLUME ----------------
function updateVolume(){
    audio.volume = volumeSlider.value;
    if(audio.volume === 0){
        volumeIcon.innerText = "volume_off";
    } else if(audio.volume <= 0.5){
        volumeIcon.innerText = "volume_down";
    } else {
        volumeIcon.innerText = "volume_up";
    }
    setCookie("vrp_volume", audio.volume);
}

// Load saved volume
const savedVolume = getCookie("vrp_volume");
if(savedVolume !== null){
    audio.volume = parseFloat(savedVolume);
    volumeSlider.value = savedVolume;
    updateVolume();
}

// Toggle volume popup
volumeBtn.addEventListener("click", () => volumePopup.classList.toggle("show"));

// Slider input
volumeSlider.addEventListener("input", updateVolume);

// Close volume popup when clicking outside
document.addEventListener("click", (e) => {
    if(!volumeBtn.contains(e.target) && !volumePopup.contains(e.target)){
        volumePopup.classList.remove("show");
    }
});

// ---------------- SCHEDULE ----------------
async function loadSchedule(code = currentChannel) {
    try {
        loading.style.display = "block";
        // Use proper URL, encode only the dynamic code
        const baseUrl = `https://www.vaticannews.va/bin/rcs/getonairscheduling.dir/${code}.json`;
        const res = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(baseUrl)}`);
        const data = await res.json();

        const combined = [...(data.episodes || []), ...(data.special || [])];

        // Remove duplicates
        const seen = new Set();
        const uniqueItems = combined.filter(item => {
            const key = item.startDate + (item.titleFromProgram || item.title || "");
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Sort by start time
        uniqueItems.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        renderSchedule(uniqueItems);
    } catch (e) {
        setTimeout(() => loadSchedule(currentChannel), 10000);
    }
}

function renderSchedule(items){
    scheduleDiv.innerHTML = "";
	scheduleDiv.style.display = "none";
    const now = new Date();
    let currentItem = null;
    let scheduledDividerAdded = false;
    let specialDividerAdded = false;

    items.forEach(item => {
        const start = new Date(item.startDate);
        const end = item.endDate ? new Date(item.endDate) : new Date(start.getTime() + (item.duration*1000));
        let title = item.translate?.title || item.titleFromProgram || item.title || "No title";
        let artist = item.rcsType === "Song" ? (item.artist || "Unknown Artist") : "";
        if(artist) title += ` - ${artist}`;

        // Add dividers
        if(item.isSpecial && !specialDividerAdded){
            const divider = document.createElement("div");
            divider.className = "schedule-divider";
            divider.innerText = "Special Programs";
            scheduleDiv.appendChild(divider);
            specialDividerAdded = true;
        } else if(!item.isSpecial && !scheduledDividerAdded){
            const divider = document.createElement("div");
            divider.className = "schedule-divider";
            divider.innerText = "Scheduled Programs";
            scheduleDiv.appendChild(divider);
            scheduledDividerAdded = true;
        }

        const div = document.createElement("div");
        div.className = `item ${item.isSpecial ? "special" : "normal"}`;

        let displayTime = start.toDateString() !== now.toDateString()
            ? `${start.toLocaleDateString([], {month:'short', day:'numeric', year:'numeric'})}  (${formatTime(start)} - ${formatTime(end)})`
            : `${formatTime(start)} - ${formatTime(end)}`;

        let typeTag = item.isSpecial ? '<span class="tag special-tag">Special</span>'
                        : item.rcsType === "Song" ? '<span class="tag normal-tag">Song</span>'
                        : '<span class="tag normal-tag">Program</span>';

        div.innerHTML = `
            <div class="time">${displayTime}</div>
            <div class="info">
                <div class="title">${title}</div>
                ${item.descriptionFromProgram || item.translate?.description ? `<div class="description">${item.descriptionFromProgram || item.translate.description}</div>` : ""}
                <div class="tag-container">${typeTag}</div>
            </div>
        `;

        // Active check
        if(now >= start && now <= end){
            div.classList.add("active");
            currentItem = title;
            const tagEl = div.querySelector(".tag");
            if(tagEl) tagEl.classList.add("active-tag");
        }

        scheduleDiv.appendChild(div);
        scheduleDiv.style.display = "block";
		
    });

    nowPlaying.innerHTML = currentItem 
        ? "Now Playing: <span class='title'>" + currentItem + "</span>"
        : "No program or song is currently playing.";
}

// Delegated ripple for schedule items
scheduleDiv.addEventListener("click", e => {
    const item = e.target.closest(".item"); // only .item divs
    if(!item) return;

    const ripple = document.createElement("span");
    ripple.className = "ripple";

    const rect = item.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = (e.clientX - rect.left - size/2) + "px";
    ripple.style.top = (e.clientY - rect.top - size/2) + "px";

    item.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
});

// ---------------- TIME FORMATTING ----------------
function formatTime(date){
  return date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}

// ---------------- TAB TITLE UPDATE ----------------
function updateTabTitle() {
    const nowPlayingTitle = nowPlaying.querySelector('.title')?.innerText;
    document.title = nowPlayingTitle ? `${nowPlayingTitle} (VRP)` : "Vatican Radio Player - Batan-ong Sakristan";
}
setInterval(updateTabTitle, 2000);

// ---------------- INITIALIZATION ----------------
switchChannel(currentChannel); // Loads schedule and audio
updateVolume();

const owner = 'xRodzXD';
const repo = 'VaticanRadioPlayer';
const branch = 'main'; // Or the branch you want to check
const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1&sha=${branch}`;

let currentVersion = null;

async function checkVersion() {
    try {
        const res = await fetch("./manifest.json?cacheBust=" + Date.now());
        const data = await res.json();
		
		fetch(apiUrl, {
			headers: {
				'User-Agent': 'VaticanRadioPlayer', 
			}
		})
		.then(response => response.json())
		.then(commits => {
			// The response is an array, the first element is the latest commit
			const latestCommit = commits[0];
			console.log('[INFO] Latest Commit SHA:', latestCommit.sha);
			console.log('[INFO] Date:', latestCommit.commit.author.date);
			console.log('[INFO] Commit URL:', latestCommit.html_url);
			
			const commitShaElem = document.getElementById("commit-sha");
            if (commitShaElem) commitShaElem.innerText = "(<a href='" + String(latestCommit.html_url) + "'>" + String(latestCommit.sha).trim().substring(0, 7) + "</a>)";
		})
		.catch(error => {
			console.error('Error fetching commit data:', error);
		});
		
		if (!currentVersion) {
            // First load
            currentVersion = data.version;
            console.log("[INFO] Current version: ", currentVersion);
            // Update the version display here
            const versionElem = document.getElementById("version");
            if (versionElem) versionElem.innerText = "v" + currentVersion;
            return;
        }

        if (data.version !== currentVersion) {
            console.log("[NOTICE] New version detected: ", data.version);
            const userResponse = confirm(
                "A new version was detected released: VRP v" +
                    data.version +
                    "\nDo you want to proceed to reload?"
            );
            if (userResponse) {
                console.log("[NOTICE] Reloading to the new version: VRP v", data.version);
                location.reload();
            } else {
                console.warn(
                    "[WARNING] The user does not update. It might cause issues, it is recommended to reload for the update for bugs and issues fixes."
                );
            }
        }
    } catch (e) {
        console.error("[ERROR] Version check failed: ", e);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    checkVersion();
});
setInterval(() => checkVersion(), 60000);


// ---------------- RIPPLES ----------------
// Buttons ripple
applyRipple("button");
function applyRipple(selector) {
    document.querySelectorAll(selector).forEach(el => {
        el.addEventListener("click", e => {
            const ripple = document.createElement("span");
            ripple.className = "ripple";

            const rect = el.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);

            ripple.style.width = ripple.style.height = size + "px";
            ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
            ripple.style.top = (e.clientY - rect.top - size / 2) + "px";

            el.appendChild(ripple);
            setTimeout(() => ripple.remove(), 500);
        });
    });
}

// ------- Controls -------------
function playRadio() {
	audio.play();
}

function pauseRadio() {
	audio.pause();
}

