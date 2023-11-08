import { Cropt } from "./build/cropt.js";

function popupResult(result) {
    const resultModal = new bootstrap.Modal(document.getElementById('resultModal'));
    const imgClass = (result.viewport === "circle") ? "rounded-circle" : "";
    const bodyEl = document.querySelector('#resultModal .modal-body');
    bodyEl.innerHTML = `<img src="${result.src}" class="${imgClass}" style="max-width: 280px; max-height: 280px;" />`;
    resultModal.show();
}

let photos = [
    "girl-piano.jpg",
    "hiker.jpg",
    "kitten.jpg",
    "toucan.jpg",
    "woman-dog.jpg",
];

let photoSrc = "photos/" + photos[Math.floor(Math.random() * photos.length)];
let viewportWidth = 200;
let viewportHeight = 200;
let viewportType = "circle";
let mouseWheelZoom = "on";
let zoomerInputClass = "form-range";

function getCode() {
    return `import { Cropt } from "cropt";

const cropEl = document.getElementById("img-crop");
const resultBtn = document.getElementById("result-btn");

const cropt = new Cropt(cropEl, {
    viewport: {
        width: ${viewportWidth},
        height: ${viewportHeight},
        type: "${viewportType}",
    },
    mouseWheelZoom: "${mouseWheelZoom}";
    zoomerInputClass: "${zoomerInputClass}"
});

cropt.bind("${photoSrc}");

resultBtn.addEventListener("click", () => {
    cropt.toCanvas(350).then((canvas) => {
        let url = canvas.toDataURL();
        // Data URL can be set as the src of an image element.
        // Display in modal dialog.
    });
});`;
}

function setCode() {
    const code = getCode();
    document.getElementById('code-el').innerHTML = hljs.highlight(code, { language: 'javascript' }).value;
}

function demoMain () {
    const cropEl = document.getElementById('cropper-1');
    const resultBtn = document.getElementById('resultBtn');

    var cropt = new Cropt(cropEl, {
        viewport: {
            width: viewportWidth,
            height: viewportHeight,
            type: viewportType,
        },
        zoomerInputClass: zoomerInputClass,
    });

    cropt.bind(photoSrc);
    
    resultBtn.onclick = function () {
        cropt.toCanvas(400).then(function (canvas) {
            popupResult({
                src: canvas.toDataURL(),
                viewport: cropt.options.viewport.type,
            });
        });
    };

	const vpTypeSelect = document.getElementById('viewportType');
	vpTypeSelect.value = viewportType;

    vpTypeSelect.onchange = function (ev) {
        viewportType = ev.target.value;
        setCode();
        cropt.options.viewport.type = viewportType;
        cropt.refresh();
    };

    const widthRange = document.getElementById('widthRange');
    widthRange.value = viewportWidth;

    widthRange.oninput = function (ev) {
		viewportWidth = +ev.target.value;
		setCode();
		cropt.options.viewport.width = viewportWidth;
		cropt.refresh();
    };

	const heightRange = document.getElementById('heightRange');
    heightRange.value = viewportHeight;

    heightRange.oninput = function (ev) {
		viewportHeight = +ev.target.value;
		setCode();
		cropt.options.viewport.height = viewportHeight;
		cropt.refresh();
    };

	const mouseWheelSelect = document.getElementById('mouseWheelSelect');
	mouseWheelSelect.value = mouseWheelZoom;

    mouseWheelSelect.onchange = function (ev) {
        mouseWheelZoom = ev.target.value;
        setCode();
        cropt.options.mouseWheelZoom = mouseWheelZoom;
    };

	/** @type {HTMLInputElement} */
	const fileInput = document.getElementById('imgFile');
	fileInput.value = "";

	fileInput.onchange = function () {
		if (fileInput.files && fileInput.files[0]) {
			const file = fileInput.files[0];
			photoSrc = file.name;
			setCode();
			const reader = new FileReader();
 
			reader.onload = (e) => {
				cropt.bind(e.target.result).then(() => {
					console.log('upload bind complete');
				});
			}
 
			reader.readAsDataURL(file);
		}
	};

    setCode();
}

demoMain();
