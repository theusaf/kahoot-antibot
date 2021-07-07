// ==UserScript==
// @name           KAntibot Dev
// @namespace      http://tampermonkey.net/
// @homepage       https://theusaf.org
// @version        3.0.0-pre1
// @icon           https://cdn.discordapp.com/icons/641133408205930506/31c023710d468520708d6defb32a89bc.png
// @description    Remove all bots from a kahoot game.
// @description:es eliminar todos los bots de un Kahoot! juego.
// @description:jp Kahootゲームから全てのボットを出して。
// @author         theusaf
// @copyright      2018-2021, Daniel Lau (https://github.com/theusaf/kahoot-antibot)
// @supportURL     https://discord.gg/pPdvXU6
// @match          *://play.kahoot.it/*
// @exclude        *://play.kahoot.it/v2/assets/*
// @grant          none
// @run-at         document-start
// @license        MIT
// ==/UserScript==

/*

MIT LICENSE TEXT

Copyright 2018-2021 theusaf

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

/**
 * Special thanks to
 * - epicmines33
 * - stevehainesfib
 * - https://stackoverflow.com/questions/10473745/compare-strings-javascript-return-of-likely
 *
 * for helping with contribution and testing of this project
 */

if(window.fireLoaded || (window.parent && window.parent.page)) {throw "[ANTIBOT] - page is loaded";}
if(window.localStorage.extraCheck) {console.log("[ANTIBOT] - Detected PIN Checker");}
if(window.localStorage.kahootThemeScript) {console.log("[ANTIBOT] - Detected KonoSuba Theme");}

document.write("<p id=\"antibot-loading-notice\">[ANTIBOT] - Patching Kahoot. Please wait.</p><p>If this screen stays blank for a long time, report an issue in <a href=\"https://discord.gg/pPdvXU6\">Discord</a>, <a href=\"https://github.com/theusaf/kantibot\">GitHub</a>, or <a href=\"https://greasyfork.org/en/scripts/374093-kantibot\">Greasyfork</a>.</p>");
window.antibotAdditionalScripts = window.antibotAdditionalScripts || [];
window.kantibotEnabled = true;

/**
 * External Libraries
 * Note: This script requires https://raw.githubusercontent.com/theusaf/a-set-of-english-words/master/index.js
 * - This is a script that loads 275k english words into a set. (about 30MB ram?)
 * @see https://github.com/theusaf/a-set-of-english-words
 *
 * Also, it requires https://raw.githubusercontent.com/theusaf/random-name/master/names.js
 * - Loads a bunch of names into sets.
 * @see https://raw.githubusercontent.com/theusaf/random-name
 *
 * If these get removed or fail to load, this should not break the service, but will cause certain features to not work
 */
const url = window.location.href,
  requiredAssets = [
    "https://raw.githubusercontent.com/theusaf/a-set-of-english-words/master/index.js",
    "https://raw.githubusercontent.com/theusaf/random-name/master/names.js"
  ];

function makeHttpRequest(url) {
  const request = new XMLHttpRequest();
  request.open("GET", url);
  request.send();
  return new Promise((resolve, reject) => {
    request.onerror = request.onload = () => {
      if (request.readyState === 4 && request.status === 200) {
        resolve(request);
      } else {
        reject(request);
      }
    };
  });
}

async function fetchMainPage() {
  const mainPageRequest = await makeHttpRequest(url),
    vendorsScriptURL = mainPageRequest.response
      .match(/><\/script><script .*?vendors.*?><\/script>/mg)[0]
      .substr(9).split("src=\"")[1].split("\"")[0],
    mainScriptURL = mainPageRequest.response.match(/\/v2\/assets\/js\/main.*?(?=")/mg)[0],
    originalPage = mainPageRequest.response
      .replace(/><\/script><script .*?vendors.*?><\/script>/mg, "></script>")
      .replace(/(\/\/assets-cdn.kahoot.it\/player)?\/v2\/assets\/js\/main.*?(?=")/mg,"data:text/javascript,");
  return {
    page: originalPage,
    vendorsScriptURL,
    mainScriptURL
  };
}

async function fetchVendorsScript(vendorsScriptURL) {
  const vendorsScriptRequest = await makeHttpRequest(vendorsScriptURL),
    patchedScriptRegex = /\.onMessage=function\([a-z],[a-z]\)\{/mg,
    vendorsScriptLetter1 = vendorsScriptRequest.response.match(patchedScriptRegex)[0].match(/[a-z](?=,)/g)[0],
    vendorsScriptLetter2 = vendorsScriptRequest.response.match(patchedScriptRegex)[0].match(/[a-z](?=\))/g)[0],
    patchedVendorsScript = vendorsScriptRequest.response
      .replace(vendorsScriptRequest.response
        .match(patchedScriptRegex)[0],
      `.onMessage = function(${vendorsScriptLetter1},${vendorsScriptLetter2}){
          windw.antibotData.methods.websocketMessageHandler(${vendorsScriptLetter1},${vendorsScriptLetter2});`
      );
  return patchedVendorsScript;
}

async function fetchMainScript(mainScriptURL) {
  const mainScriptRequest = await makeHttpRequest(mainScriptURL);
  let mainScript = mainScriptRequest.response;
  // Access the namerator option
  const nameratorRegex = /=[a-z]\.namerator/gm,
    nameratorLetter = mainScript.match(nameratorRegex)[0].match(/[a-z](?=\.)/g)[0];
  mainScript = mainScript.replace(
    mainScript.match(nameratorRegex)[0], // TODO: have a central data area
    `=(()=>{
      console.log(${nameratorLetter}.namerator);
      windw.antibotData.isUsingNamerator = ${nameratorLetter}.namerator;
      return ${nameratorLetter}.namerator;
    })()`
  );
  // Access the currentQuestionTimer and change the question time
  const currentQuestionTimerRegex = /currentQuestionTimer:[a-z]\.payload\.questionTime/gm,
    currentQuestionTimerLetter = mainScript.match(currentQuestionTimerRegex)[0].match(/[a-z](?=\.payload)/g)[0];
  mainScript = mainScript.replace(
    mainScript.match(currentQuestionTimerRegex)[0],
    `currentQuestionTimer:${currentQuestionTimerLetter}.payload.questionTime + (()=>{
      return (windw.antibotData.settings.teamtime * 1000) || 0;
    })()`
  );
  // Access the "NoStreakPoints", allowing it to be enabled
  const noStreakPointsRegex = /[a-zA-Z]{2}\.NoStreakPoints/gm;
  mainScript = mainScript.replace(
    mainScript.match(noStreakPointsRegex)[0],
    "windw.antibotData.settings.streakBonus || 2"
  ); // yes = 1, no = 2
  // Access the StartQuiz function. Also gains direct access to the controllers!
  const startQuizRegex = /=[a-zA-Z]\.startQuiz/gm,
    startQuizLetter = mainScript.match(startQuizRegex)[0].match(/[a-zA-Z](?=\.)/g)[0];
  mainScript = mainScript.replace(mainScript.match(startQuizRegex)[0],`=(()=>{
    windw.antibotData.kahootInternals.globalFuncs = ${startQuizLetter};
    return ${startQuizLetter}.startQuiz})()`
  );
  // Access the fetched quiz information. Allows the quiz to be modified when the quiz is fetched!
  const fetchedQuizInformationRegex = /RETRIEVE_KAHOOT_ERROR",[\w\d]{2}=function\([a-z]\){return Object\([\w$\d]{2}\.[a-z]\)\([\w\d]{2},{response:[a-z]}\)}/gm,
    fetchedQuizInformationLetter = mainScript.match(fetchedQuizInformationRegex)[0].match(/response:[a-z]/g)[0].split(":")[1],
    fetchedQuizInformationCode = mainScript.match(fetchedQuizInformationRegex)[0];
  mainScript = mainScript.replace(fetchedQuizInformationCode,`RETRIEVE_KAHOOT_ERROR",${fetchedQuizInformationCode.split("RETRIEVE_KAHOOT_ERROR\",")[1].split("response:")[0]}response:(()=>{
    windw.antibotData.kahootInternals.globalQuizData = ${fetchedQuizInformationLetter};
    windw.antibotData.methods.extraQuestionSetup(${fetchedQuizInformationLetter});
    return ${fetchedQuizInformationLetter};
  })()})}`);
  // Access the core data
  const coreDataRegex = /[a-z]\.game\.core/m,
    coreDataLetter = mainScript.match(coreDataRegex)[0].match(/[a-z](?=\.game)/)[0];
  mainScript = mainScript.replace(coreDataRegex,`(()=>{
    if(typeof windw !== "undefined"){
      windw.antibotData.kahootInternals.kahootCore = ${coreDataLetter};
    }
    return ${coreDataLetter}.game.core;
  })()`);
  return mainScript;
}

const kantibotProgramCode = () => {
  const windw = window.parent;
  window.windw = windw;

  /**
   * createSetting - Creates a setting option string
   *
   * @param  {String}   name         The name of the option
   * @param  {String}   type         The type of the option
   * @param  {String}   id           The id of the option
   * @param  {String}   description  The description of the option
   * @param  {String}   default      The default value of the option
   * @param  {Function} setup        A function to modify the input,label
   * @param  {Function} callback     A function to call when the value changes
   * @returns {String}               The resulting HTML for the option
   */
  function createSetting(name, type, id, description, def=null, setup=()=>{}, callback=()=>{}) {
    const label = document.createElement("label"),
      input = type === "textarea" ? document.createElement("textarea") : document.createElement("input"),
      container = document.createElement("div");
    if (type !== "textarea") {
      input.setAttribute("type", type);
    } else {
      input.setAttribute("onclick", `
      this.className = "antibot-textarea";
      `);
      input.setAttribute("onblur", `
      this.className = "";
      `);
    }
    input.id = label.htmlFor = `antibot.config.${id}`;
    label.id = input.id + ".label";
    label.title = description;
    label.innerHTML = name;
    if (type === "checkbox") {
      container.append(input, label);
      input.setAttribute("onclick", `
      const value = event.target.checked;
      (${callback.toString()})(event.target);
      `);
    } else {
      container.append(label, input);
      input.setAttribute("onchange", `
      const value = event.target.nodeName === "TEXTAREA" ? event.target.value.split("\n") : event.target.type === "number" ? +event.target.value : event.target.value;
      (${callback.toString()})(event.target);
      `);
      label.className = "antibot-input";
    }
    if (def != null) {
      if (type === "checkbox") {
        if(def) {input.setAttribute("checked", "");}
      } else {
        input.setAttribute("value", `${def}`);
      }
    }
    setup(input, label);
    return container.outerHTML;
  }

  // create watermark
  const UITemplate = document.createElement("template");
  UITemplate.innerHTML = `<div id="antibotwtr">
    <p>v3.0.0 ©theusaf</p>
    <p id="antibot-killcount">0</p>
    <details>
      <summary>config</summary>
      <div id="antibot-settings">
${createSetting("Block Fast Answers", "checkbox", "timeout", "Blocks answers sent 0.5 seconds after the question starts")}
${createSetting("Block Random Names", "checkbox", "looksRandom", "Blocks names that look random, such as 'rAnDOM naMe'", true)}
${createSetting("Block Format F[.,-]L", "checkbox", "blockformat1", "Blocks names using the format [First][random char][Last]", true)}
${createSetting("Additional Blocking Filters", "checkbox", "blockservice1", "Enables multiple additional blocking filters for some bot programs")}
${createSetting("Block Numbers", "checkbox", "blocknum", "Blocks names containing numbers, if multiple with numbers join within a short period of time")}
${createSetting("Force Alphanumeric Names", "checkbox", "forceascii", "Blocks names containing non-alphanumeric characters, if multiple join within a short period of time")}
${createSetting("Detect Patterns", "checkbox", "patterns", "Blocks bots spammed using similar patterns")}
${createSetting("Additional Question Time", "number", "teamtimeout", "Adds extra seconds to a question", 0, input => input.setAttribute("step", 0))}
${createSetting("Name Match Percent", "number", "percent", "The percent to check name similarity before banning the bot.", 0.6, input => input.setAttribute("step", 0.1))}
${createSetting("Word Blacklist", "textarea", "wordblock", "Block names containing any from a list of words. Separate by new line.")}
${createSetting("Auto-Lock Threshold", "number", "ddos", "Specify the number of bots/minute to lock the game. Set to 0 to disable", 0, input => input.setAttribute("step", 1))}
${createSetting("Lobby Auto-Start Time", "number", "start_lock", "Specify the maximum amount of time for a lobby to stay open after a player joins. Set to 0 to disable", 0, input => input.setAttribute("step", 1))}
${createSetting("Enable Streak Bonus Points", "checkbox", "streakBonus", "Enable answer streak bonus points (a feature removed by Kahoot!)")}
${createSetting("Show Antibot Timers", "checkbox", "counters", "Display Antibot Counters/Timers (Lobby Auto-Start, Auto-Lock, etc)")}
${createSetting("Counter Kahoot! Cheats", "checkbox", "counterCheats", "Adds an additional 5 second question at the end to counter cheats. Changing this mid-game may break the game", null, undefined, () => {
    if (getSetting("counterCheats")) {
      antibotData.methods.kahootAlert("Changes may only take effect upon reload.");
    } else {
      // disable anti-cheat
      const q = antibotData.kahootInternals.globalQuizData.questions;
      if(q[q.length - 1].isAntibotQuestion){
        q.splice(-1,1);
        delete antibotData.kahootInternals.kahootCore.game.navigation.questionIndexMap[q.length];
      }
    }
  })}
${createSetting("Enable CAPTCHA", "checkbox", "enableCAPTCHA", "Adds a 30 second poll at the start of the quiz. If players don't answer it correctly, they get banned. Changing this mid-game may break the game", null, undefined, () => {
    if (getSetting("enableCAPTCHA")) {
      antibotData.methods.kahootAlert("Changes may only take effect upon reload.");
    } else {
      // disable captcha
      const q = antibotData.kahootInternals.globalQuizData.questions;
      if(q[0].isAntibotQuestion){
        q.splice(0,1);
        delete antibotData.kahootInternals.kahootCore.game.navigation.questionIndexMap[q.length];
      }
    }
  })}
      </div>
    </details>
  </div>
  <style>
    #antibotwtr {
      position: fixed;
      bottom: 100px;
      right: 100px;
      font-size: 1rem;
      opacity: 0.4;
      transition: opacity 0.4s;
      z-index: 5000;
      background: white;
      text-align: center;
      border-radius: 0.5rem;
    }
    #antibotwtr summary {
      text-align: left;
    }
    #antibotwtr:hover {
      opacity: 1;
    }
    #antibotwtr p {
      display: inline-block;
    }
    #antibotwtr p:first-child {
      font-weight: 600;
    }
    #antibot-killcount {
      margin-left: 0.25rem;
      background: black;
      border-radius: 0.5rem;
      color: white;
    }
    #antibotwtr details {
      background: grey;
    }
    #antibotwtr input[type="checkbox"] {
      display: none;
    }
    #antibotwtr label {
      color: black;
      font-weight: 600;
      display: block;
      background: #c60929;
      border-radius: 0.5rem;
      height: 100%;
      word-break: break-word;
    }
    #antibotwtr .antibot-input {
      height: calc(100% - 1.5rem);
      background: #864cbf;
      color: white;
    }
    #antibotwtr input,textarea {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 1rem;
      border-radius: 0.25rem;
      border: solid 1px black;
      font-family: "Montserrat", sans-serif;
      resize: none;
    }
    #antibotwtr input:checked+label {
      background: #26890c;
    }
    #antibot-settings {
      display: flex;
      flex-wrap: wrap;
      max-width: 25rem;
      max-height: 24rem;
      overflow: auto;
    }
    #antibot-settings > div {
      flex: 1;
      max-width: 33%;
      min-width: 33%;
      min-height: 6rem;
      box-sizing: border-box;
      position: relative;
      border: solid 0.5rem transparent;
    }
    #antibot-counters {
      position: absolute;
      right: 10rem;
      top: 11rem;
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
      pointer-events: none;
    }
    #antibot-counters div {
      background: rgba(0,0,0,0.5);
      padding: 0.5rem;
      border-radius: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .antibot-count-num {
      display: block;
      text-align: center;
    }
    .antibot-count-desc {
      text-align: center;
      font-size: 1.25rem;
      display: block;
    }
    .antibot-textarea {
      position: fixed;
      width: 40rem;
      height: 30rem;
      margin: auto;
      left: 0;
      top: 0;
      margin-left: calc(50% - 20rem);
      z-index: 1;
      font-size: 1.5rem;
      font-weight: bold;
    }
  </style>`;
  document.body.append(UITemplate.content.cloneNode(true));

  function getSetting(id, def) {
    const elem = document.querySelector(`#antibot.config.${id}`);
    if (elem.value === "") {
      return def;
    } else {
      return elem.type === "checkbox" ? elem.checked : elem.nodeName === "TEXTAREA" ? elem.value.split("\n") : elem.value;
    }
  }

  function setSetting(id, value) {
    const elem = document.querySelector(`#antibot.config.${id}`);
    if (elem.type === "checkbox") {
      value = !!value;
      elem.checked = value;
    } else if (Array.isArray(value)) {
      value = value.join("\n");
      elem.value = value;
    } else {
      value = `${value}`;
      elem.value = value;
    }
    const localConfig = JSON.parse(windw.localStorage.antibotConfig || "{}");
    localConfig[id] = value;
    windw.localStorage.antibotConfig = JSON.stringify(localConfig);
  }

  function websocketMessageHandler(socket, message) {}

  function extraQuestionSetup(quiz) {
    if (getSetting("counterCheats")) {
      quiz.questions.push({
        question:"[ANTIBOT] - This poll is for countering Kahoot cheating sites.",
        time:5000,
        type:"survey",
        isAntibotQuestion:true,
        choices:[{answer:"OK",correct:true}]
      });
    }
    if (getSetting("enableCAPTCHA")) {
      const answers = ["red","blue","yellow","green"],
        images = [
          "361bdde0-48cd-4a92-ae9f-486263ba8529", // red
          "9237bdd2-f281-4f04-b4e5-255e9055a194", // blue
          "d25c9d13-4147-4056-a722-e2a13fbb4af9", // yellow
          "2aca62f2-ead5-4197-9c63-34da0400703a" // green
        ],
        imageIndex = Math.floor(Math.random() * answers.length);
      quiz.questions.splice(0,0,{
        question: `[ANTIBOT] - CAPTCHA: Please select ${answers[imageIndex]}`,
        time: 30000,
        type: "quiz",
        isAntibotQuestion: true,
        AntibotCaptchaCorrectIndex: imageIndex,
        choices:[{answer:"OK"},{answer:"OK"},{answer:"OK"},{answer:"OK"}],
        image: "https://media.kahoot.it/" + images[imageIndex],
        imageMetadata: {
          width: 512,
          height: 512,
          id: images[imageIndex],
          contentType: "image/png",
          resources: ""
        },
        points: false
      });
    }
  }

  function kahootAlert(notice) {
    // specialData.globalFuncs.showNotificationBar("error" or "notice", {defaultMessage: "the notice message", id:"antibot.notice"}, time (s), center (true/false, centers text), values (??), upsellhandler (?? function));
    try {
      antibotData.kahootInternals.globalFuncs.showNotificationBar("error", {defaultMessage:notice, id:"antibot.notice"}, 3);
    }catch(err) {
      // fall back to alert
      alert(notice);
    }
  }

  const killCountElement = document.querySelector("#antibot-killcount"),
    antibotData = windw.antibotData = {
      isUsingNamerator: false,
      methods: {
        websocketMessageHandler,
        extraQuestionSetup,
        kahootAlert
      },
      settings: {},
      runtimeData: {},
      kahootInternals: {}
    },
    localConfig = JSON.parse(windw.localStorage.antibotConfig || "{}");
  for (const setting in localConfig) {
    try {
      const current = getSetting(setting);
      if (current != localConfig[setting]) {
        setSetting(setting, localConfig[setting]);
      }
    } catch(err) {/* ignored */}
  }

  // remove local storage functions, run external scripts
  delete localStorage.kahootThemeScript;
  delete localStorage.extraCheck;
  delete localStorage.extraCheck2;

  for(let i = 0; i < windw.antibotAdditionalScripts.length; i++){
    try{
      Function("return (" + windw.antibotAdditionalScripts[i].toString() + ")();")();
    }catch(err){
      console.error(err);
    }
  }
};

(async () => {
  console.log("[ANTIBOT - loading]");
  const {page, vendorsScriptURL, mainScriptURL} = await fetchMainPage(),
    patchedVendorsScript = await fetchVendorsScript(vendorsScriptURL),
    patchedMainScript = await fetchMainScript(mainScriptURL),
    externalScripts = await Promise.all(requiredAssets.map((assetURL) => makeHttpRequest(assetURL).catch(() => ""))).then(data => data.map((result) => `<script>${result.response}</script>`).join(""));
  let completePage = page.split("</body>");
  completePage = `${completePage[0]}
  <script>${patchedVendorsScript}</script>
  <script>${patchedMainScript}</script>
  <script>
    try {
      (${window.localStorage.kahootThemeScript})();
    } catch(err) {}
    try {
      (${window.localStorage.extraCheck})();
    } catch(err) {}
    window.parent.fireLoaded = window.fireLoaded = true;
    (${kantibotProgramCode.toString()})();
  </script>
  ${externalScripts}
  <script>
    window.parent.aSetOfEnglishWords = window.aSetOfEnglishWords;
    window.parent.randomName = window.randomName;
  </script>`;
  console.log("[ANTIBOT] - loaded");
  document.open();
  document.write(`<style>
    body {
      margin: 0;
    }
    iframe {
      border: 0;
      width: 100%;
      height: 100%;
    }
  </style>
  <iframe src="about:blank"></iframe>`);
  document.close();
  window.stop();
  const doc = document.querySelector("iframe");
  doc.contentDocument.write(completePage);
  document.title = doc.contentDocument.title;
})();
