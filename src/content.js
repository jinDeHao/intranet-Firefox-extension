let taskNum = '';
document.addEventListener('keydown', function (event) {
	if (event.keyCode >= 48 && event.keyCode <= 57) {
		if (event.shiftKey && taskNum.length < 2) {
			taskNum += String.fromCharCode(event.keyCode);
		} else {
			taskNum = String.fromCharCode(event.keyCode);
		}
		let task = document.querySelector('#task-num-' + taskNum);
		if (task) {
			task.scrollIntoView();
		}
	}
});

document.addEventListener('keyup', function (event) {
	if (event.keyCode === 16) taskNum = '';
	if (event.keyCode >= 48 && event.keyCode <= 57 && !event.shiftKey) taskNum = '';
});

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	if (msg.action === 'scrapeFileNames') {
		function scrapeFileNames(html) {
			let parser = new DOMParser();
			let doc = parser.parseFromString(html, 'text/html');
			let dirElement = Array.from(doc.querySelectorAll('li')).find(li => li.textContent.includes('Directory:'));
			let dirName = dirElement?.querySelector('code')?.textContent;
			let fileNames = [];
			let taskCards = doc.querySelectorAll('.task-card');
			taskCards.forEach(taskCard => {
				let fileElements = taskCard.querySelectorAll('li');
				fileElements.forEach(fileElement => {
					if (fileElement.textContent.includes('File:')) {
						let fileText = fileElement.textContent.replace('File:', '').trim();
						let files = fileText.split(', ');
						files.forEach(file => {
							fileNames.push(file.trim());
						});
					}
				});
			});
			return { dirName, fileNames };
		}


		function generateCommandLine(dirName, fileNames) {
			let commandLine = `mkdir "${dirName}" && cd "${dirName}" && touch README.md `;
			let hasPyFiles, hasJsFiles, hasExecutableFiles = false;
			let subDirs = new Set();

			fileNames.forEach(fileName => {
				let parts = fileName.split('/');
				if (parts.length > 1) {
					parts.pop();
					let subDir = parts.join('/');
					subDirs.add(subDir);
				}
				(fileName.endsWith('.py')) && (hasPyFiles = true);
				(fileName.endsWith('.js')) && (hasJsFiles = true);
				(!fileName.includes('.') && !fileName.endsWith('/')) && (hasExecutableFiles = true);

			});
			subDirs.forEach(subDir => {
				commandLine += ` && mkdir -p "${subDir}"`;
			});
			commandLine += ` && touch ${fileNames.join(' ')} `;
			commandLine += ` && echo "${dirName}" > README.md`;
			if (hasPyFiles) {
				commandLine += ` && find . -name "*.py" -exec sh -c 'echo "#!/usr/bin/python3" > "{}" && chmod u+x "{}"' \\;`;
			}
			if (hasJsFiles) {
				commandLine += ` && find . -name "*.js" -exec sh -c 'echo "#!/usr/bin/node" > "{}" && chmod u+x "{}"' \\;`;
			}
			if (hasExecutableFiles) {
				commandLine += ` && find . ! -name "*.*" ! -name "README.md" -type f -exec sh -c 'echo "#!/usr/bin/bash" > "{}" && chmod u+x "{}"' \\;`;
			}
			return commandLine;
		}


		let html = document.documentElement.outerHTML;
		let { dirName, fileNames } = scrapeFileNames(html);
		let commandLine = generateCommandLine(dirName, fileNames);

		let textarea = document.createElement('textarea');
		// alert(commandLine);
		textarea.textContent = commandLine;
		document.body.appendChild(textarea);

		textarea.select();

		function delay(ms) {
			return new Promise(resolve => {
			  setTimeout(resolve, ms);
			});
		}

		try {
			let successful = document.execCommand('copy');
			let msg = successful ? 'Command line copied to clipboard!' : 'Could not copy command line to clipboard';
			sendResponse({ success: true })
		} catch (err) {
			sendResponse({ success: false })
			console.error('Could not copy command line to clipboard: ', err);
		}

		document.body.removeChild(textarea);
	}
});

browser.runtime.onMessage.addListener(
	function (request, sender, sendResponse) {
		if (request.message === "get_task_status") {
			let buttons = document.querySelectorAll('.student_task_done');
			let taskStatus = [];
			buttons.forEach(function (button) {
				if (button.classList.contains('yes')) {
					taskStatus.push('yes');
				} else if (button.classList.contains('no')) {
					taskStatus.push('no');
				} else {
					taskStatus.push('default');
				}
			});
			sendResponse({ taskStatus: taskStatus });
		} else if (request.message === "run_script") {
			let taskIndices = request.taskIndices;
			let buttons = document.querySelectorAll('.correction_request_test_send');
			taskIndices.forEach(function (index) {
				buttons[index].click();
			});
			sendResponse({ success: true });
		}
	}
);
