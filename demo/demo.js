var Demo = (function() {
	function popupResult(result) {
		var html;
		if (result.html) {
			html = result.html;
		}
		if (result.src) {
			html = '<img src="' + result.src + '" />';
		}
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

		mc.addEventListener('update', function (ev) {
			console.log('update', ev);
		});

		var mi = document.querySelector('.js-main-image');
		mi.addEventListener('click', function (ev) {
			cropper1.result({
				type: 'rawcanvas',
				circle: true,
            	format: 'png'
            }).then(function (canvas) {
				popupResult({
					src: canvas.toDataURL()
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
			var w = parseInt(document.querySelector('.basic-width').value, 10),
				h = parseInt(document.querySelector('.basic-height').value, 10),
				size = 'viewport';
			if (w || h) {
				size = { width: w, height: h };
			}

			basic.result({
				type: 'canvas',
				size: size,
				resultSize: {
					width: 50,
					height: 50
				}
			}).then(function (resp) {
				popupResult({
					src: resp
				});
			});
		});
	}

	function demoVanilla() {
		var vEl = document.getElementById('vanilla-demo');
		var vanilla = new Croppie(vEl, {
			viewport: { width: 200, height: 100 },
			boundary: { width: 300, height: 300 },
			showZoomer: false,
            enableOrientation: true
		});
		vanilla.bind({
            url: 'demo/demo-2.jpg',
            orientation: 4,
            zoom: 0
        });
        vEl.addEventListener('update', function (ev) {
        	console.log('vanilla update', ev);
        });
		document.querySelector('.vanilla-result').addEventListener('click', function (ev) {
			vanilla.result({
				type: 'blob'
			}).then(function (blob) {
				popupResult({
					src: window.URL.createObjectURL(blob)
				});
			});
		});

		var vRotate = document.querySelectorAll('.vanilla-rotate');
		vRotate.forEach(function (el) {
			el.addEventListener('click', function (ev) {
				vanilla.rotate(parseInt(el.dataset.deg));
			});
		});
	}

    function demoResizer() {
		var vEl = document.getElementById('resizer-demo'),
			resize = new Croppie(vEl, {
			viewport: { width: 100, height: 100 },
			boundary: { width: 300, height: 300 },
			showZoomer: false,
            enableResize: true,
            enableOrientation: true,
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
			resize.result({
				type: 'blob'
			}).then(function (blob) {
				popupResult({
					src: window.URL.createObjectURL(blob)
				});
			});
		});
	}

	function demoUpload() {
		var uploadEl = document.getElementById('upload-demo');
		var uploadCrop = new Croppie(uploadEl, {
			enableExif: true,
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
				type: 'canvas',
				size: 'viewport'
			}).then(function (resp) {
				popupResult({
					src: resp
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
		demoVanilla();	
		demoResizer();
		demoUpload();
		demoHidden();
	}

	return {
		init: init
	};
})();
