import { Cropt } from "../cropt.js";

function popupResult(result) {
	var html = '<img src="' + result.src + '" class="' + result.viewport + '" style="max-width: 200px" />';
	Swal.fire({
		title: '',
		html: html,
		allowOutsideClick: true
	});
}

function demoMain () {
	var mc = document.getElementById('cropper-1');

	var cropper1 = new Cropt(mc, {
		viewport: {
			type: 'circle'
		},
	});

	cropper1.bind("demo/woman-dog.jpg");

	var mi = document.querySelector('.js-main-image');
	mi.addEventListener('click', function () {
		cropper1.toCanvas(300).then(function (canvas) {
			popupResult({
				src: canvas.toDataURL(),
				viewport: cropper1.options.viewport.type,
			});
		});
	});
}

function demoBasic() {
	var basicEl = document.getElementById('demo-basic');
	var basic = new Cropt(basicEl, {
		viewport: {
			width: 150,
			height: 200
		},
	});

	basic.bind('demo/toucan.jpg', 0.25);

	var basicResult = document.querySelector('.basic-result');
	basicResult.addEventListener('click', function () {
		basic.toCanvas(350).then(function (canvas) {
			popupResult({
				src: canvas.toDataURL()
			});
		});
	});
}

function demoUpload() {
	var uploadEl = document.getElementById('upload-demo');
	var uploadCrop = new Cropt(uploadEl, {
		viewport: {
			type: 'circle'
		},
	});

	function readFile(input) {
		 if (input.files && input.files[0]) {
			var reader = new FileReader();

			reader.onload = function (e) {
				document.querySelector('.upload-demo').classList.add('ready');

				uploadCrop.bind(e.target.result).then(function () {
					console.log('uploadCrop bind complete');
				});
			}

			reader.readAsDataURL(input.files[0]);
		}
	}

	var uploadEl = document.getElementById('upload');
	uploadEl.addEventListener('change', function () {
		readFile(uploadEl);
	});

	document.querySelector('.upload-result').addEventListener('click', function (ev) {
		uploadCrop.toCanvas(300).then(function (canvas) {
			popupResult({
				src: canvas.toDataURL("image/webp", 1),
				viewport: uploadCrop.options.viewport.type,
			});
		});
	});
}

function demoHidden() {
	var hidEl = document.getElementById('hidden-demo');
	var hiddenResult = document.querySelector('.hidden-result');

	var hiddenCrop = new Cropt(hidEl, {
		viewport: {
			width: 175,
			height: 175,
			type: 'circle'
		},
	});

	hiddenCrop.bind('demo/girl-piano.jpg');	

	hiddenResult.addEventListener('click', function (ev) {
		hiddenCrop.toCanvas(300).then(function (canvas) {
			popupResult({
				src: canvas.toDataURL("image/webp", 1),
				viewport: hiddenCrop.options.viewport.type,
			});
		});
	});

	toggle(hiddenResult);

	document.querySelector('.toggle-hidden').addEventListener('click', function () {
		toggle(hidEl);
		toggle(hiddenResult);
		hiddenCrop.refresh();
	});
}

function toggle(el) {
	if (el.style.display == 'none') {
		el.style.display = '';
	} else {
		el.style.display = 'none';
	}
}

demoMain();
demoBasic();
demoUpload();
demoHidden();
