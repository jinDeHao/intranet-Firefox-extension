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
		sendResponse({ success: true ,"cmd": commandLine});
		return;
	}
});
let observers = {};
browser.runtime.onMessage.addListener(
	function (request, sender, sendResponse) {
		if (request.message === "get_task_status") {
			let buttons = document.querySelectorAll('.student_task_done');
			let taskStatus = [];
			let taskIds = [];
			buttons.forEach(function (button) {
				if (button.classList.contains('yes')) {
					taskStatus.push('yes');
				} else if (button.classList.contains('no')) {
					taskStatus.push('no');
				} else {
					taskStatus.push('default');
				}
				taskIds.push(button.getAttribute('data-task-id'));
			});
			// sendResponse({ taskStatus: taskStatus });
			sendResponse({ taskStatus: taskStatus, taskIds: taskIds });
		} else if (request.message === "run_script") {
			let taskIndices = request.taskIndices;
			let buttons = document.querySelectorAll('.correction_request_test_send');
			taskIndices.forEach(function (index) {
				buttons[index].click();
			});
			sendResponse({ success: true });
		}
		//+++++++++++++++++++++++++++++++++++++++++ 
		else if (request.message === "create_observers") {
			// get all spinner elements
			let spinners = document.querySelectorAll('.task_correction_modal .spinner');

			// iterate over each spinner element
			spinners.forEach(function (spinner) {
				// get the corresponding task ID using the data-task-id attribute
				let taskId = spinner.parentElement.querySelector('.correction_request_test_send').getAttribute('data-task-id');

				// check if an observer already exists for this taskId
				if (observers[taskId]) return;

				// create a MutationObserver to watch for changes in the style attribute of the spinner element
				let observer = new MutationObserver(function (mutations) {
					mutations.forEach(function (mutation) {
						if (mutation.attributeName === 'style') {
							let displayValue = spinner.style.display;
							if (displayValue === 'none') {

								// add a delay before querying the student_task_done element
								setTimeout(function () {
									// get the corresponding student_task_done element
									let studentTaskDoneElement = document.querySelector(`.student_task_done[data-task-id="${taskId}"]`);

									// send a message to the popup script to notify it that the spinner has been hidden
									chrome.runtime.sendMessage({
										message: 'spinner_hidden',
										taskId: taskId,
										studentTaskDoneElement: studentTaskDoneElement.outerHTML
									});
								}, 1000);

								// disconnect the observer
								// observer.disconnect();
							}
						}
					});
				});

				// start observing the spinner element
				observer.observe(spinner, { attributes: true });

				// store the observer in the observers object using the task ID as the key
				observers[taskId] = observer;
			});
			sendResponse({ success: true });
		}
	}
);
