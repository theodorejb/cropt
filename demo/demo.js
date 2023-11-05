var Demo = (function() {
	function popupResult(result) {
		var html = '<img src="' + result.src + '" class="' + result.viewport + '" />';
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

		cropper1.bind({ url: "demo/demo-1.jpg" });

		mc.addEventListener('update', function (ev) {
			console.log('main update', ev);
		});

		var mi = document.querySelector('.js-main-image');
		mi.addEventListener('click', function (ev) {
			cropper1.result({
				type: 'rawcanvas',
            	format: 'png'
            }).then(function (canvas) {
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

		basic.bind({
			url: 'demo/cat.jpg',
			points: [77,469,280,739]
		});

		var basicResult = document.querySelector('.basic-result');
		basicResult.addEventListener('click', function () {
			basic.result({ type: 'base64' }).then(function (resp) {
				popupResult({
					src: resp
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
		resize.bind({
            url: 'demo/demo-2.jpg',
            zoom: 0
        });
        vEl.addEventListener('update', function (ev) {
        	console.log('resize update', ev);
        });
		document.querySelector('.resizer-result').addEventListener('click', function (ev) {
			resize.result({ type: 'blob' }).then(function (blob) {
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

					uploadCrop.bind({
	            		url: e.target.result
	            	}).then(function () {
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
			uploadCrop.result({
				type: 'base64',
				size: 'viewport'
			}).then(function (resp) {
				popupResult({
					src: resp,
					viewport: uploadCrop.options.viewport.type,
				});
			});
		});
	}

	function demoHidden() {
		var hidEl = document.getElementById('hidden-demo');
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
		hiddenCrop.bind({
			url: 'demo/demo-3.jpg'
		});

		document.querySelector('.toggle-hidden').addEventListener('click', function () {
			toggle(hidEl);
			hiddenCrop.bind(); // refresh
		});
	}

	function toggle(el) {
		if (el.style.display == 'none') {
			el.style.display = '';
		} else {
			el.style.display = 'none';
		}
	}

	function init() {
		demoMain();
		demoBasic();
		demoResizer();
		demoUpload();
		demoHidden();
	}

	return {
		init: init
	};
})();
