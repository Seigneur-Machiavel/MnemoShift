if (false) { // THIS IS FOR DEV ONLY ( to get better code completion )
	const anime = require("./anime.min.js");
	const bip39 = require("./bip39-3.1.0.js");
	const { MnemoLinker } = require("./MnemoLinker/MnemoLinker_v0.1.js");
	const { cryptoLight } = require("./cryptoLight.js");
	const { lockCircleObject, centerScreenBtnObject, mnemonicClass, userDataClass, tempDataClass, mnemoBubbleObject, svgLinkObject, mnemoLinkSVGObject, gameControllerClass } = require("./classes.js");
	const { gamesInfoByCategory, GameInfoClass, CategoryInfoClass } = require("../games/gamesinfo.js");
}
document.addEventListener('DOMContentLoaded', function() {
	chrome.runtime.sendMessage({action: "getPassword"}, function(response) {
		if (response && response.password) {
			//console.log(`Password received: ${JSON.stringify(response.password)}`)
			chrome.storage.local.get(['hashedPassword'], async function(result) {
				const { hash, saltBase64, ivBase64 } = sanitize(result.hashedPassword);
				if (!hash || !saltBase64 || !ivBase64) { alert('Password data corrupted'); return; }
				if (typeof hash !== 'string' || typeof saltBase64 !== 'string' || typeof ivBase64 !== 'string') { alert('Password data corrupted'); return; }
				
				const res = await cryptoLight.init(response.password, saltBase64, ivBase64);
				if (res.hash !== hash) { 
					console.info('Wrong password, requesting authentication');
					openModal('authentification');
					return;
				}
				console.log('Valid password, Ready to decrypt!'); 
				await asyncInitLoad(true);
			});
		} else {
			console.log('No password received, authentication required');
			//openModal('authentification');
		}
	});
});

//#region - VARIABLES
/** @type {MnemoLinker} */
let MnemoLinkerLastest = null; // FOR FAST ACCESS TO THE LATEST VERSION (need to be use as : new MnemoLinkerLastest()
/** @type {MnemoLinker} */
let emptyMnemoLinker = null; // ONLY USED FOR BASIC USAGE, NEVER USE THIS GLOBAL VARIABLE FOR CRYPTOGRAPHY !!

const settings = {
	mnemoLinkerVersion: window.MnemoLinker.latestVersion,
	defaultBip: "BIP-0039",
	defaultLanguage: "english",
	nbOfWordsToCheck: 3,
	delayBeetweenChar: 10,
	fastFillMode: true,
	saveLogs: true,
	mnemolinkBubblesMinCircleSpots: 6,
	serverUrl: "https://www.linkvault.app" // "http://localhost:4340",
}
const mousePos = { x: 0, y: 0 };
const timeOuts = {};
/** @type {mnemoBubbleObject[]} */
let mnemoBubblesObj = [];
/** @type {mnemoLinkSVGObject[]} */
let mnemoLinkSVGsObj = [];
const centerScreenBtn = new centerScreenBtnObject();
const userData = new userDataClass();
const gameController = new gameControllerClass();
const tempData = new tempDataClass();
const eHTML = {
	toggleDarkModeButton: document.getElementById('dark-mode-toggle'),
	footerVersion: document.getElementById('footerVersion'),
	dashboard: {
		element: document.getElementById('dashboard'),
		dashboardMnemolinksList: document.getElementById('dashboardMnemolinksList'),
		mnemolinksList: document.getElementById('mnemolinksList'),
	},
	inVaultWrap: document.getElementById('inVaultWrap'),
	vault: {
		element: document.getElementById('vault'),
		mnemolinksBubblesContainer: document.getElementById('mnemolinksBubblesContainer'),
		linksWrap: document.getElementById('mnemolinksBubblesContainer').children[0],
		bubblesWrap: document.getElementById('mnemolinksBubblesContainer').children[1],
	},
	games: {
		element: document.getElementById('games'),
		gamesCategoryToolTip: document.getElementById('gamesCategoryToolTip'),
		ScribeQuest: {
			sheet: document.getElementsByClassName('categorySheet')[0],
			sheetBackground: document.getElementsByClassName('sheetBackground')[0],
			sheetBtn: document.getElementsByClassName('categoryBtn')[0],
			gamesList: document.getElementsByClassName('gamesList')[0],
		},
		CipherCircuit: {
			sheet: document.getElementsByClassName('categorySheet')[1],
			sheetBackground: document.getElementsByClassName('sheetBackground')[1],
			sheetBtn: document.getElementsByClassName('categoryBtn')[1],
			gamesList: document.getElementsByClassName('gamesList')[1],
		},
		ByteBard: {
			sheet: document.getElementsByClassName('categorySheet')[2],
			sheetBackground: document.getElementsByClassName('sheetBackground')[2],
			sheetBtn: document.getElementsByClassName('categoryBtn')[2],
			gamesList: document.getElementsByClassName('gamesList')[2],
		},
	},
	gameContainer: document.getElementById('game'),
	modals: {
		wrap: document.getElementsByClassName('modalsWrap')[0],
		authentification: {
			wrap : document.getElementById('authentificationModalWrap'),
			modal: document.getElementById('authentificationModalWrap').getElementsByClassName('modal')[0],
			loginForm: document.getElementById('loginForm'),
			input: document.getElementById('authentificationModalWrap').getElementsByTagName('input')[0],
			button: document.getElementById('authentificationModalWrap').getElementsByTagName('button')[0],
		},
		confirmation: {
			wrap : document.getElementById('confirmChoiceModalWrap'),
			modal: document.getElementById('confirmChoiceModalWrap').getElementsByClassName('modal')[0],
			text: document.getElementById('confirmChoiceModalWrap').getElementsByClassName('modalText')[0],
			yesButton: document.getElementById('confirmChoiceModalWrap').getElementsByClassName('modalButton')[0],
			noButton: document.getElementById('confirmChoiceModalWrap').getElementsByClassName('modalButton')[1],
		},
		inputMasterMnemonic: {
			wrap : document.getElementById('masterMnemonicModalWrap'),
			element: document.getElementById('masterMnemonicModalWrap').getElementsByClassName('modal')[0],
			seedWordsValueStr: document.getElementById('masterMnemonicModalWrap').getElementsByClassName('seedWordsValueStr')[0],
			seedWordsRange: document.getElementById('masterMnemonicModalWrap').getElementsByClassName('seedWordsRangeWrap')[0].getElementsByTagName('input')[0],
			/*bipList : document.getElementById('masterMnemonicModalWrap').getElementsByClassName('optionsList')[0],
			languageList : document.getElementById('masterMnemonicModalWrap').getElementsByClassName('optionsList')[1],*/
			previousLanguageBtn : document.getElementById('masterMnemonicModalWrap').getElementsByClassName('arrowButton')[0],
			randomizeBtn : document.getElementById('masterMnemonicModalWrap').getElementsByClassName('languageSelectionBtn')[0],
			nextLanguageBtn : document.getElementById('masterMnemonicModalWrap').getElementsByClassName('arrowButton')[1],
			mnemonicGrid : document.getElementById('masterMnemonicModalWrap').getElementsByClassName('mnemonicGrid')[0],
			mnemonicGridInputs : document.getElementById('masterMnemonicModalWrap').getElementsByClassName('mnemonicGrid')[0].querySelectorAll('input'),
			scoreBarFill : document.getElementById('masterMnemonicModalWrap').getElementsByClassName('scoreBarFill')[0],
			scoreLabel : document.getElementById('masterMnemonicModalWrap').getElementsByClassName('scoreBarWrap')[0].getElementsByClassName('scoreLabelSpan')[0],
			copyMnemonicBtn : document.getElementById('masterMnemonicModalWrap').getElementsByClassName('modalButton')[0],
			downloadMnemonicBtn : document.getElementById('masterMnemonicModalWrap').getElementsByClassName('modalButton')[1],
			confirmBtn : document.getElementById('masterMnemonicModalWrap').getElementsByClassName('modalButton')[2],
			bottomInfo : document.getElementById('masterMnemonicModalWrap').getElementsByClassName('bottomInfo')[0]
		},
		inputMnemonic: {
			wrap : document.getElementById('mnemonicModalWrap'),
			element: document.getElementById('mnemonicModalWrap').getElementsByClassName('modal')[0],
			seedWordsValueStr: document.getElementById('mnemonicModalWrap').getElementsByClassName('seedWordsValueStr')[0],
			seedWordsRange: document.getElementById('mnemonicModalWrap').getElementsByClassName('seedWordsRangeWrap')[0].getElementsByTagName('input')[0],
			previousLanguageBtn : document.getElementById('mnemonicModalWrap').getElementsByClassName('arrowButton')[0],
			randomizeBtn : document.getElementById('mnemonicModalWrap').getElementsByClassName('languageSelectionBtn')[0],
			nextLanguageBtn : document.getElementById('mnemonicModalWrap').getElementsByClassName('arrowButton')[1],
			mnemonicGrid : document.getElementById('mnemonicModalWrap').getElementsByClassName('mnemonicGrid')[0],
			mnemonicGridInputs : document.getElementById('mnemonicModalWrap').getElementsByClassName('mnemonicGrid')[0].querySelectorAll('input'),
			copyMnemonicBtn : document.getElementById('mnemonicModalWrap').getElementsByClassName('modalButton')[0],
			downloadMnemonicBtn : document.getElementById('mnemonicModalWrap').getElementsByClassName('modalButton')[1],
			confirmBtn : document.getElementById('mnemonicModalWrap').getElementsByClassName('modalButton')[2],
			bottomInfo : document.getElementById('mnemonicModalWrap').getElementsByClassName('bottomInfo')[0]
		},
	}
}
eHTML.footerVersion.innerText = "v" + window.MnemoLinker.latestVersion;
//#endregion
const hardcodedPassword = ''; // '123456'; // should be "" in production
eHTML.modals.authentification.input.value = hardcodedPassword;

//#region - STORAGE FUNCTIONS
const save = {
	logs: settings.saveLogs,
	async all() {
		const saveFunctions = Object.keys(save).filter((key) => key !== "all" && key !== "logs");
		for (let i = 0; i < saveFunctions.length; i++) {
			const functionName = saveFunctions[i];
			await save[functionName](); // can be promises all, but actually fast.
		}
	},
	async userId() {
		const userId = userData.id;
		await this.storeDataLocally('id', userId, save.logs);
	},
	async userEncryptedMnemonicsStr() {
		const masterMnemonicStr = userData.encryptedMasterMnemonicsStr;
		await this.storeDataLocally('encryptedMasterMnemonicsStr', masterMnemonicStr, save.logs);
	},
	async userMnemoLinks() {
		const data = userData.encryptedMnemoLinksStr;
		await this.storeDataLocally('encryptedMnemoLinksStr', data, save.logs);
	},
	async userPreferences() {
		const data = userData.preferences;
		await this.storeDataLocally('preferences', data, save.logs);
	},
	async storeDataLocally(key = "toto", data, logs = false) {
		try {
			//const result = await chrome.storage.local.set({ [key]: data });
			//console.log(result);
			await chrome.storage.local.set({ [key]: data });
			if (logs) { console.log(`${key} stored, data: ${JSON.stringify(data)}`); }
		} catch (error) {
			if (logs) { console.error(`Error while storing ${key}, data: ${data}`); }
		}
	}
}
const load = {
	logs: true,
	async all() {
		console.log('Loading all data...');
		const loadFunctions = Object.keys(load).filter((key) => key !== "all" && key !== "logs");
		for (let i = 0; i < loadFunctions.length; i++) {
			const functionName = loadFunctions[i];
			await load[functionName](); // can be promises all, but actually fast.
		}
	},
	async userId() {
		const data = await this.getDataLocally('id')
		const logMsg = !data ? 'No id found !' : 'id loaded !';
		if (load.logs) { console.log(logMsg); }
		if (!data) { return; }

		userData.id = data;
	},
	async userEncryptedMnemonicsStr() {
		const data = await this.getDataLocally('encryptedMasterMnemonicsStr')
		const logMsg = !data ? 'No encryptedMasterMnemonicsStr found !' : 'encryptedMasterMnemonicsStr loaded !';
		if (load.logs) { console.log(logMsg); }
		if (!data) { return; }

		userData.encryptedMasterMnemonicsStr = data;
	},
	async userMnemoLinks() {
		const data = await this.getDataLocally('encryptedMnemoLinksStr')
		const logMsg = !data ? 'No encryptedMnemoLinksStr found !' : 'encryptedMnemoLinksStr loaded !';
		if (load.logs) { console.log(logMsg); }
		if (!data) { return; }

		userData.encryptedMnemoLinksStr = data;
	},
	async userPreferences() {
		const data = await this.getDataLocally('preferences')
		const logMsg = !data ? 'No preferences found !' : 'Preferences loaded !';
		if (load.logs) { console.log(logMsg); }
		if (!data) { return; }

		userData.preferences = data;
	},
	async getDataLocally(key = "toto") {
		const fromStorage = await chrome.storage.local.get([key]);
		const sanitizedData = sanitize(fromStorage[key]);
		if (!sanitizedData) { return false; }
		return sanitizedData;
	}
}
function sanitize(data) {
    if (!data) return false;
	if (typeof data === 'number' || typeof data === 'boolean') return data;
    if (!typeof data === 'string' || !typeof data === 'object') return 'Invalid data type';

    if (typeof data === 'string') {
        //return data.replace(/[^a-zA-Z0-9]/g, '');
        // accept all base64 characters
        return data.replace(/[^a-zA-Z0-9+/=]/g, '');
    } else if (typeof data === 'object') {
        const sanitized = {};
        for (const key in data) {
			const sanitazedValue = sanitize(data[key]);
            sanitized[sanitize(key)] = sanitazedValue;
        }
        return sanitized;
    }
    return data;
}
//#endregion

//#region - PRELOAD FUNCTIONS
async function loadMnemoLinkerLatestVersion() {
	MnemoLinkerLastest = await window.MnemoLinker["v" + window.MnemoLinker.latestVersion];
	emptyMnemoLinker = new MnemoLinkerLastest();
}; loadMnemoLinkerLatestVersion();
(async () => {
	await load.all();
	if (userData.preferences.darkMode) { eHTML.toggleDarkModeButton.checked = true; toggleDarkMode(eHTML.toggleDarkModeButton); }
	if (!userData.isMasterMnemonicFilled()) { centerScreenBtn.state = 'welcome'; }
	centerScreenBtn.init(7);
	fillGamesLists();
})();
function toggleDarkMode(element) {
	if (element.checked) {
		document.body.classList.add('dark-mode');
		eHTML.dashboard.element.classList.add('invertColors');
		eHTML.modals.wrap.classList.add('invertColors');
		//eHTML.vault.linksWrap.classList.add('invertColors');
		centerScreenBtn.element.classList.add('invertColors');
	} else {
		document.body.classList.remove('dark-mode');
		eHTML.dashboard.element.classList.remove('invertColors');
		eHTML.modals.wrap.classList.remove('invertColors');
		//eHTML.vault.linksWrap.classList.remove('invertColors');
		centerScreenBtn.element.classList.remove('invertColors');
	}

	userData.preferences.darkMode = element.checked;
	save.userPreferences();
}
function fillGamesLists() {
	const gamesCategories = Object.keys(gamesInfoByCategory);
	for (let i = 0; i < gamesCategories.length; i++) {
		const category = gamesCategories[i];

		/** @type {CategoryInfoClass} */
		const categoryInfo = gamesInfoByCategory[category];
		eHTML.games[category].sheetBackground.innerText = categoryInfo.sheetBackground;

		for (let i = 0; i < Object.keys(categoryInfo.games).length; i++) {
			const gameInfo = categoryInfo.games[Object.keys(categoryInfo.games)[i]];
			const gameSheet = createGameSheetElement(category, gameInfo.folderName, gameInfo.title, gameInfo.description);
			eHTML.games[category].gamesList.appendChild(gameSheet);
		}
	}
};
//#endregion

//#region - WELCOME ANIMATIONS
const textWrapper = document.querySelector('.ml3');
textWrapper.innerHTML = textWrapper.textContent.replace(/\S/g, "<span class='letter'>$&</span>");
const titleAnimationDuration = {A: 800, B: 1000, C: 1400};
setTimeout(() => { document.getElementById('appTitleBackground').style.opacity = 1; }, titleAnimationDuration.A / 2);
document.getElementById('appTitle').classList.remove('hidden');
anime.timeline({loop: false})
  .add({
    targets: '.ml3 .letter',
    opacity: [0,1],
	easing: 'easeOutElastic(1.4, .8)',
    duration: titleAnimationDuration.B,
    delay: (el, i) => titleAnimationDuration.A / 10 * (i+1)
  });
setTimeout(async () => {
	//document.getElementById('appTitleWrap').classList.add('topScreen');
	document.getElementById('appTitle').getElementsByClassName('titleSufix')[0].classList.add('visible');
}, titleAnimationDuration.C);
//#endregion

//#region - FUNCTIONS
async function asyncInitLoad(logs = false) {
	fillMnemoLinkList();
	initMnemoLinkBubbles();
	requestAnimationFrame(UXupdateLoop);
	if (logs) { console.log('Ready to decrypt!'); }
	return true;
};
function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1) + min); }
function cryptoRnd(min, max) {
	const crypto = window.crypto;
	const randomBuffer = new Uint32Array(1);

	crypto.getRandomValues(randomBuffer);
	const randomValue = randomBuffer[0] / (0xffffffff + 1);

	return Math.floor(randomValue * (max - min + 1) + min);
}
async function randomizeMnemonic(modal = eHTML.modals.inputMasterMnemonic, asPlaceholder = false) {
	const mnemonic = [];
	const bip = "BIP-0039";
	const language = modal.randomizeBtn.classList[1];
	const wordsList = emptyMnemoLinker.getWordsTable(bip, language);
	if (!wordsList) { return; }

	modal.mnemonicGrid.classList.add('busy');

	const mnemonicGridInputs = modal.mnemonicGridInputs;
	mnemonicGridInputs.forEach((input) => { input.value = ""; input.placeholder = "";  });

	for (let i = 0; i < mnemonicGridInputs.length; i++) {
		const input = mnemonicGridInputs[i];
		if (input.parentElement.classList.contains('hidden')) { break; }
		const rndWord = getRandomWord(wordsList);
		mnemonic.push(rndWord);
		input.classList.add('random');

		for (let j = 0; j < rndWord.length; j++) { // simple typing animation
			input.placeholder += rndWord.charAt(j);
			if (!asPlaceholder) { input.value += rndWord.charAt(j); };
			const delay = settings.delayBeetweenChar;
			const timeOutRnd = rnd(0, delay);
			await new Promise(r => setTimeout(r, timeOutRnd));
		}
	};

	tempData.init();
	tempData.rndMnemonic = mnemonic;
	modal.mnemonicGrid.classList.remove('busy');
}
function getRandomWord(wordsList = []) {
	const wordsListLength = wordsList.length;
	if (wordsListLength === 0) { return; }

	const rnd = cryptoRnd(0, wordsListLength - 1);
	return wordsList[rnd];
}
function actualizeScore() {
	const mnemonicGridInputs = eHTML.modals.inputMasterMnemonic.mnemonicGridInputs;
	let nbOfRandomWords = 0;
	let nbOfWords = 0;
	for (let i = 0; i < mnemonicGridInputs.length; i++) {
		const input = mnemonicGridInputs[i];
		if (mnemonicGridInputs[i].value === "") { continue; }
		nbOfWords++;
		
		if (input.classList.contains('random')) { nbOfRandomWords++; }
	}
	if (nbOfWords === 0) { return; }
	
	// score will decrease more and more for each word choosen by the user
	const numberOfWordsInTheList = 2048;
	const maxEntropy = nbOfWords * Math.log2(numberOfWordsInTheList);
	const currentEntropy = nbOfRandomWords * Math.log2(numberOfWordsInTheList);
	const score = (currentEntropy / maxEntropy) * 100;
	
	// use of "random word" buttons will slightly decrease the score
	const rndButtonsPressed = tempData.rndButtonsPressed;
	const scoreDecrease = Math.pow(rndButtonsPressed, 2) / (nbOfWords * 1000);
	const finalScore = score - scoreDecrease < 0 ? 0 : score - scoreDecrease;

	setScoreUI(finalScore);
}
function isWordInWordsList(word, bip, language) {
	const wordsList = emptyMnemoLinker.getWordsTable(bip, language);
	if (!wordsList) { return false; }

	return wordsList.includes(word);
}
function getInputIndex(input) {
	const masterMnemonicGridInputs = eHTML.modals.inputMasterMnemonic.mnemonicGridInputs;
	for (let i = 0; i < masterMnemonicGridInputs.length; i++) {
		if (masterMnemonicGridInputs[i] === input) { return i; }
	}

	const mnemonicGridInputs = eHTML.modals.inputMnemonic.mnemonicGridInputs;
	for (let i = 0; i < mnemonicGridInputs.length; i++) {
		if (mnemonicGridInputs[i] === input) { return i; }
	}

	return -1;
}
function focusNextInput(inputElement) {
	const mnemonicGrid = inputElement.parentElement.parentElement;
	const mnemonicGridInputs = mnemonicGrid.querySelectorAll('input');
	for (let i = 0; i < mnemonicGridInputs.length; i++) {
		const input = mnemonicGridInputs[i];
		if (input === inputElement) {
			const nextInput = mnemonicGridInputs[i + 1];
			if (nextInput) { nextInput.focus(); }
			break;
		}
	}
	return;
}
function extractMnemonicFromInputs(modal = eHTML.modals.inputMasterMnemonic) {
	const mnemonicGridInputs = modal.mnemonicGridInputs;
	const bip = "BIP-0039";
	const language = modal.randomizeBtn.classList[1];
	const wordsList = emptyMnemoLinker.getWordsTable(bip, language);
	if (!wordsList) { return; }

	const result = { allWordsAreValid: true, mnemonic: new mnemonicClass() };
	const mnemonic = [];
	for (let i = 0; i < mnemonicGridInputs.length; i++) {
		const input = mnemonicGridInputs[i];
		if (input.parentElement.classList.contains('hidden')) { continue; }

		mnemonic.push(input.value);
	};

	// check if all words are included in the words list
	for (let i = 0; i < mnemonic.length; i++) {
		if (!wordsList.includes(mnemonic[i])) { result.allWordsAreValid = false; break; }
	}

	result.mnemonic = new mnemonicClass(mnemonic, bip, language);

	return result;
}
async function centerScreenBtnAction() {
	if (!cryptoLight.key) {
		openModal('authentification');
		return;
	}

	if (!userData.isMasterMnemonicFilled()) {
		openModal('inputMasterMnemonic');
		
		await randomizeMnemonic(eHTML.modals.inputMasterMnemonic, true);
		eHTML.modals.inputMasterMnemonic.mnemonicGridInputs[0].focus();
		return;
	}

	// if master mnemonic is already filled - and password is correct
	toggleDashboard();
}
function downloadStringAsFile(string, filename) {
	const blob = new Blob([string], { type: "text/plain" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	setTimeout(() => {
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}, 0);
}
//#endregion

//#region - UX FUNCTIONS
async function toggleDashboard() {
	const dashboard = eHTML.dashboard.element;
	const appTitleWrap = document.getElementById('appTitleWrap');

	const isClose = !dashboard.classList.contains('open');
	if (isClose) {
		clearTimeout(timeOuts["appTitleWrapVisible"]); // cancel the timeout to show the app title
		
		await centerScreenBtn.unlock();
		dashboard.classList.add('open');
		appTitleWrap.classList.remove('visible');
		
		//initMnemoLinkBubbles();
		eHTML.vault.mnemolinksBubblesContainer.classList.add('visible');
		mnemoBubblesObj.forEach((bubble) => { bubble.stopShowing(false); });
	} else {
		timeOuts["appTitleWrapVisible"] = setTimeout(() => { 
			appTitleWrap.classList.add('visible'); 
			centerScreenBtn.lock();
		}, 800);
		
		dashboard.classList.remove('open');
		mnemoBubblesObj.forEach((bubble) => { bubble.toCenterContainer(480); });
		eHTML.vault.mnemolinksBubblesContainer.classList.remove('visible');
	}
}
function prepareConfirmationModal(text = "Are you sure?", yesCallback = () => {}, noCallback = () => { closeModal(); }) {
	const modal = eHTML.modals.confirmation;
	modal.text.innerText = text;
	modal.yesButton.onclick = yesCallback;
	modal.noButton.onclick = noCallback;
}
function openModal(modalName = '') {
	const modals = eHTML.modals;
	if (!modals.wrap.classList.contains('fold')) { return; }
	modals.wrap.classList.remove('hidden');
	modals.wrap.classList.remove('fold');

	for (let modalKey in modals) {
		if (modalKey === 'wrap') { continue; }
		const modalWrap = modals[modalKey].wrap;
		modalWrap.classList.add('hidden');
		if (modalKey === modalName) { modalWrap.classList.remove('hidden'); }
	}

	const modalsWrap = eHTML.modals.wrap;
	modalsWrap.style.transform = 'scaleX(0) scaleY(0) skewX(0deg)';
	modalsWrap.style.opacity = 0;
	modalsWrap.style.clipPath = 'circle(6% at 50% 50%)';

	anime({
		targets: modalsWrap,
		//skewX: '1.2deg',
		scaleX: 1,
		scaleY: 1,
		opacity: 1,
		duration: 600,
		easing: 'easeOutQuad',
		complete: () => {
			if (modalName === 'inputMasterMnemonic' || modalName === 'inputMnemonic') {
				eHTML.modals[modalName].mnemonicGridInputs[0].focus();
			}
		}
	});
	anime({
		targets: modalsWrap,
		clipPath: 'circle(100% at 50% 50%)',
		delay: 200,
		duration: 800,
		easing: 'easeOutQuad',
	});
}
function closeModal() {
	// clear inputs
	initMnemonicInputs(eHTML.modals.inputMasterMnemonic.mnemonicGridInputs);
	initMnemonicInputs(eHTML.modals.inputMnemonic.mnemonicGridInputs);
	switchBtnsIfMnemonicGridIsFilled('masterMnemonicModalWrap');
	switchBtnsIfMnemonicGridIsFilled('mnemonicModalWrap');

	const modalsWrap = eHTML.modals.wrap;
	if (modalsWrap.classList.contains('fold')) { return false; }
	modalsWrap.classList.add('fold');

	anime({
		targets: modalsWrap,
		clipPath: 'circle(6% at 50% 50%)',
		duration: 600,
		easing: 'easeOutQuad',
	});
	anime({
		targets: modalsWrap,
		scaleX: 0,
		scaleY: 0,
		opacity: 0,
		duration: 800,
		easing: 'easeOutQuad',
		complete: () => {
			if (!modalsWrap.classList.contains('fold')) { return; }

			modalsWrap.classList.add('hidden');
			const modals = eHTML.modals;
			for (let modalKey in modals) {
				if (modalKey === 'wrap') { continue; }
				const modalWrap = modals[modalKey].wrap;
				modalWrap.classList.add('hidden');
			}
		}
	});
}
function setScoreUI (score = 100) {
	const modal = eHTML.modals.inputMasterMnemonic;
	modal.scoreBarFill.style.width = `${Math.round(score)}%`;
	modal.scoreLabel.innerText = `${score.toFixed(2)}%`;

	// glitch / checking effect
	modal.scoreBarFill.classList.add('glitch');
	setTimeout(() => { modal.scoreBarFill.classList.remove('glitch'); }, 500);
}
function setModalBottomButtonsState(modal = eHTML.modals.inputMasterMnemonic, ready = false) {
	const confirmBtn = modal.confirmBtn;
	const copyBtn = modal.copyMnemonicBtn;
	const downloadBtn = modal.downloadMnemonicBtn;

	if (!ready) {
		confirmBtn.classList.add('disabled');
		copyBtn.classList.add('crushed');
		downloadBtn.classList.add('crushed');
	} else {
		confirmBtn.classList.remove('disabled');
		copyBtn.classList.remove('crushed');
		downloadBtn.classList.remove('crushed');
	}
}
function initMnemonicInputs(wrapInputsElmnts, readOnly = false) {
	//console.log(`initMnemonicInputs: ${wrapInputsElmnts.length}`);
	wrapInputsElmnts.forEach((input) => {
		input.value = "";
		input.readOnly = readOnly;
		input.placeholder = "";
		input.classList.remove('valid');
		input.classList.add('random');
		input.classList.add('disabled');
	});
}
function setNumberOfVisibleWordsInMnemonicGrid(mnemonicGridInputs, nbOfWords = 12) {
	for (let i = 0; i < mnemonicGridInputs.length; i++) {
		const input = mnemonicGridInputs[i];
		if (i < nbOfWords) {
			input.parentElement.classList.remove('hidden');
		} else {
			input.parentElement.classList.add('hidden');
		}
	}
}
function switchBtnsIfMnemonicGridIsFilled(modalWrapID = "masterMnemonicModalWrap") {
	const modals = Object.keys(eHTML.modals);
	let modal = null;
	for (let i = 0; i < modals.length; i++) {
		if (!eHTML.modals[modals[i]]) { continue; }
		if (!eHTML.modals[modals[i]].wrap) { continue; }
		if (eHTML.modals[modals[i]].wrap.id === modalWrapID) { modal = eHTML.modals[modals[i]]; break; }
	}
	if (!modal) {
		console.error('switchBtnsIfMnemonicGridIsFilled: modal not found');
		return { allWordsAreValid: false, mnemonic: new mnemonicClass() };
	}

	const extracted = extractMnemonicFromInputs(modal)
	if (!extracted.allWordsAreValid) {
		setModalBottomButtonsState(modal, false);
		return extracted;
	}

	setModalBottomButtonsState(modal, true);
	return extracted;
}
function deleteExistingSuggestionsHTML() {
	const suggestionsHTMLs = document.getElementsByClassName('suggestions');
	while (suggestionsHTMLs.length > 0) {
		suggestionsHTMLs[0].remove();
	}
}
function modalInfo(modal = eHTML.modals.inputMasterMnemonic, text, timeout = 5000) {
	// reset bottom info
	const infoElmnt = modal.bottomInfo;

	infoElmnt.innerText = text;

	setTimeout(() => {
		infoElmnt.innerText = "";
	}, timeout);
}
function createMnemoLinkElement(label = 'key1') {
	const newMnemoLink = document.createElement('div');
	newMnemoLink.classList.add('mnemolink');
	newMnemoLink.innerHTML = `
		<div class="leftDecoration"></div>
		<div class="showBtn"></div>
		<div class="editBtn"></div>
		<input class="mnemolinkInput" value="${label}" defaultValue="${label}" readonly></input>
	`;

	return newMnemoLink;
}
function fillMnemoLinkList() {
	eHTML.dashboard.mnemolinksList.innerHTML = ''

	const monemoLinksLabels = userData.getListOfMnemoLinks();
	for (let i = 0; i < monemoLinksLabels.length; i++) {
		const label = monemoLinksLabels[i];
		const element = createMnemoLinkElement(label);
		eHTML.dashboard.mnemolinksList.appendChild(element);
	}

	const linkNewMnemonicBtnWrap = document.createElement('div');
	linkNewMnemonicBtnWrap.id = "linkNewMnemonicBtnWrap";
	linkNewMnemonicBtnWrap.innerHTML = '<div id="linkNewMnemonicBtn">+</div>';
	eHTML.dashboard.mnemolinksList.appendChild(linkNewMnemonicBtnWrap);
}
function createMnemoLinkBubbleElement(label = 'toto') {
	const newMnemoLink = document.createElement('div');
	newMnemoLink.classList.add('mnemolinkBubble');

	const h2 = document.createElement('h2');
	h2.innerText = label;
	newMnemoLink.appendChild(h2);
	
	return newMnemoLink;
}
function clearMnemonicBubbleShowing() {
	mnemoBubblesObj.forEach((mnemoBubbleObj) => {
		mnemoBubbleObj.stopShowing();
	});

	// reset showBtns
	const showBtns = document.getElementsByClassName('showBtn');
	for (let i = 0; i < showBtns.length; i++) {
		showBtns[i].classList.remove('showing');
	}
}
function initMnemoLinkBubbles(releaseBubbles = false, delayBeforeRelease = 600) {
	const intRadiusInFractionOfVH = 0.074;
	const angleDecay = -1.5;

	const mnemolinksBubblesContainer = eHTML.vault.mnemolinksBubblesContainer;
	const radius = window.innerHeight * intRadiusInFractionOfVH;
	const center_x = mnemolinksBubblesContainer.offsetWidth / 2;
	const center_y = mnemolinksBubblesContainer.offsetHeight / 2;
	
	const bubblesWrap = eHTML.vault.bubblesWrap;
	bubblesWrap.innerHTML = '';
	const monemoLinksLabels = userData.getListOfMnemoLinks();
	const total = settings.mnemolinkBubblesMinCircleSpots > monemoLinksLabels.length ? settings.mnemolinkBubblesMinCircleSpots : monemoLinksLabels.length;
	
	mnemoBubblesObj = [];
	for (let i = 0; i < monemoLinksLabels.length; i++) {
		const element = createMnemoLinkBubbleElement();
		bubblesWrap.appendChild(element);

		const angle = (i / total) * (2 * Math.PI) + angleDecay; // Angle for each element
		
		const x = center_x + radius * Math.cos(angle);
		const y = center_y + radius * Math.sin(angle);

		const mnemoBubbleObj = new mnemoBubbleObject(monemoLinksLabels[i], element, x, y);
		mnemoBubbleObj.toCenterContainer(0);
		mnemoBubblesObj.push(mnemoBubbleObj);
	}

	initMnemoLinkSVGs();

	if (!releaseBubbles) { return; }

	setTimeout(() => {
		if (!eHTML.dashboard.element.classList.contains('open')) { return; }
		mnemoBubblesObj.forEach((bubble) => { bubble.stopShowing(false);}) 
	}, delayBeforeRelease);
}
function initMnemoLinkSVGs() {
	const linksWrap = eHTML.vault.linksWrap;
	const mnemolinkLinks = linksWrap.getElementsByClassName('mnemolinkLink');

	// sequence = [4, 10, 60] => [4, 14, 0] => [8, 18, 4] => ... => [0, 10, 60]
	let sequence = [8, 16, 32];
	//let sequence = [20, 40, 200];
	//let sequence = [4, 30, 60];
	const sequenceFrames = sequence[sequence.length - 1];
	const sequenceIncrement = sequence[0];
	function updateSequence(sequenceIncrement) {
		let newSquence = [];
		for (let i = 0; i < sequence.length; i++) {
			let newFrame = sequence[i] + sequenceIncrement;
			while (newFrame > sequenceFrames) {
				newFrame -= sequenceFrames;
			}
			newSquence.push(newFrame);
		}

		return newSquence;
	}

	if (mnemolinkLinks.length !== mnemoBubblesObj.length) {
		// console.log('re create links svg');
		mnemoLinkSVGsObj = [];
		linksWrap.innerHTML = '';
		for (let i = 0; i < mnemoBubblesObj.length; i++) {
			const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
			svg.classList.add('mnemolinkLink');
			linksWrap.appendChild(svg);

			const mnemoLinkSVG = new mnemoLinkSVGObject(svg, mnemoBubblesObj[i].x, mnemoBubblesObj[i].y, sequence);
			mnemoLinkSVGsObj.push(mnemoLinkSVG);
			updateSequence(sequenceIncrement);
		};
	}
}
let MnemoBubblesNaNError = 0;
function positionMnemoLinkBubbles(extRadiusInFractionOfVH = 0.26) {
	const isModalOpen = !eHTML.modals.wrap.classList.contains('fold');
	let circleRadius = window.innerHeight * extRadiusInFractionOfVH;
	if (isModalOpen) { circleRadius *= 0.5; }

	const maxSpeed = .32;
	const acceleration = 0.004;
	const mnemolinksBubblesContainer = eHTML.vault.mnemolinksBubblesContainer;
	const center_x = mnemolinksBubblesContainer.offsetWidth / 2;
	const center_y = mnemolinksBubblesContainer.offsetHeight / 2;
	
	for (let i = 0; i < mnemoBubblesObj.length; i++) {
		/** @type {mnemoBubbleObject} */
		const mnemoBubbleObj = mnemoBubblesObj[i];
		if (mnemoBubbleObj.positionLock) { continue; }

		const isOutCircle = Math.sqrt((mnemoBubbleObj.x - center_x) ** 2 + (mnemoBubbleObj.y - center_y) ** 2) > circleRadius;
		const isOutCirclePlus = Math.sqrt((mnemoBubbleObj.x - center_x) ** 2 + (mnemoBubbleObj.y - center_y) ** 2) > circleRadius * 1.2;
		const isInCircleMinus = Math.sqrt((mnemoBubbleObj.x - center_x) ** 2 + (mnemoBubbleObj.y - center_y) ** 2) < circleRadius * .8;
		const isInPerfectRange = !isOutCirclePlus && !isInCircleMinus;
		const remainingDistance = Math.sqrt((mnemoBubbleObj.x - center_x) ** 2 + (mnemoBubbleObj.y - center_y) ** 2) + ( isOutCircle ? -circleRadius : circleRadius );

		const dx = isOutCircle ? center_x - mnemoBubbleObj.x : mnemoBubbleObj.x - center_x;
		const dy = isOutCircle ? center_y - mnemoBubbleObj.y : mnemoBubbleObj.y - center_y;
		const angle = Math.atan2(dy, dx);
		const isOppositeSpeed = Math.sign(mnemoBubbleObj.vector.x) !== Math.sign(dx) || Math.sign(mnemoBubbleObj.vector.y) !== Math.sign(dy);
		
		//if (i === 0) { console.log( Math.sqrt(dx * dx + dy * dy) ) }
		const maxSpeed_ = isInPerfectRange ? maxSpeed * .2 : maxSpeed;
		let speed = Math.min(maxSpeed_, Math.sqrt(dx * dx + dy * dy) * acceleration);
		speed = isOppositeSpeed ? speed * 6 : speed;

		const rnd_ = isOutCirclePlus ? 1 : rnd(0, 1) < .4 ? 0 : 1;
		let speedMultiplicator = rnd_ * ( isOutCircle ? (remainingDistance / circleRadius * 8) : (remainingDistance / circleRadius * 1) );
		speedMultiplicator = isOutCircle ? Math.pow(speedMultiplicator, .1) : speedMultiplicator;

		mnemoBubbleObj.vector.x += Math.cos(angle) * speed * speedMultiplicator;
		mnemoBubbleObj.vector.y += Math.sin(angle) * speed * speedMultiplicator;
		if (isNaN(mnemoBubbleObj.vector.x) || isNaN(mnemoBubbleObj.vector.y)) {
			MnemoBubblesNaNError++;
			if (MnemoBubblesNaNError > 30) {
				MnemoBubblesNaNError = 0;
				const releaseBubbles = eHTML.dashboard.element.classList.contains('open');
				initMnemoLinkBubbles(releaseBubbles, 600);
				return;
			}
		}
		
		mnemoBubbleObj.updatePosition()
	};
}
function positionLinkSVGs() {
	/** @type {HTMLElement} */
	const linksWrapContainer = eHTML.vault.linksWrap;

	for (let i = 0; i < mnemoLinkSVGsObj.length; i++) {
		const mnemoLinkSVGObj = mnemoLinkSVGsObj[i];
		mnemoLinkSVGObj.containerHalfWidth = linksWrapContainer.offsetWidth / 2;
		mnemoLinkSVGObj.containerHalfHeight = linksWrapContainer.offsetHeight / 2;
		mnemoLinkSVGObj.deltaBetweenLastTarget = mnemoLinkSVGObj.calculateDistance(mnemoLinkSVGObj.targetX, mnemoLinkSVGObj.targetY, mnemoBubblesObj[i].x, mnemoBubblesObj[i].y);
		mnemoLinkSVGObj.targetX = mnemoBubblesObj[i].x;
		mnemoLinkSVGObj.targetY = mnemoBubblesObj[i].y;
		mnemoLinkSVGObj.update();
	}
}
async function UXupdateLoop() {
	const pageVault = !eHTML.vault.element.classList.contains('tidy');
	const gameContainer = !eHTML.gameContainer.classList.contains('tidy');

	if (pageVault) {
		positionMnemoLinkBubbles();
		positionLinkSVGs();
	}

	requestAnimationFrame(UXupdateLoop);
}
function setInVaultPage(pageName = 'vault') {
	cleanUpGame();
	eHTML.dashboard.dashboardMnemolinksList.classList.add('tidy');
	eHTML.vault.element.classList.add('tidy');
	eHTML.games.element.classList.add('tidy');
	eHTML.gameContainer.classList.add('tidy');
	
	if (pageName === 'vault') {
		eHTML.vault.element.classList.remove('tidy');
		eHTML.dashboard.dashboardMnemolinksList.classList.remove('tidy');
	}
	
	if (pageName === 'games') {
		const category = userData.preferences.gameCategory || 'ScribeQuest';
		setGameCategory(category);
		eHTML.games.element.classList.remove('tidy');
	}

	if (pageName === 'game') {
		eHTML.gameContainer.classList.remove('tidy');
	}
}
function setGameCategory(category = 'ScribeQuest') {
	eHTML.games.ScribeQuest.sheet.classList.remove('active');
	eHTML.games.CipherCircuit.sheet.classList.remove('active');
	eHTML.games.ByteBard.sheet.classList.remove('active');

	eHTML.games[category].sheet.classList.add('active');
}
function createGameSheetElement(category = "ScribeQuest", folderName, title, description) {
	const gameSheet = document.createElement('div');
	gameSheet.classList.add('gameSheet');
	gameSheet.onclick = () => { setInVaultPage('game'); loadGame(category, folderName); };

	const gameMiniature = document.createElement('img');
	gameMiniature.classList.add('gameMiniature');
	gameMiniature.src = `../games/${category}/${folderName}/miniature.png`;
	gameSheet.appendChild(gameMiniature);

	const gameTitleDescriptionWrap = document.createElement('div');
	gameTitleDescriptionWrap.classList.add('gameTitleDescriptionWrap');
	gameSheet.appendChild(gameTitleDescriptionWrap);

	const gameTitle = document.createElement('div');
	gameTitle.classList.add('gameTitle');
	gameTitle.innerText = title;
	gameTitleDescriptionWrap.appendChild(gameTitle);

	const gameDescription = document.createElement('div');
	gameDescription.classList.add('gameDescription');
	gameDescription.innerText = description;
	gameTitleDescriptionWrap.appendChild(gameDescription);

	return gameSheet;
}
function setGameCategoryTooltip(eventTarget) {
	const gamesCategoryToolTipElmnt = eHTML.games.gamesCategoryToolTip;
	eHTML.games.gamesCategoryToolTip.innerText = "";

	if (eventTarget === eHTML.games.ScribeQuest.sheetBtn) {
		gamesCategoryToolTipElmnt.innerText = gamesInfoByCategory.ScribeQuest.categoryDescription;
	}
	if (eventTarget === eHTML.games.CipherCircuit.sheetBtn) {
		gamesCategoryToolTipElmnt.innerText = gamesInfoByCategory.CipherCircuit.categoryDescription;
	}
	if (eventTarget === eHTML.games.ByteBard.sheetBtn) {
		gamesCategoryToolTipElmnt.innerText = gamesInfoByCategory.ByteBard.categoryDescription;
	}

	if (gamesCategoryToolTipElmnt.innerText === "") {
		gamesCategoryToolTipElmnt.classList.add('hidden');
	} else {
		gamesCategoryToolTipElmnt.classList.remove('hidden');
	}
}
//#endregion

//#region - GAME FUNCTIONS
async function loadGame(category = "ScribeQuest", folderName = "give_me_ya_seed") {
	const gameContainer = eHTML.gameContainer;
	const content = await fetch(`../games/${category}/${folderName}/index.html`)

	if (!content.ok) {
		console.error('Error while loading game content');
		return;
	}
	
	const gameContent = await content.text();
	gameContainer.innerHTML = gameContent;
	
	window.initSecureMnemonicModule();
	const mnemonicStr = await userData.getMasterMnemonicStr();
	let mnemonicFormatedForGameUse = '';
	switch (category) {
		case "ScribeQuest": mnemonicFormatedForGameUse = mnemonicStr; break;
		case "CipherCircuit": mnemonicFormatedForGameUse = convertMnemonicStrToIndexesStr(mnemonicStr); break;
		case "ByteBard": mnemonicFormatedForGameUse = convertMnemonicStrToCustomB64Str(mnemonicStr); break;
	}
	console.log(mnemonicFormatedForGameUse);
	window.secureMnemonicModule.setMnemonic(mnemonicFormatedForGameUse);

	try {
		const scripts = gameContainer.getElementsByTagName('script');
	
		// Inject the scripts into the DOM
		for (let script of scripts) {
			const newScript = document.createElement('script');
			if (script.src) {
				newScript.src = script.src;
			}
			newScript.innerHTML = script.innerHTML;
			script.parentNode.replaceChild(newScript, script);
		}
	} catch (error) {
		console.error('Error while loading game scripts');
		window.secureMnemonicModule.useMnemonicSafely( () => { console.log('mnemonic erased'); });
	}
}
function cleanUpGame() {
	if (!gameController.isGameActive) { return; }

	try {
		gameController.isGameActive = false; // Step 1
		gameController.cleanUpGamePauses(); // Step 2
		gameController.clearGameTimeouts(); // Step 3
		gameController.removeGameEventListeners(); // Step 4
		removeGameStylesheet('style.css'); // Step 5
		clearGameContent(); // Step 6
		console.log('Game cleaned up');
	} catch (error) {
		console.error('Error while cleaning up the game');
	}
}
function clearGameContent() {
	const gameContainer = eHTML.gameContainer;
    if (!gameContainer) { gameContainer.innerHTML = ''; }

	if (!window.secureMnemonicModule) { return; }
	window.secureMnemonicModule.useMnemonicSafely( () => {} );
}
function removeGameStylesheet(filename = 'style.css') {
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"], style');
    stylesheets.forEach(sheet => {
        if (sheet.href && sheet.href.includes(filename)) {
            sheet.parentNode.removeChild(sheet);
        }
    });
}
function convertMnemonicStrToIndexesStr(mnemonicStr) {
	const mnemonic = mnemonicStr.split(' ');
	/** @type {MnemoLinker} */
	const mLer = new MnemoLinkerLastest();
	const { wordsTable } = mLer.getBIPTableFromMnemonic(mnemonic);
	
	let indexesStr = '';
	for (let i = 0; i < mnemonic.length; i++) {
		const index = wordsTable.indexOf(mnemonic[i]);
		indexesStr += index.toString();
		if (i < mnemonic.length - 1) { indexesStr += ' '; }
	}

	return indexesStr;
}
function convertMnemonicStrToCustomB64Str(mnemonicStr) {
	const mnemonic = mnemonicStr.split(' ');
	/** @type {MnemoLinker} */
	const mLer = new MnemoLinkerLastest();
	const { wordsTable } = mLer.getBIPTableFromMnemonic(mnemonic);
	
	let customB64Str = '';
	for (let i = 0; i < mnemonic.length; i++) {
		const index = wordsTable.indexOf(mnemonic[i]);
		const B64 = mLer.encodeNumberToCustomB64(index);
		customB64Str += B64;
		if (i < mnemonic.length - 1) { customB64Str += ' '; }
	}

	return customB64Str;
}
//#endregion

//#region - EVENT LISTENERS
window.addEventListener('resize', () => {
	initMnemoLinkBubbles(true, 600);
});
eHTML.modals.authentification.loginForm.addEventListener('submit', function(e) {
	e.preventDefault();

	const input = eHTML.modals.authentification.input;
	let password = input.value;
	if (password === '') { return; }
	
	chrome.storage.local.get(['hashedPassword'], async function(result) {
		const { hash, saltBase64, ivBase64 } = result.hashedPassword;
		const res = await cryptoLight.init(password, saltBase64, ivBase64);

		if (res.hash !== hash) { 
			input.classList.add('wrong');
			return;
		}

		password = null;
		input.value = '';
		await asyncInitLoad(true);
		closeModal();
		centerScreenBtn.lock();

		await new Promise(r => setTimeout(r, 600));

		await centerScreenBtnAction();
	});
});
eHTML.modals.authentification.input.addEventListener('input', function(e) {
	const input = e.target;
	if (input.classList.contains('wrong')) { input.classList.remove('wrong'); }
});
document.addEventListener('mousemove', (event) => {
	mousePos.x = event.clientX;
	mousePos.y = event.clientY;
});
document.getElementById("dark-mode-toggle").addEventListener('change', (event) => {
	toggleDarkMode(eHTML.toggleDarkModeButton)
	// save dark-mode state
	// localStorage.setItem('dark-mode', event.target.checked);
});
document.addEventListener('keydown', (event) => {
	// "tab key" result same as "enter key" for suggestions
	if (event.key === 'Enter' || event.key === 'Tab' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
		const suggestionsHTML = document.getElementsByClassName('suggestions')[0];
		if (!suggestionsHTML) { return; }
		const activeSuggestion = suggestionsHTML.getElementsByClassName('active')[0];

		function scrollSuggestionToView(suggestion, mode = 'bottom') {
			const suggestionsRect = suggestionsHTML.getBoundingClientRect();
			const suggestionRect = suggestion.getBoundingClientRect();
			if (mode === 'bottom' && suggestionRect.bottom > suggestionsRect.bottom) {
				suggestionsHTML.scrollTop += 2 + suggestionRect.bottom - suggestionsRect.bottom;
			} else if (mode === 'top' && suggestionRect.top < suggestionsRect.top) {
				suggestionsHTML.scrollTop -= suggestionsRect.top - suggestionRect.top;
			}
		}

		switch (event.key) {
			case 'ArrowUp':
				if (!activeSuggestion) { return; }
				const previousSuggestion = activeSuggestion.previousElementSibling;
				if (!previousSuggestion) { return; }

				activeSuggestion.classList.remove('active');
				previousSuggestion.classList.add('active');
				scrollSuggestionToView(previousSuggestion, 'top');
				break;
			case 'ArrowDown':
				if (!activeSuggestion) { suggestionsHTML.getElementsByClassName('suggestion')[0].classList.add('active'); return; }
				const nextSuggestion = activeSuggestion.nextElementSibling;
				if (!nextSuggestion) { return; }

				activeSuggestion.classList.remove('active');
				nextSuggestion.classList.add('active');
				scrollSuggestionToView(nextSuggestion, 'bottom');
				break;
			case 'Tab':
			case 'Enter':
				/** @type {HTMLInputElement} */
				let input = null;
				try {
					input = activeSuggestion.parentElement.parentElement.getElementsByClassName('wordInput')[0];
				} catch (error) {
					if (event.target.classList.contains('wordInput')) { input = event.target; }
				};

				if (input === null) { return; }
				event.preventDefault();
				const modalWrap = input.parentElement.parentElement.parentElement.parentElement.parentElement
				if (!modalWrap || !modalWrap.id) { console.error('modalWrap not found'); return; }
				
				if (!activeSuggestion) {
					if (switchBtnsIfMnemonicGridIsFilled(modalWrap.id).allWordsAreValid) { return; }
					focusNextInput(input);
					return; 
				}

				input.value = activeSuggestion.innerText;
				deleteExistingSuggestionsHTML();
				
				if (modalWrap.id === eHTML.modals.inputMasterMnemonic.wrap.id) {
					if (tempData.rndMnemonic.includes(input.value)) { input.classList.add('random'); } else { input.classList.remove('random'); }
					actualizeScore();
				}

				if (switchBtnsIfMnemonicGridIsFilled(modalWrap.id).allWordsAreValid) { return; }
				focusNextInput(input);
		
				break;
			default:
				break;
		}
	}
});
document.addEventListener('click', (event) => {
	const isVaultOpen = eHTML.dashboard.element.classList.contains('open');
	if (!isVaultOpen) { return; }

	const isTargetSuggestion = event.target.classList.contains('suggestion') || event.target.classList.contains('suggestions');
	if (!isTargetSuggestion) {
		deleteExistingSuggestionsHTML();
	}

	if (event.target.id === 'linkNewMnemonicBtn') { openModal('inputMnemonic'); return }
	if (event.target.id === 'vaultBtn') { setInVaultPage('vault'); }
	if (event.target.id === 'gamesBtn') { setInVaultPage('games'); }

	if (event.target === eHTML.games.ScribeQuest.sheetBtn) { setGameCategory('ScribeQuest'); }
	if (event.target === eHTML.games.CipherCircuit.sheetBtn) { setGameCategory('CipherCircuit'); }
	if (event.target === eHTML.games.ByteBard.sheetBtn) { setGameCategory('ByteBard'); }
	
	const isTargetBubbleOrShowBtn = event.target.classList.contains('mnemolinkBubble') || event.target.classList.contains('showBtn');
	if (!isTargetBubbleOrShowBtn) {
		/** @type {mnemoBubbleObject} */
		const bubbleShowing = mnemoBubblesObj.find((mnemoBubbleObj) => mnemoBubbleObj.element.classList.contains('showing'));
		if (!bubbleShowing) { return; }
		
		const mnemonic = (() => {
			if (!event.target.parentElement.classList.contains('active')) { return false; }
			const gridChildren = bubbleShowing.element.getElementsByClassName('miniMnemonicGrid')[0].children;
			let mnemonicStr = '';
			for (let i = 0; i < gridChildren.length; i++) {
				mnemonicStr += gridChildren[i].innerText + ' ';
			}
			return mnemonicStr;
		})();

		const mnemolinkBubbleCopyBtn = document.getElementById('bubbleCopyBtn');
		if (mnemonic && event.target === mnemolinkBubbleCopyBtn) {
			navigator.clipboard.writeText(mnemonic);
			anime({
				targets: mnemolinkBubbleCopyBtn,
				scale: 1.1,
				duration: 100,
				direction: 'alternate',
				easing: 'easeInOutSine',
			});
			return;
		}
			
		const mnemolinkBubbleDownloadBtn = document.getElementById('bubbleDownloadBtn');
		if (mnemonic && event.target === mnemolinkBubbleDownloadBtn) {
			const blob = new Blob([mnemonic], { type: "text/plain" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = "mnemonic.txt";
			document.body.appendChild(a);
			a.click();
			setTimeout(() => {
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
			}, 0);
			anime({
				targets: mnemolinkBubbleDownloadBtn,
				scale: 1.1,
				duration: 100,
				direction: 'alternate',
				easing: 'easeInOutSine',
			});
			return;
		}
		
		// close bubble if click outside mnemolinkBubble modal
		const mnemolinkBubble = bubbleShowing.element;
		let element = event.target;
		for (let i = 0; i < 4; i++) {
			if (!element) { break; }
			if (element === mnemolinkBubble) { return; }
			element = element.parentElement;
		}

		console.log('close bubble');
		clearMnemonicBubbleShowing();
	}
});
document.addEventListener('mouseover', (event) => {
	setGameCategoryTooltip(event.target);
});
document.addEventListener('input', (event) => {
	const isSeedWordsRange = event.target.name === "seedWords";
	if (!isSeedWordsRange) { return; }

	const parentModalWrap = event.target.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement;
	const isMasterMnemonicModal = parentModalWrap.id === eHTML.modals.inputMasterMnemonic.wrap.id;
	if (isMasterMnemonicModal) {
		console.log(parseInt(event.target.value));
		const nbOfWords = parseInt(event.target.value) < 12 ? 12 : parseInt(event.target.value);
		eHTML.modals.inputMasterMnemonic.seedWordsValueStr.innerText = nbOfWords;
		setNumberOfVisibleWordsInMnemonicGrid(eHTML.modals.inputMasterMnemonic.mnemonicGridInputs, nbOfWords);
		switchBtnsIfMnemonicGridIsFilled('masterMnemonicModalWrap');
	}
	
	const isMnemonicModal = parentModalWrap.id === eHTML.modals.inputMnemonic.wrap.id;
	if (isMnemonicModal) {
		const mnemonicLengths = [12, 15, 18, 21, 24];
		const nbOfWords = mnemonicLengths[parseInt(event.target.value) -1] ? mnemonicLengths[parseInt(event.target.value) -1] : 12;
		eHTML.modals.inputMnemonic.seedWordsValueStr.innerText = nbOfWords;
		setNumberOfVisibleWordsInMnemonicGrid(eHTML.modals.inputMnemonic.mnemonicGridInputs, nbOfWords);
		switchBtnsIfMnemonicGridIsFilled('mnemonicModalWrap');
	}
});
document.addEventListener('paste', (event) => {
	const target = event.target;
	if (target.tagName !== 'INPUT') { return; }

	const modalWrapId = target.parentElement.parentElement.parentElement.parentElement.parentElement.id;
	const isMasterMnemonicModal = modalWrapId === eHTML.modals.inputMasterMnemonic.wrap.id;
	const isMnemonicModal = modalWrapId === eHTML.modals.inputMnemonic.wrap.id;
	if (!isMasterMnemonicModal && !isMnemonicModal) { return; }
	
	const pastedText = event.clipboardData.getData('text');
	const pastedWords = pastedText.split(' ');
	
	const cleanedPastedWords = [];
	for (let i = 0; i < pastedWords.length; i++) {
		const word = pastedWords[i];
		if (word.length < 2 || word.match(/[^a-zA-Z]/g)) { continue; }
		cleanedPastedWords.push(word);
	}
	
	// control number of words
	if (cleanedPastedWords.length < 12) { modalInfo(eHTML.modals.inputMasterMnemonic, "Mnemonic must contain at least 12 words!", 3000); return; }
	if (isMasterMnemonicModal) {
		eHTML.modals.inputMasterMnemonic.seedWordsRange.value = cleanedPastedWords.length;
		eHTML.modals.inputMasterMnemonic.seedWordsValueStr.innerText = cleanedPastedWords.length; 
	}
	if (isMnemonicModal) { 
		const mnemonicLengths = [12, 15, 18, 21, 24];
		if (!mnemonicLengths.includes(cleanedPastedWords.length)) { modalInfo(eHTML.modals.inputMnemonic, "Mnemonic must contain 12, 15, 18, 21 or 24 words!", 3000); return; }
		eHTML.modals.inputMnemonic.seedWordsRange.value = mnemonicLengths.indexOf(cleanedPastedWords.length);
		eHTML.modals.inputMnemonic.seedWordsValueStr.innerText = cleanedPastedWords.length; 
	}

	// control language
	const randomizeBtn = isMasterMnemonicModal ? eHTML.modals.inputMasterMnemonic.randomizeBtn : eHTML.modals.inputMnemonic.randomizeBtn;
	const result = emptyMnemoLinker.getBIPTableFromMnemonic(cleanedPastedWords);
	const initialLanguage = randomizeBtn.classList[1];
	if (!result.language) { modalInfo(eHTML.modals.inputMasterMnemonic, "Language can't be detected!", 3000); return; }
	randomizeBtn.classList.remove(initialLanguage);
	randomizeBtn.classList.add(result.language);
	
	event.preventDefault();
	const targetGrid = isMnemonicModal ? eHTML.modals.inputMnemonic.mnemonicGridInputs : eHTML.modals.inputMasterMnemonic.mnemonicGridInputs;
	setNumberOfVisibleWordsInMnemonicGrid(targetGrid, cleanedPastedWords.length);
	
	for (let i = 0; i < cleanedPastedWords.length; i++) {
		const input = targetGrid[i];
		input.value = cleanedPastedWords[i];
	}

	const extracted = switchBtnsIfMnemonicGridIsFilled(modalWrapId);
	if (!extracted.allWordsAreValid) { return; }
	tempData.mnemonic = extracted;
});
centerScreenBtn.element.addEventListener('click', async (event) => { event.preventDefault(); await centerScreenBtnAction(); });
// DASHBOARD : MNEMOLINKS LIST
document.addEventListener('mousedown', (event) => {
	if (!event.target.classList.contains('mnemolinkInput')) { return; }
	event.preventDefault();
});
document.addEventListener('focusout', (event) => {
	// correspond to the "eHTML.dashboard.mnemolinksList" event listener, but work better using "document" event listener
	// console.log(`focusout: ${event.target.tagName}`);
	if (!event.target.classList.contains('mnemolinkInput')) { return; }

	/** @type {HTMLInputElement} */
	const mnemolinkInput = event.target;
	const editBtn = mnemolinkInput.parentElement.getElementsByClassName('editBtn')[0];
	const rect = editBtn.getBoundingClientRect();
	const x = mousePos.x;
	const y = mousePos.y;
	if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) { return; }

	const value = mnemolinkInput.value;
	if (value !== "" && userData.replaceMnemoLinkLabel(mnemolinkInput.defaultValue, value, true)) {
		mnemolinkInput.defaultValue = value;
		fillMnemoLinkList();
		initMnemoLinkBubbles(true, 200);
	} else {
		mnemolinkInput.classList.add('wrong');
		mnemolinkInput.value = mnemolinkInput.defaultValue;
		setTimeout(() => { mnemolinkInput.classList.remove('wrong'); }, 500);
	}
	
	editBtn.classList.remove('trash');
	mnemolinkInput.readOnly = true;
});
eHTML.dashboard.mnemolinksList.addEventListener('mouseover', (event) => {
	mnemoBubblesObj.forEach((mnemoBubbleObj) => { mnemoBubbleObj.element.classList.remove('hoverFromList'); });
	const mnemolinkInputs = document.getElementsByClassName('mnemolinkInput')
	for (let i = 0; i < mnemolinkInputs.length; i++) { mnemolinkInputs[i].classList.remove('hoverFromList'); }
	const mnemolink = event.target.classList.contains('mnemolink') ? event.target : event.target.parentElement;
	if (!mnemolink.classList.contains('mnemolink')) { return; }

	// if mnemolink hover
	const index = Array.from(mnemolink.parentElement.children).indexOf(mnemolink);

	const mnemoBubbleObj = mnemoBubblesObj[index];
	if (!mnemoBubbleObj) { console.error(`mnemoBubbleObj not found for index: ${index}`); return; }
	mnemoBubbleObj.element.classList.add('hoverFromList');
	
	/*const mnemoLinkSVGObj = mnemoLinkSVGsObj[index]; // ABORTED - USELESS DESIGN...
	if (!mnemoLinkSVGObj) { console.error(`mnemoLinkSVGObj not found for index: ${index}`); return; }
	const angle360 = (mnemoLinkSVGObj.angle + Math.PI) * 180 / Math.PI;
	centerScreenBtn.rotate(angle360);*/

	const mnemolinkInput = mnemolink.getElementsByClassName('mnemolinkInput')[0];
	mnemolinkInput.classList.add('hoverFromList');
});
eHTML.dashboard.mnemolinksList.addEventListener('mouseout', (event) => {
	mnemoBubblesObj.forEach((mnemoBubbleObj) => { mnemoBubbleObj.element.classList.remove('hoverFromList'); });
	const mnemolinkInputs = document.getElementsByClassName('mnemolinkInput')
	for (let i = 0; i < mnemolinkInputs.length; i++) { mnemolinkInputs[i].classList.remove('hoverFromList'); }
});
eHTML.dashboard.mnemolinksList.addEventListener('click', async (event) => {
	if (event.target.classList.contains('mnemolinkInput')) { event.preventDefault(); return; }

	const isEditBtn = event.target.classList.contains('editBtn');
	if (isEditBtn) {
		const isTrash = event.target.classList.contains('trash');
		if (!isTrash) {
			event.target.classList.add('trash');
			const mnemolinkInput = event.target.parentElement.getElementsByClassName('mnemolinkInput')[0];
			mnemolinkInput.readOnly = false;
			mnemolinkInput.setSelectionRange(mnemolinkInput.value.length, mnemolinkInput.value.length);
			mnemolinkInput.focus();
			return;
		} else {
			console.log('delete mnemolink');
			const index = Array.from(event.target.parentElement.parentElement.children).indexOf(event.target.parentElement);
			const listOfMnemoLinksLabel = userData.getListOfMnemoLinks();
			const label = listOfMnemoLinksLabel[index];

			prepareConfirmationModal(
				`Delete MnemoLink: ${label}?`,
				async () => {
					closeModal();
					userData.removeMnemoLink(label);
					save.userMnemoLinks();
		
					fillMnemoLinkList();
					initMnemoLinkBubbles(true, 600);
				},
				() => { 
					closeModal();
					event.target.classList.remove('trash');
					const mnemolinkInput = event.target.parentElement.getElementsByClassName('mnemolinkInput')[0];
					mnemolinkInput.readOnly = true;
				}
			);

			openModal('confirmation');
			return;
		}
	}

	const isShowBtn = event.target.classList.contains('showBtn');
	if (isShowBtn) {
		const isShowing = event.target.classList.contains('showing');
		if (!isShowing) {
			clearMnemonicBubbleShowing();
			event.target.classList.add('showing');
			const index = Array.from(event.target.parentElement.parentElement.children).indexOf(event.target.parentElement);
			const listOfMnemoLinksLabel = userData.getListOfMnemoLinks();
			const label = listOfMnemoLinksLabel[index];
			const mnemonicStr = await userData.getMnemoLinkDecrypted(label, true);
			if (!mnemonicStr) { console.error(`Unable to get decrypted mnemonicStr for MnemoLink: ${label}`); return; }
			
			await mnemoBubblesObj[index].prepareBubbleToShow(label, mnemonicStr);
			await mnemoBubblesObj[index].decipherMiniMnemonicGrid(mnemonicStr);
			
			return;
		} else {
			event.target.classList.remove('showing');
			clearMnemonicBubbleShowing();
			return;
		}
	}
});
eHTML.dashboard.mnemolinksList.addEventListener('keydown', (event) => {
	if (event.key === 'Enter') {
		event.preventDefault();
		event.target.blur();
	}
});
// MODAL : MASTER MNEMONIC
eHTML.modals.wrap.addEventListener('click', (event) => {
	if (event.target === eHTML.modals.wrap) { closeModal(); } 

	if (eHTML.modals.inputMasterMnemonic.mnemonicGrid.classList.contains('busy')) { return; }
	if (eHTML.modals.inputMnemonic.mnemonicGrid.classList.contains('busy')) { return; }

	const eventTargetIsCopyBtn = event.target === eHTML.modals.inputMasterMnemonic.copyMnemonicBtn || event.target === eHTML.modals.inputMnemonic.copyMnemonicBtn;
	if (eventTargetIsCopyBtn) {
		const mnemonic = tempData.mnemonic.getMnemonicStr();
		navigator.clipboard.writeText(mnemonic);
		modalInfo(eHTML.modals.inputMasterMnemonic, 'Mnemonic copied to clipboard');
		modalInfo(eHTML.modals.inputMnemonic, 'Mnemonic copied to clipboard');
	}

	const eventTargetIsDownloadBtn = event.target === eHTML.modals.inputMasterMnemonic.downloadMnemonicBtn || event.target === eHTML.modals.inputMnemonic.downloadMnemonicBtn;
	if (eventTargetIsDownloadBtn) {
		const indexedMnemonicStr = tempData.mnemonic.getIndexedMnemonicStr();
		const fileName = event.target === eHTML.modals.inputMasterMnemonic.downloadMnemonicBtn ? "master_mnemonic.txt" : "mnemonic.txt";
		downloadStringAsFile(indexedMnemonicStr, fileName);
		modalInfo(eHTML.modals.inputMasterMnemonic, 'Mnemonic downloaded');
		modalInfo(eHTML.modals.inputMnemonic, 'Mnemonic downloaded');
	}
});
eHTML.modals.inputMasterMnemonic.previousLanguageBtn.addEventListener('click', async (event) => {
	if (eHTML.modals.inputMasterMnemonic.mnemonicGrid.classList.contains('busy')) { return; }
	const languageBtn = eHTML.modals.inputMasterMnemonic.randomizeBtn;
	const languages = emptyMnemoLinker.getAvailableLanguages();
	const currentLanguage = languageBtn.classList[1];
	const currentLanguageIndex = languages.indexOf(currentLanguage);
	const previousLanguageIndex = currentLanguageIndex === 0 ? languages.length - 1 : currentLanguageIndex - 1;
	const previousLanguage = languages[previousLanguageIndex];
	if (!previousLanguage) { console.error('previousLanguage not found'); return; }

	const initialClass = languageBtn.classList[0];
	languageBtn.classList = `${initialClass} ${previousLanguage}`;
	await randomizeMnemonic(eHTML.modals.inputMasterMnemonic, true);
	switchBtnsIfMnemonicGridIsFilled(eHTML.modals.inputMasterMnemonic.wrap.id);
	tempData.init();
	eHTML.modals.inputMasterMnemonic.mnemonicGridInputs[0].focus();
});
eHTML.modals.inputMasterMnemonic.nextLanguageBtn.addEventListener('click', async (event) => {
	if (eHTML.modals.inputMasterMnemonic.mnemonicGrid.classList.contains('busy')) { return; }
	const languageBtn = eHTML.modals.inputMasterMnemonic.randomizeBtn;
	const languages = emptyMnemoLinker.getAvailableLanguages();
	const currentLanguage = languageBtn.classList[1];
	const currentLanguageIndex = languages.indexOf(currentLanguage);
	const nextLanguageIndex = currentLanguageIndex === languages.length - 1 ? 0 : currentLanguageIndex + 1;
	const nextLanguage = languages[nextLanguageIndex];
	if (!nextLanguage) { console.error('nextLanguage not found'); return; }

	const initialClass = languageBtn.classList[0];
	languageBtn.classList = `${initialClass} ${nextLanguage}`;
	await randomizeMnemonic(eHTML.modals.inputMasterMnemonic, true);
	switchBtnsIfMnemonicGridIsFilled(eHTML.modals.inputMasterMnemonic.wrap.id);
	tempData.init();
	eHTML.modals.inputMasterMnemonic.mnemonicGridInputs[0].focus();
});
eHTML.modals.inputMasterMnemonic.randomizeBtn.addEventListener('click', async (event) => {
	if (eHTML.modals.inputMasterMnemonic.mnemonicGrid.classList.contains('busy')) { return; }
	await randomizeMnemonic(eHTML.modals.inputMasterMnemonic, false);
	actualizeScore();
	eHTML.modals.inputMasterMnemonic.mnemonicGridInputs[0].focus();

	const extracted = switchBtnsIfMnemonicGridIsFilled(eHTML.modals.inputMasterMnemonic.wrap.id);
	if (!extracted.allWordsAreValid) { return; }
	tempData.mnemonic = extracted.mnemonic;
});
eHTML.modals.inputMasterMnemonic.mnemonicGrid.addEventListener('input', (event) => {
	if (event.target.tagName !== 'INPUT') { return; }
	
	const modal = eHTML.modals.inputMasterMnemonic;
	const input = event.target;
	//const value = input.value.replace(/[^a-zA-Z]/g, '').toLowerCase();
	const value = input.value.toLowerCase();
	event.target.value = value;
	
	const bip = "BIP-0039";
	const language = modal.randomizeBtn.classList[1];
	const suggestions = emptyMnemoLinker.getSuggestions(value, bip, language);
	if (!suggestions) { return; }
	
	const extracted = switchBtnsIfMnemonicGridIsFilled(modal.wrap.id);
	if (suggestions.length === 1 && isWordInWordsList(suggestions[0], bip, language)) {
		event.target.value = suggestions[0];
		deleteExistingSuggestionsHTML();
		input.classList.add('random');
		actualizeScore();
		if (extracted.allWordsAreValid) { tempData.mnemonic = extracted.mnemonic; return; }
		focusNextInput(input);
		return;
	}

	function createSuggestionsHTML() {
		const newElmnt = document.createElement('div');
		newElmnt.classList.add('suggestions');
		if (getInputIndex(input) > 5) { newElmnt.classList.add('fromBottom'); } else { newElmnt.classList.add('fromTop'); }

		newElmnt.addEventListener('mouseover', (event) => {
			if (!event.target.classList.contains('suggestion')) { return; }
			//console.log(event.target.innerText);

			const activeSuggestion = newElmnt.getElementsByClassName('active')[0];
			if (activeSuggestion) { activeSuggestion.classList.remove('active'); }
			event.target.classList.add('active');
		});
		newElmnt.addEventListener('click', (event) => {
			if (!event.target.classList.contains('suggestion')) { return; }

			const activeSuggestion = newElmnt.getElementsByClassName('active')[0];
			if (!activeSuggestion) { return; }
			input.value = activeSuggestion.innerText;

			if (!isWordInWordsList(value, bip, language)) { console.error('word not in wordsList'); return; }

			deleteExistingSuggestionsHTML();
			if (tempData.rndMnemonic.includes(input.value)) { input.classList.add('random'); } else { input.classList.remove('random'); }
			actualizeScore()
			if (switchBtnsIfMnemonicGridIsFilled(modal.wrap.id).allWordsAreValid) { return; }
			focusNextInput(input);
			return;
		});

		input.parentElement.appendChild(newElmnt);
		return newElmnt;
	}

	const suggestionsHTML = input.parentElement.getElementsByClassName('suggestions')[0] || createSuggestionsHTML();
	suggestionsHTML.innerHTML = "";

	for (let i = 0; i < suggestions.length; i++) {
		const suggestionHTML = document.createElement('div');
		suggestionHTML.classList = 'suggestion';
		suggestionHTML.innerText = suggestions[i];
		if (i === 0) { suggestionHTML.classList.add('active'); }
		suggestionsHTML.appendChild(suggestionHTML);
	}
	input.parentElement.appendChild(suggestionsHTML);
});
eHTML.modals.inputMasterMnemonic.mnemonicGrid.addEventListener('click', (event) => {
	if (event.target.tagName === 'BUTTON') {
		const input = event.target.parentElement.querySelector('input');
		const bip = "BIP-0039";
		const language = eHTML.modals.inputMasterMnemonic.randomizeBtn.classList[1];
		const wordsList = emptyMnemoLinker.getWordsTable(bip, language);
		if (!wordsList) { return; }

		const inputValueIsInWordsList = wordsList.includes(input.value);
		if (inputValueIsInWordsList) { tempData.rndButtonsPressed++; }

		const rndWord = getRandomWord(wordsList);
		input.value = rndWord;
		input.classList.add('random');
		actualizeScore();

		const extracted = switchBtnsIfMnemonicGridIsFilled(eHTML.modals.inputMasterMnemonic.wrap.id);
		if (extracted.allWordsAreValid) { tempData.mnemonic = extracted.mnemonic; }
	}
});
eHTML.modals.inputMasterMnemonic.confirmBtn.addEventListener('click', async (event) => {
	if (eHTML.modals.inputMasterMnemonic.confirmBtn.classList.contains('busy')) { return; }
	if (eHTML.modals.inputMasterMnemonic.mnemonicGrid.classList.contains('busy')) { return; }
	if (eHTML.modals.inputMasterMnemonic.confirmBtn.classList.contains('disabled')) { return; }

	const mnemonic = tempData.mnemonic.getMnemonicStr();
	if (!mnemonic) { console.error('mnemonic not found'); return; }

	eHTML.modals.inputMasterMnemonic.confirmBtn.classList.add('busy');

	await userData.setMnemonicAsEncrypted(mnemonic);
	await save.userEncryptedMnemonicsStr();
	tempData.init();
	
	closeModal();
	setTimeout(() => { centerScreenBtnAction() }, 600);
	setTimeout(async () => { 
		/** @type {MnemoLinker} */
		const mnemoLinker = new MnemoLinkerLastest( { pseudoMnemonic: mnemonic } );
		const id = await mnemoLinker.genPublicId();
		userData.id = id;
		save.userId();
	}, 200);

	eHTML.modals.inputMasterMnemonic.confirmBtn.classList.remove('busy');
});
// MODAL : INPUT MNEMONIC - used to add a new mnemonic or show an existing one
eHTML.modals.inputMnemonic.nextLanguageBtn.addEventListener('click', async (event) => {
	const languageBtn = eHTML.modals.inputMnemonic.randomizeBtn;
	const languages = emptyMnemoLinker.getAvailableLanguages();
	const currentLanguage = languageBtn.classList[1];
	const currentLanguageIndex = languages.indexOf(currentLanguage);
	const nextLanguageIndex = currentLanguageIndex === languages.length - 1 ? 0 : currentLanguageIndex + 1;
	const nextLanguage = languages[nextLanguageIndex];
	if (!nextLanguage) { console.error('nextLanguage not found'); return; }

	const initialClass = languageBtn.classList[0];
	languageBtn.classList = `${initialClass} ${nextLanguage}`;
});
eHTML.modals.inputMnemonic.previousLanguageBtn.addEventListener('click', async (event) => {
	const languageBtn = eHTML.modals.inputMnemonic.randomizeBtn;
	const languages = emptyMnemoLinker.getAvailableLanguages();
	const currentLanguage = languageBtn.classList[1];
	const currentLanguageIndex = languages.indexOf(currentLanguage);
	const previousLanguageIndex = currentLanguageIndex === 0 ? languages.length - 1 : currentLanguageIndex - 1;
	const previousLanguage = languages[previousLanguageIndex];
	if (!previousLanguage) { console.error('previousLanguage not found'); return; }

	const initialClass = languageBtn.classList[0];
	languageBtn.classList = `${initialClass} ${previousLanguage}`;
});
eHTML.modals.inputMnemonic.randomizeBtn.addEventListener('click', async (event) => {
	if (eHTML.modals.inputMnemonic.mnemonicGrid.classList.contains('busy')) { return; }
	await randomizeMnemonic(eHTML.modals.inputMnemonic, false);

	const extracted = switchBtnsIfMnemonicGridIsFilled(eHTML.modals.inputMnemonic.wrap.id);
	if (!extracted.allWordsAreValid) { return; }
	tempData.mnemonic = extracted.mnemonic;
});
eHTML.modals.inputMnemonic.mnemonicGrid.addEventListener('input', (event) => {
	if (event.target.tagName !== 'INPUT') { return; }
	
	const modal = eHTML.modals.inputMnemonic;
	const input = event.target;
	//const value = input.value.replace(/[^a-zA-Z]/g, '').toLowerCase();
	const value = input.value.toLowerCase()
	event.target.value = value;
	
	let bip = "BIP-0039";
	let language = modal.randomizeBtn.classList[1];

	// try to find the language
	const extracted = switchBtnsIfMnemonicGridIsFilled(modal.wrap.id);
	const nonEmptyWords = extracted.mnemonic.mnemonic.filter(word => word.length > 0);
	if (nonEmptyWords.length > 2) {
		const extractedMnemonic = extracted.mnemonic.mnemonic;
		if (!extracted.allWordsAreValid && extractedMnemonic.length > 1) {
			const result = emptyMnemoLinker.getBIPTableFromMnemonic(extracted.mnemonic.mnemonic);
			const initialClass = modal.randomizeBtn.classList[0];
			const detectedLanguage = result.language ? result.language : result.bestLanguage;
			if (detectedLanguage.length !== 0 && detectedLanguage !== language) {
				deleteExistingSuggestionsHTML();
				console.log(result.language ? `language is ${result.language}` : `language is probably ${result.bestLanguage}`);
				modal.randomizeBtn.classList = `${initialClass} ${detectedLanguage}`;
				language = detectedLanguage;
			}
		}
	}

	const suggestions = emptyMnemoLinker.getSuggestions(value, bip, language);
	if (!suggestions) { return; }

	function createSuggestionsHTML() {
		const newElmnt = document.createElement('div');
		newElmnt.classList.add('suggestions');
		if (getInputIndex(input) > 5) { newElmnt.classList.add('fromBottom'); } else { newElmnt.classList.add('fromTop'); }

		newElmnt.addEventListener('mouseover', (event) => {
			if (!event.target.classList.contains('suggestion')) { return; }

			const activeSuggestion = newElmnt.getElementsByClassName('active')[0];
			if (activeSuggestion) { activeSuggestion.classList.remove('active'); }
			event.target.classList.add('active');
		});
		newElmnt.addEventListener('click', (event) => {
			if (!event.target.classList.contains('suggestion')) { return; }

			const activeSuggestion = newElmnt.getElementsByClassName('active')[0];
			if (!activeSuggestion) { return; }
			input.value = activeSuggestion.innerText;

			if (!isWordInWordsList(value, bip, language)) { console.error('word not in wordsList'); return; }

			deleteExistingSuggestionsHTML();
			if (tempData.rndMnemonic.includes(input.value)) { input.classList.add('random'); } else { input.classList.remove('random'); }
			if (switchBtnsIfMnemonicGridIsFilled(modal.wrap.id).allWordsAreValid) { return; }
			focusNextInput(input);
			return;
		});

		input.parentElement.appendChild(newElmnt);
		return newElmnt;
	}

	const suggestionsHTML = input.parentElement.getElementsByClassName('suggestions')[0] || createSuggestionsHTML();
	suggestionsHTML.innerHTML = "";

	for (let i = 0; i < suggestions.length; i++) {
		const suggestionHTML = document.createElement('div');
		suggestionHTML.classList = 'suggestion';
		suggestionHTML.innerText = suggestions[i];
		if (i === 0) { suggestionHTML.classList.add('active'); }
		suggestionsHTML.appendChild(suggestionHTML);
	}
	input.parentElement.appendChild(suggestionsHTML);
});
eHTML.modals.inputMnemonic.confirmBtn.addEventListener('click', async (event) => {
	if (eHTML.modals.inputMnemonic.confirmBtn.classList.contains('busy')) { return; }
	if (eHTML.modals.inputMnemonic.mnemonicGrid.classList.contains('busy')) { return; }
	if (eHTML.modals.inputMnemonic.confirmBtn.classList.contains('disabled')) { return; }

	const mnemonic = tempData.mnemonic.getMnemonicStr();
	if (!mnemonic) { console.error('mnemonic not found'); return; }

	eHTML.modals.inputMnemonic.confirmBtn.classList.add('busy');

	const masterMnemonicStr = await userData.getMasterMnemonicStr();
	/** @type {MnemoLinker} */
	const mnemoLinker = new MnemoLinkerLastest( { pseudoMnemonic: masterMnemonicStr , mnemonic: mnemonic } );
	const mnemoLink = await mnemoLinker.encryptMnemonic();
	if (!mnemoLink) { console.error('Unable to create mnemoLink'); return; }

	userData.addMnemoLink(mnemoLink);
	await save.userMnemoLinks();
	//console.log('MnemoLink added and saved');

	fillMnemoLinkList();
	initMnemoLinkBubbles(true, 600);
	
	tempData.init();
	closeModal();

	eHTML.modals.inputMnemonic.confirmBtn.classList.remove('busy');
});
//#endregion

//#region - SERVER COMMUNICATION
async function sendMnemoLinksToServer() {
	const data = { 
		id: userData.id,
		encryptedMasterMnemonicsStr: userData.encryptedMasterMnemonicsStr,
		encryptedMnemoLinksStr: userData.encryptedMnemoLinksStr,
	};

	const serverUrl = `${settings.serverUrl}/api/storeMnemoLinks`;
	const requestOptions = {
	  method: 'POST',
	  headers: {
		'Content-Type': 'application/json',
	  },
	  body: JSON.stringify(data)
	};
  
	try {
	  const response = await fetch(serverUrl, requestOptions);
	  const result = await response.json();
	  return result.success;
	} catch (error) {
	  console.error(`Error while sending MnemoLinks to server: ${error}`);
	  return false;
	}
}
//#endregion