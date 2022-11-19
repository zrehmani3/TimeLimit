let hasShownLimitPassedDialog = false;
let hasEverShownLimitDialog = false;

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (true || request.secsPassed >= request.dailyLimit && !hasShownLimitPassedDialog) {
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
        if (request.dailyLimit === request.limit) {
          document.getElementById('extendOneMinute').style.display = 'block';
        } else {
          document.getElementById('extendOneMinute').style.display = 'none';
        }
        document.getElementById('extendOneMinute').onclick = function() {
          chrome.runtime.sendMessage({tabURL: request.url, extendOneMinute: true});
          resetModal();
        }
        document.getElementById('extendLimit').onclick = function() {
          chrome.runtime.sendMessage({tabURL: request.url, extendLimit: true});
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
