let hasShownLimitPassedDialog = false;
let hasEverShownLimitDialog = false;

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.secsPassed >= request.dailyTimeLimit && !hasShownLimitPassedDialog) {
    fetch(chrome.runtime.getURL('/modal.html'))
      .then(response => response.text())
      .then(data => {
        if (!hasEverShownLimitDialog) {
          document.body.insertAdjacentHTML('beforebegin', data);
          hasEverShownLimitDialog = true;
        }
        hasShownLimitPassedDialog = true;
        document.getElementById('hourglass').src = chrome.runtime.getURL("images/waiting-time-icon.png");
        document.getElementById('overlay').style.display = 'flex';
        document.getElementById('overlay').style.animation = 'append-animate .5s linear forwards';
        document.getElementById('closeTab').onclick = function() {
          chrome.runtime.sendMessage({closeTab: true});
          hasShownLimitPassedDialog = false;
        };
        if (request.dailyTimeLimit === request.timeLimit) {
          document.getElementById('timeExtend1').style.display = 'block';
        } else {
          document.getElementById('timeExtend1').style.display = 'none';
        }
        document.getElementById('timeExtend1').onclick = function() {
          chrome.runtime.sendMessage({tabURL: request.url, extendTimeLimit: true, numMins: 1});
          resetModal();
        }
        document.getElementById('timeExtend15').onclick = function() {
          chrome.runtime.sendMessage({tabURL: request.url, extendTimeLimit: true, numMins: 15});
          resetModal();
        }
        document.getElementById('ignoreToday').onclick = function() {
          chrome.runtime.sendMessage({tabURL: request.url, ignoreToday: true});
          resetModal();
        }
      }).catch(err => {
          console.log(err);
      });
  }
});

function resetModal() {
  hasShownLimitPassedDialog = false;
  document.getElementById('overlay').style.animation = 'remove-animate .5s linear forwards';
}

let tabURL = (new URL(location.href)).origin;
chrome.runtime.sendMessage({addVisit: true, tabURL: tabURL})
