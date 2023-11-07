import { Croppie } from "../croppie.js";

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

	var cropper1 = new Croppie(mc, {
		viewport: {
			width: 150,
			height: 150,
			type: 'circle'
		},
		boundary: {
			width: 300,
			height: 300
		},
	});

	cropper1.bind("demo/demo-1.jpg");

	mc.addEventListener('update', function (ev) {
		console.log('main update', ev);
	});

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
	var basic = new Croppie(basicEl, {
		viewport: {
			width: 150,
			height: 200
		},
		boundary: {
			width: 300,
			height: 300
		},
	});

	basic.bind('demo/cat.jpg', null, [77, 469, 280, 739]);

	var basicResult = document.querySelector('.basic-result');
	basicResult.addEventListener('click', function () {
		basic.toCanvas(300).then(function (canvas) {
			popupResult({
				src: canvas.toDataURL()
			});
		});
	});
}

function demoResizer() {
	var vEl = document.getElementById('resizer-demo'),
		resize = new Croppie(vEl, {
		viewport: { width: 150, height: 150 },
		boundary: { width: 300, height: 300 },
		showZoomer: false,
		enableResize: true,
		mouseWheelZoom: 'ctrl'
	});
	resize.bind('demo/demo-2.jpg', 0);
	vEl.addEventListener('update', function (ev) {
		console.log('resize update', ev);
	});
	document.querySelector('.resizer-result').addEventListener('click', function (ev) {
		resize.toBlob(300).then(function (blob) {
			popupResult({
				src: window.URL.createObjectURL(blob)
			});
		});
	});
}

function demoUpload() {
	var uploadEl = document.getElementById('upload-demo');
	var uploadCrop = new Croppie(uploadEl, {
		viewport: {
			width: 200,
			height: 200,
			type: 'circle'
		},
		boundary: {
			width: 300,
			height: 300
		}
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

	var hiddenCrop = new Croppie(hidEl, {
		viewport: {
			width: 175,
			height: 175,
			type: 'circle'
		},
		boundary: {
			width: 200,
			height: 200
		}
	});

	hiddenCrop.bind('demo/demo-3.jpg');	

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
demoResizer();
demoUpload();
demoHidden();
