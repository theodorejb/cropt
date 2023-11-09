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

let options = {
    viewport: {
        width: 200,
        height: 200,
        type: "circle",
    },
    mouseWheelZoom: "on",
    zoomerInputClass: "form-range",
};

function getCode() {
    const optionStr = JSON.stringify(options, undefined, 4);

    return `import { Cropt } from "cropt";

const cropEl = document.getElementById("img-crop");
const resultBtn = document.getElementById("result-btn");

const cropt = new Cropt(cropEl, ${optionStr});

cropt.bind("${photoSrc}");

resultBtn.addEventListener("click", () => {
    cropt.toCanvas(400).then((canvas) => {
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
    const cropt = new Cropt(cropEl, options);
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
    vpTypeSelect.value = options.viewport.type;

    vpTypeSelect.onchange = function (ev) {
        options.viewport.type = ev.target.value;
        setCode();
        cropt.setOptions(options);
    };

    const widthRange = document.getElementById('widthRange');
    widthRange.value = options.viewport.width;

    widthRange.oninput = function (ev) {
        options.viewport.width = +ev.target.value;
        setCode();
        cropt.setOptions(options);
    };

    const heightRange = document.getElementById('heightRange');
    heightRange.value = options.viewport.height;

    heightRange.oninput = function (ev) {
        options.viewport.height = +ev.target.value;
        setCode();
        cropt.setOptions(options);
    };

    const mouseWheelSelect = document.getElementById('mouseWheelSelect');
    mouseWheelSelect.value = options.mouseWheelZoom;

    mouseWheelSelect.onchange = function (ev) {
        options.mouseWheelZoom = ev.target.value;
        setCode();
        cropt.setOptions(options);
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
