let websiteMap = {};
let websiteHistoryMap = {};
const DEFAULT_LIMIT_MINUTES = 15;

chrome.runtime.onMessage.addListener(function(message, messageSender, sendResponse) {
    if (message.websiteMap) {
        websiteMap = message.websiteMap;
    }
    if (message.websiteHistoryMap) {
        websiteHistoryMap = message.websiteHistoryMap;
    }
});

chrome.storage.local.get(null, data => {
    if (data.websiteMap) {
        websiteMap = data.websiteMap;
    }
    if (data.websiteHistoryMap) {
        websiteHistoryMap = data.websiteHistoryMap;
    }

    chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
        const tabURL = (new URL(tabs[0].url)).origin;
        constructWebsitesTrackedTable(tabURL);
        constructWebsiteHistoryTable(tabURL);
    });
});

function constructClassName(prefix, suffix) {
    return '' + prefix + suffix;
}

function getMinutesFromSeconds(secs) {
    return Math.round(secs / 60.0 * 100) / 100;
}

function constructWebsitesTrackedTable(tabURL) {
    if (!(tabURL in websiteMap)) {
        let addWebsiteHTML = '<div class="addWebsite">';
        addWebsiteHTML += '<h3>Add <span style="text-decoration: underline;">' + tabURL + '</span> to TimeLimit tracker?</h3>';
        addWebsiteHTML += '<p>Minutes';
        addWebsiteHTML += '<input style="margin-left: 8px; width: 32px; height: 22px; border: 1px solid #ccc; border-radius: 4px;" id="limitInput" name="limitInput">';
        addWebsiteHTML += '<button class="button" style="margin-left:8px;" id="addWebsiteButton">Add</button>';
        addWebsiteHTML += '</p>';
        addWebsiteHTML += '<hr />';
        addWebsiteHTML += '</div>';
        document.querySelector('.addWebsite').innerHTML = addWebsiteHTML;
        document.getElementById('limitInput').defaultValue = DEFAULT_LIMIT_MINUTES;
        document.getElementById('addWebsiteButton').onclick = function() {
            const inputLimit = document.getElementById('limitInput').value;
            chrome.runtime.sendMessage({website: tabURL, inputLimit: inputLimit}, function(response) {
                websiteMap = response.websiteMap;
                constructWebsitesTrackedTable(tabURL);
            });
        };
    } else {
        let addWebsiteHTML = '<div class="addWebsite"></div>';
        document.querySelector('.addWebsite').innerHTML = addWebsiteHTML;
    }
    if (Object.keys(websiteMap).length > 0) {
        let allTimeLimitsHTML = '<div class="allTimeLimits">';
        allTimeLimitsHTML += '<table>';
        allTimeLimitsHTML += '<tr>';
        allTimeLimitsHTML += '<th></th>';
        allTimeLimitsHTML += '<th>Website</th>';
        allTimeLimitsHTML += '<th>Times Visited</th>';
        allTimeLimitsHTML += '<th>Time Elapsed (min)</th>';
        allTimeLimitsHTML += '<th>Today\'s Limit (min)</th>';
        allTimeLimitsHTML += '<th>Daily Limit (min)</th>';
        allTimeLimitsHTML += '<th></th>';
        allTimeLimitsHTML += '</tr>';
        Object.keys(websiteMap).sort((websiteA, websiteB) => {
            if (websiteA === tabURL) {
                return -1 * Number.MAX_SAFE_INTEGER;
            } else {
                return websiteA - websiteB;
            }
        }).forEach(website => {
            allTimeLimitsHTML += '<tr>';
            allTimeLimitsHTML += '<td>';
            allTimeLimitsHTML += '<a style="color: red;" id="' + constructClassName('removeButton', website) + '">X</a>';
            allTimeLimitsHTML += '</td>';
            allTimeLimitsHTML += '<td>';
            allTimeLimitsHTML += website;
            allTimeLimitsHTML += '</td>';
            allTimeLimitsHTML += '<td>';
            allTimeLimitsHTML += websiteMap[website].visit;
            allTimeLimitsHTML += '</td>';
            allTimeLimitsHTML += '<td>';
            allTimeLimitsHTML += getMinutesFromSeconds(websiteMap[website].secsPassed);
            allTimeLimitsHTML += '</td>';
            allTimeLimitsHTML += '<td>';
            allTimeLimitsHTML += (websiteMap[website].dailyLimit === Number.MAX_SAFE_INTEGER ? 'Ignore' : getMinutesFromSeconds(websiteMap[website].dailyLimit));
            allTimeLimitsHTML += '</td>';
            allTimeLimitsHTML += '<td>';
            allTimeLimitsHTML += '<input style="width: 32px; border: 1px solid #ccc; border-radius: 4px;" id="' + constructClassName('tableInputLimit', website) + '" name="' + constructClassName('tableInputLimit', website) + '">';
            allTimeLimitsHTML += '</td>';
            allTimeLimitsHTML += '<td>';
            allTimeLimitsHTML += '<button class="button" id="' + constructClassName('updateButton', website) + '"><span>&#8634;</span></button>';
            allTimeLimitsHTML += '</td>';
            allTimeLimitsHTML += '</tr>';
        });
        allTimeLimitsHTML += '</table>';
        allTimeLimitsHTML += '</div>';
        document.querySelector('.allTimeLimits').innerHTML = allTimeLimitsHTML;
        for (website in websiteMap) {
            const currWebsite = website;
            document.getElementById(constructClassName('removeButton', currWebsite)).onclick = function() {
                chrome.runtime.sendMessage({removeWebsite: true, website: currWebsite}, function(response) {
                    websiteMap = response.websiteMap;
                    constructWebsitesTrackedTable(tabURL);
                });
            };

            const tableInputLimit = document.getElementById(constructClassName('tableInputLimit', currWebsite));
            tableInputLimit.defaultValue = getMinutesFromSeconds(websiteMap[currWebsite].limit);
            document.getElementById(constructClassName('updateButton', currWebsite)).onclick = function() {
                chrome.runtime.sendMessage({updateWebsite: true, inputLimit: tableInputLimit.value, website: currWebsite}, function(response) {
                    websiteMap = response.websiteMap;
                    constructWebsitesTrackedTable(tabURL);
                });
            }
        }
    } else {
        let addWebsiteHTML = '<div class="allTimeLimits"></div>';
        document.querySelector('.allTimeLimits').innerHTML = addWebsiteHTML;
    }
}

function constructWebsiteHistoryTable(tabURL) {
    if (Object.keys(websiteHistoryMap).length === 0) {
        return;
    }

    let websiteHistoryDataHTML = '<div>';
    websiteHistoryDataHTML += '<hr style="margin-top: 12px; margin-bottom: 12px;" />'
    websiteHistoryDataHTML += '<label for="dateSelector">See website history data for:</label>';
    websiteHistoryDataHTML += '<select style="margin-left: 8px;" name="dateSelector" id="dateSelector">';
    websiteHistoryDataHTML += '<option value="" selected disabled hidden>Select date</option>';
    Object.keys(websiteHistoryMap).sort((dateA, dateB) => (new Date(dateB)) - (new Date(dateA))).forEach(date => {
        websiteHistoryDataHTML += '<option value="' + date + '">' + date + '</option>';
    });
    websiteHistoryDataHTML += '</select>';
    websiteHistoryDataHTML += '<div style="margin-top: 12px;" class="websiteHistoryTable"></div>';
    websiteHistoryDataHTML += '</div>';

    document.querySelector('.websiteHistoryData').outerHTML = websiteHistoryDataHTML;

    document.getElementById('dateSelector').addEventListener('change', event => {
        const websiteMapForDate = websiteHistoryMap[event.target.value];

        let websiteHistoryTableHTML = '<div>';
        websiteHistoryTableHTML += '<table>';
        websiteHistoryTableHTML += '<tr>';
        websiteHistoryTableHTML += '<th>Website</th>';
        websiteHistoryTableHTML += '<th>Times Visited</th>';
        websiteHistoryTableHTML += '<th>Time Spent (min)</th>';
        websiteHistoryTableHTML += '</tr>';

        Object.keys(websiteMapForDate).sort((websiteA, websiteB) => {
            if (websiteA === tabURL) {
                return -1 * Number.MAX_SAFE_INTEGER;
            } else {
                return websiteA - websiteB;
            }
        }).forEach(website => {
            websiteHistoryTableHTML += '<tr>';
            websiteHistoryTableHTML += '<td>';
            websiteHistoryTableHTML += website;
            websiteHistoryTableHTML += '</td>';
            websiteHistoryTableHTML += '<td>';
            websiteHistoryTableHTML += websiteMapForDate[website].visit;
            websiteHistoryTableHTML += '</td>';
            websiteHistoryTableHTML += '<td>';
            websiteHistoryTableHTML += getMinutesFromSeconds(websiteMapForDate[website].secsPassed);
            websiteHistoryTableHTML += '</td>';
            websiteHistoryTableHTML += '</tr>';
        });

        websiteHistoryTableHTML += '</table>';
        websiteHistoryTableHTML += '</div>';

        document.querySelector('.websiteHistoryTable').innerHTML = websiteHistoryTableHTML;
    });
}
