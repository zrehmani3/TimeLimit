let websiteMap = {};
let websiteHistoryMap = {};
let lastTrackedDate = null;

const SECONDS_IN_MINUTE = 60;
const DEFAULT_TIME_LIMIT = SECONDS_IN_MINUTE * 15;

const updateTimer = () => {
    const currDateTime = new Date();
    if (lastTrackedDate === null) {
        lastTrackedDate = currDateTime.toLocaleDateString();
    } else if (lastTrackedDate !== currDateTime.toLocaleDateString()) { // last date has passed
        websiteHistoryMap[lastTrackedDate] = JSON.parse(JSON.stringify(websiteMap));
        lastTrackedDate = currDateTime.toLocaleDateString();
        for (const website in websiteMap) {
            websiteMap[website].dailyTimeLimit = websiteMap[website].timeLimit;
            websiteMap[website].visit = 0;
            websiteMap[website].secsPassed = 0;
        }
    }
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const tabURL = (new URL(tabs[0].url)).origin;
        if (tabURL in websiteMap) {
            websiteMap[tabURL].secsPassed += 1;
        }

        chrome.tabs.sendMessage(
            tabs[0].id,
            {
                dailyTimeLimit: websiteMap[tabURL].dailyTimeLimit,
                secsPassed: websiteMap[tabURL].secsPassed,
                timeLimit: websiteMap[tabURL].timeLimit,
                url: tabURL,
            }
        );
        chrome.runtime.sendMessage({
            websiteMap: websiteMap,
            websiteHistoryMap: websiteHistoryMap,
        });
    });
    updateLocalStorage();
}

chrome.storage.local.get(null, data => {
    if (data.websiteMap) {
        websiteMap = data.websiteMap;
    }
    if (data.websiteHistoryMap) {
        websiteHistoryMap = data.websiteHistoryMap;
    }
    if (data.lastTrackedDate) {
        lastTrackedDate = data.lastTrackedDate;
    }

    setInterval(updateTimer, 1000);
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.closeTab) {
        chrome.tabs.remove(sender.tab.id);
    } else if (request.extendTimeLimit) {
        if (request.tabURL in websiteMap) {
            const numMins = Number(request.numMins);
            websiteMap[request.tabURL].dailyTimeLimit = websiteMap[request.tabURL].secsPassed + (SECONDS_IN_MINUTE * numMins);
        }
    } else if (request.addVisit) {
        if (request.tabURL in websiteMap) {
            websiteMap[request.tabURL].visit += 1;
        }
    } else if (request.ignoreToday) {
        if (request.tabURL in websiteMap) {
            websiteMap[request.tabURL].dailyTimeLimit = Number.MAX_SAFE_INTEGER;
        }
    } else if (request.updateWebsite) {
        if (request.website in websiteMap) {
            const timeLimit = Number(request.inputTimeLimit) ? Number(request.inputTimeLimit) * 60 : DEFAULT_TIME_LIMIT;
            websiteMap[request.website].timeLimit = timeLimit;
            websiteMap[request.website].dailyTimeLimit = timeLimit;
            sendResponse({
                websiteMap: websiteMap,
            });
        }
    } else if (request.removeWebsite) {
        delete websiteMap[request.website];
        sendResponse({
            websiteMap: websiteMap,
        });
    } else { // new website added
        const timeLimit = Number(request.inputTimeLimit) ? Number(request.inputTimeLimit) * 60 : DEFAULT_TIME_LIMIT;
        websiteMap[request.website] = {};
        websiteMap[request.website].timeLimit = timeLimit;
        websiteMap[request.website].dailyTimeLimit = timeLimit;
        websiteMap[request.website].secsPassed = 0
        websiteMap[request.website].visit = 1;
        sendResponse({
            websiteMap: websiteMap,
        });
    }
    updateLocalStorage();
    return true;
});

function updateLocalStorage() {
    chrome.storage.local.set({
        lastTrackedDate: lastTrackedDate,
        websiteMap: websiteMap,
        websiteHistoryMap: websiteHistoryMap,
    })
}
