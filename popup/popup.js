function checkUncheckButton(checkbox) {
	const parentLabel = checkbox.parentElement;
	if (checkbox.checked) {
		parentLabel.classList.add('checked');
		checkbox.checked = true;
	} else {
		parentLabel.classList.remove('checked');
		checkbox.checked = false;
	}
}
function copyToClipboard(text) {
	navigator.clipboard.writeText(text)
	  .then(() => {
		console.log('Text copied to clipboard');
	  })
	  .catch((error) => {
		console.error('Unable to copy text', error);
	  });
  }

document.querySelector('#scrape-button').addEventListener('click', () => {
	browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		browser.tabs.sendMessage(tabs[0].id, { action: 'scrapeFileNames' }, function (response) {
			copyToClipboard(response["cmd"]);
			let scrapeButton = document.getElementById('scrape-button');
			if (response.success) {
				scrapeButton.classList.remove('error');
				scrapeButton.textContent = 'Copied';
				setTimeout(()=>{
					scrapeButton.textContent = 'Files';
				},2000)
			} else {
				scrapeButton.classList.add('error');
				scrapeButton.textContent = 'Copying error';
			}
		});
	});
});


window.onload = function () {
	browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		browser.tabs.sendMessage(tabs[0].id, { message: "get_task_status" }, function (response) {
			let taskStatus = response.taskStatus;
			let taskIds = response.taskIds;
			let taskList = document.getElementById('task-list');
			taskStatus.forEach(function (status, index) {
				let label = document.createElement('label');
				label.classList.add('task-status');
				label.setAttribute('data-task-id', taskIds[index]);
				if (status === 'yes') {
					label.classList.add('green');
				} else if (status === 'no') {
					label.classList.add('red');
				}
				let checkbox = document.createElement('input');
				checkbox.type = 'checkbox';
				label.appendChild(checkbox);
				if (index <= 9)
					label.appendChild(document.createTextNode((" Task " + index)));
				else
					label.appendChild(document.createTextNode((" Task " + index)));
				taskList.appendChild(label);
				checkbox.addEventListener('change', () => {
					checkUncheckButton(checkbox);
				});
				const TaskElements = document.querySelectorAll('.task-status');
				TaskElements.forEach(element => {
					element.addEventListener('mouseover', () => {
						if (element.classList.contains('checked')) {
							element.style.opacity = '0.7';
						} else {
							element.style.opacity = '0.5';
						}
					});
					element.addEventListener('mouseout', () => {
						element.style.opacity = '';
					});
				});
			});
		});
	});


	document.getElementById('run-script').addEventListener('click', function () {
		let runScriptButton = document.getElementById('run-script');
		runScriptButton.textContent = 'Running...';
		let checkboxes = document.querySelectorAll('#task-list input[type="checkbox"]');
		let taskIndices = [];
		checkboxes.forEach(function (checkbox, index) {
			const parentLabel = checkbox.parentElement;
			if (checkbox.checked && !parentLabel.classList.contains('running')) {
				taskIndices.push(index);
				parentLabel.classList.add('running');
			}
		});
		browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
			browser.tabs.sendMessage(tabs[0].id, { message: "run_script", taskIndices: taskIndices }, function (response) {
				runScriptButton.textContent = 'Run Script';
				setTimeout(()=>{
					runScriptButton.textContent = 'Check';
				}, 1000)
			});
		browser.tabs.sendMessage(tabs[0].id, { message: "create_observers" }, function (response) { });
		});
	});

	document.getElementById('select-all').addEventListener('change', function (event) {
		let checked = event.target.checked;
		let checkboxes = document.querySelectorAll('#task-list input[type="checkbox"]');
		checkboxes.forEach(function (checkbox) {
			const parentLabel = checkbox.parentElement;
			parentLabel.classList.add('checked');
			checkbox.checked = true;
		});
	});

	document.getElementById('select-none').addEventListener('change', function (event) {
		let checked = event.target.checked;
		let checkboxes = document.querySelectorAll('#task-list input[type="checkbox"]');
		checkboxes.forEach(function (checkbox) {
			const parentLabel = checkbox.parentElement;
			parentLabel.classList.remove('checked');
			checkbox.checked = false;
		});
	});

	document.getElementById('select-greens').addEventListener('change', function (event) {
		let checkall = document.querySelectorAll('.task-status input[type="checkbox"]');
		checkall.forEach(function (checkbox) {
			const parentLabel = checkbox.parentElement;
			parentLabel.classList.remove('checked');
			checkbox.checked = false;
		});
		let checked = event.target.checked;
		let checkboxes = document.querySelectorAll('.task-status.green input[type="checkbox"]');
		checkboxes.forEach(function (checkbox) {
			const parentLabel = checkbox.parentElement;
			if (checked) {
				parentLabel.classList.add('checked');
				checkbox.checked = true;
			}
			else {
				parentLabel.classList.remove('checked');
				checkbox.checked = false;
			}
		});
	});

	document.getElementById('select-reds').addEventListener('change', function (event) {
		let checkall = document.querySelectorAll('.task-status input[type="checkbox"]');
		checkall.forEach(function (checkbox) {
			const parentLabel = checkbox.parentElement;
			parentLabel.classList.remove('checked');
			checkbox.checked = false;
		});
		let checked = event.target.checked;
		let checkboxes = document.querySelectorAll('.task-status.red input[type="checkbox"]');
		checkboxes.forEach(function (checkbox) {
			const parentLabel = checkbox.parentElement;
			if (checked) {
				parentLabel.classList.add('checked');
				checkbox.checked = true;
			}
			else {
				parentLabel.classList.remove('checked');
				checkbox.checked = false;
			}
		});
	});
	browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
		if (request.message === 'spinner_hidden') {
			let hasTaskPassed = false;
			let taskId = request.taskId;
			let label = document.querySelector(`label[data-task-id="${taskId}"]`);
			let checkbox = label.querySelector('input[type="checkbox"]');
			let studentTaskDoneElement = new DOMParser().parseFromString(request.studentTaskDoneElement, 'text/html').body.firstChild;

			label.classList.remove('running');
			label.classList.remove('checked');
			checkbox.checked = false;
			if (studentTaskDoneElement.classList.contains('yes')) {
				label.classList.add('green');
				label.classList.remove('red');
				hasTaskPassed = true;
			} else {
				label.classList.add('red');
				label.classList.remove('green');
			}

			// get the textSpan element
			let textSpan = label.querySelector('.task-index');
			// update the text of the textSpan element to show temp feedback
			let originalText = textSpan.textContent;
			textSpan.textContent = hasTaskPassed ? 'OK' : 'X';

			console.log(`originalText: ${originalText}`); // log the original text

			setTimeout(function () {
				console.log('setTimeout called'); // log when the setTimeout function is called
				textSpan.textContent = originalText;
			}, 1000);
		}
	});
};
