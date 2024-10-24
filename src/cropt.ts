class Transform {
    x: number;
    y: number;
    scale: number;

    constructor(x: number, y: number, scale: number) {
        this.x = x;
        this.y = y;
        this.scale = scale;
    }

    toString() {
        return 'translate(' + this.x + 'px, ' + this.y + 'px' + ') scale(' + this.scale + ')';
    }

    static parse(img: HTMLImageElement) {
        const v = img.style.transform;

        var values = v.split(') '),
        translate = values[0].substring("translate".length + 1).split(','),
        scale = values.length > 1 ? values[1].substring(6) : "1",
        x = translate.length > 1 ? translate[0] : "0",
        y = translate.length > 1 ? translate[1] : "0";

        return new Transform(parseFloat(x), parseFloat(y), parseFloat(scale));
    }
}

class TransformOrigin {
    x: number;
    y: number;

    constructor(el?: HTMLImageElement) {
        if (!el || !el.style.transformOrigin) {
            this.x = 0;
            this.y = 0;
            return;
        }
        var css = el.style.transformOrigin.split(' ');
        this.x = parseFloat(css[0]);
        this.y = parseFloat(css[1]);
    }

    toString() {
        return this.x + 'px ' + this.y + 'px';
    }
}

function debounce<T extends Function>(func: T, wait: number) {
    let timer = 0;
    return (...args: any) => {
        clearTimeout(timer);
        timer = setTimeout(() => func(...args), wait);
    };
}

function fix(value: number, decimalPoints: number) {
    return value.toFixed(decimalPoints);
}

function setZoomerVal(value: number, zoomer: HTMLInputElement) {
    const zMin = parseFloat(zoomer.min);
    const zMax = parseFloat(zoomer.max);

    zoomer.value = fix(Math.max(zMin, Math.min(zMax, value)), 3);
}

function loadImage(src: string): Promise<HTMLImageElement> {
    var img = new Image();

    return new Promise(function (resolve, reject) {
        img.onload = () => {
            resolve(img);
        };
        img.onerror = reject;
        img.src = src;
    });
}

function getInitialElements() {
    return {
        boundary: document.createElement('div'),
        viewport: document.createElement('div'),
        preview: document.createElement('img'),
        overlay: document.createElement('div'),
        zoomerWrap: document.createElement('div'),
        zoomer: document.createElement('input'),
    };
}

function getArrowKeyDeltas(key: string): [number, number] {
    if (key === "ArrowLeft") {
        return [2, 0];
    } else if (key === "ArrowUp") {
        return [0, 2];
    } else if (key === "ArrowRight") {
        return [-2, 0];
    } else {
        return [0, -2];
    }
}

function canvasSupportsWebP() {
    // https://caniuse.com/mdn-api_htmlcanvaselement_toblob_type_parameter_webp
    return document.createElement('canvas')
        .toDataURL('image/webp')
        .startsWith('data:image/webp');
}

type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>;
};

export interface CroptOptions {
    mouseWheelZoom: "off" | "on" | "ctrl";
    viewport: {
        width: number;
        height: number;
        type: "square" | "circle";
    }
    zoomerInputClass: string;
}

interface CropPoints {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export class Cropt {
    element: HTMLElement;
    elements: {
        boundary: HTMLDivElement;
        viewport: HTMLDivElement;
        preview: HTMLImageElement;
        overlay: HTMLDivElement;
        zoomerWrap: HTMLDivElement;
        zoomer: HTMLInputElement;
    };
    options: CroptOptions = {
        mouseWheelZoom: "on",
        viewport: {
            width: 220,
            height: 220,
            type: 'square',
        },
        zoomerInputClass: 'cr-slider',
    };
    #boundZoom: number | null = null;
    #scale = 1;
    #keyDownHandler: ((ev: KeyboardEvent) => void) | null = null;
    #updateOverlayDebounced = debounce(() => {
        this.#updateOverlay();
    }, 200);

    constructor(element: HTMLElement, options: RecursivePartial<CroptOptions>) {
        if (element.classList.contains('cropt-container')) {
            throw new Error("Cropt is already initialized on this element");
        }

        if (options.viewport) {
            options.viewport = {...this.options.viewport, ...options.viewport};
        }

        this.options = {...this.options, ...options as CroptOptions};
        this.element = element;
        this.element.classList.add('cropt-container');

        this.elements = getInitialElements();
        this.elements.zoomerWrap.classList.add('cr-slider-wrap');
        this.elements.boundary.classList.add('cr-boundary');
        this.elements.viewport.classList.add('cr-viewport');
        this.elements.overlay.classList.add('cr-overlay');

        this.elements.viewport.setAttribute('tabindex', "0");
        this.#setPreviewAttributes(this.elements.preview);

        this.elements.boundary.appendChild(this.elements.preview);
        this.elements.boundary.appendChild(this.elements.viewport);
        this.elements.boundary.appendChild(this.elements.overlay);

        this.elements.zoomer.type = 'range';
        this.elements.zoomer.step = '0.001';
        this.elements.zoomer.value = '1';
        this.elements.zoomer.setAttribute('aria-label', 'zoom');

        this.element.appendChild(this.elements.boundary);
        this.element.appendChild(this.elements.zoomerWrap);
        this.elements.zoomerWrap.appendChild(this.elements.zoomer);

        this.#setOptionsCss();
        this.#initDraggable();
        this.#initializeZoom();
    }

    /**
     * Bind an image from an src string.
     * Returns a Promise which resolves when the image has been loaded and state is initialized.
     */
    bind(src: string, zoom: number | null = null) {
        if (!src) {
            throw new Error('src cannot be empty');
        }

        this.#boundZoom = zoom;

        return loadImage(src).then((img) => {
            this.#replaceImage(img);
            this.#updatePropertiesFromImage();
        });
    }

    #getPoints() {
        var imgData = this.elements.preview.getBoundingClientRect(),
            vpData = this.elements.viewport.getBoundingClientRect(),
            x1 = vpData.left - imgData.left,
            y1 = vpData.top - imgData.top,
            widthDiff = (vpData.width - this.elements.viewport.offsetWidth) / 2, //border
            heightDiff = (vpData.height - this.elements.viewport.offsetHeight) / 2,
            x2 = x1 + this.elements.viewport.offsetWidth + widthDiff,
            y2 = y1 + this.elements.viewport.offsetHeight + heightDiff;

        x1 = Math.max(0, x1 / this.#scale);
        y1 = Math.max(0, y1 / this.#scale);
        x2 = Math.max(0, x2 / this.#scale);
        y2 = Math.max(0, y2 / this.#scale);

        return {
            left: Math.round(x1),
            top: Math.round(y1),
            right: Math.round(x2),
            bottom: Math.round(y2),
        };
    }

    /**
     * Returns a Promise resolving to an HTMLCanvasElement object for the cropped image.
     * If size is specified, the image will be scaled with its longest side set to size.
     */
    toCanvas(size: number | null = null) {
        var vpRect = this.elements.viewport.getBoundingClientRect();
        var ratio = vpRect.width / vpRect.height;
        var points = this.#getPoints();
        var width = points.right - points.left;
        var height = points.bottom - points.top;

        if (size !== null) {
            if (ratio > 1) {
                width = size;
                height = size / ratio;
            } else {
                height = size;
                width = size * ratio;
            }
        }

        return Promise.resolve(this.#getCanvas(points, width, height));
    }

    toBlob(size: number | null = null, type = "image/webp", quality = 1): Promise<Blob> {
        if (type === "image/webp" && quality < 1 && !canvasSupportsWebP()) {
            type = "image/jpeg";
        }

        return new Promise((resolve, reject) => {
            this.toCanvas(size).then((canvas) => {
                canvas.toBlob((blob) => {
                    if (blob === null) {
                        reject("Canvas blob is null");
                    } else {
                        resolve(blob);
                    }
                }, type, quality);
            });
        });
    }

    refresh() {
        this.#updatePropertiesFromImage();
    }

    setOptions(options: RecursivePartial<CroptOptions>) {
        const curWidth = this.options.viewport.width;
        const curHeight = this.options.viewport.height;

        if (options.viewport) {
            options.viewport = {...this.options.viewport, ...options.viewport};
        }

        this.options = {...this.options, ...options as CroptOptions};
        this.#setOptionsCss();

        if (this.options.viewport.width !== curWidth || this.options.viewport.height !== curHeight) {
            this.refresh();
        }
    }

    setZoom(value: number) {
        setZoomerVal(value, this.elements.zoomer);
        var event = new Event('input');
        this.elements.zoomer.dispatchEvent(event); // triggers this.#onZoom call
    }

    destroy() {
        if (this.#keyDownHandler) {
            document.removeEventListener("keydown", this.#keyDownHandler);
        }
        this.element.removeChild(this.elements.boundary);
        this.element.classList.remove('cropt-container');
        this.element.removeChild(this.elements.zoomerWrap);
        this.elements = getInitialElements();
    }

    #setOptionsCss() {
        this.elements.zoomer.className = this.options.zoomerInputClass;
        const circleClass = "cr-vp-circle";
        const viewport = this.elements.viewport;

        if (this.options.viewport.type === "circle") {
            viewport.classList.add(circleClass);
        } else {
            viewport.classList.remove(circleClass)
        }

        viewport.style.width = this.options.viewport.width + 'px';
        viewport.style.height = this.options.viewport.height + 'px';
    }

    #getUnscaledCanvas(p: CropPoints) {
        var sWidth = p.right - p.left;
        var sHeight = p.bottom - p.top;
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext("2d");

        if (ctx === null) {
            throw new Error("Canvas context cannot be null");
        }

        canvas.width = sWidth;
        canvas.height = sHeight;
        ctx.drawImage(this.elements.preview, p.left, p.top, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

        return canvas;
    }

    #getCanvas(points: CropPoints, width: number, height: number) {
        var oc = this.#getUnscaledCanvas(points);
        var octx = oc.getContext('2d');
        var buffer = document.createElement('canvas');
        var bctx = buffer.getContext("2d");
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext("2d");
        canvas.width = width;
        canvas.height = height;

        if (ctx === null || octx === null || bctx === null) {
            throw new Error("Canvas context cannot be null");
        }

        var cur = {
            width: oc.width,
            height: oc.height,
        }
    
        while (cur.width * 0.5 > canvas.width) {
            // step down size by one half for smooth scaling
            let curWidth = cur.width;
            let curHeight = cur.height;

            cur = {
                width: Math.floor(cur.width * 0.5),
                height: Math.floor(cur.height * 0.5)
            };

            // write oc to buffer
            buffer.width = curWidth;
            buffer.height = curHeight;
            bctx.clearRect(0, 0, buffer.width, buffer.height);
            bctx.drawImage(oc, 0, 0);

            // clear oc
            octx.clearRect(0, 0, curWidth, curHeight);

            octx.drawImage(buffer, 0, 0, curWidth, curHeight, 0, 0, cur.width, cur.height);
        }

        ctx.drawImage(oc, 0, 0, cur.width, cur.height, 0, 0, canvas.width, canvas.height);
        return canvas;
    }

    #getVirtualBoundaries() {
        var scale = this.#scale,
            viewport = this.elements.viewport.getBoundingClientRect(),
            vpWidth = viewport.width,
            vpHeight = viewport.height,
            centerFromBoundaryX = this.elements.boundary.clientWidth / 2,
            centerFromBoundaryY = this.elements.boundary.clientHeight / 2,
            imgRect = this.elements.preview.getBoundingClientRect(),
            curImgWidth = imgRect.width,
            curImgHeight = imgRect.height,
            halfWidth = vpWidth / 2,
            halfHeight = vpHeight / 2;

        var maxX = ((halfWidth / scale) - centerFromBoundaryX) * -1;
        var minX = maxX - ((curImgWidth * (1 / scale)) - (vpWidth * (1 / scale)));

        var maxY = ((halfHeight / scale) - centerFromBoundaryY) * -1;
        var minY = maxY - ((curImgHeight * (1 / scale)) - (vpHeight * (1 / scale)));

        var originMinX = (1 / scale) * halfWidth;
        var originMaxX = (curImgWidth * (1 / scale)) - originMinX;

        var originMinY = (1 / scale) * halfHeight;
        var originMaxY = (curImgHeight * (1 / scale)) - originMinY;

        return {
            translate: {
                maxX: maxX,
                minX: minX,
                maxY: maxY,
                minY: minY
            },
            origin: {
                maxX: originMaxX,
                minX: originMinX,
                maxY: originMaxY,
                minY: originMinY
            }
        };
    }

    #assignTransformCoordinates(deltaX: number, deltaY: number) {
        const imgRect = this.elements.preview.getBoundingClientRect();
        const vpRect = this.elements.viewport.getBoundingClientRect();
        const transform = Transform.parse(this.elements.preview);

        const clampedDeltaY = Math.max(Math.min(vpRect.top - imgRect.top, deltaY), vpRect.bottom - imgRect.bottom);
        const clampedDeltaX = Math.max(Math.min(vpRect.left - imgRect.left, deltaX), vpRect.right - imgRect.right);

        transform.y += clampedDeltaY;
        transform.x += clampedDeltaX;

        this.#updateCenterPoint(transform);
        this.#updateOverlayDebounced();
    }

    #initDraggable() {
        let originalX = 0;
        let originalY = 0;
        let pEventCache: PointerEvent[] = [];
        let origPinchDistance = 0;

        let pointerMove = (ev: PointerEvent) => {
            ev.preventDefault();
            const cacheIndex = pEventCache.findIndex((cEv) => cEv.pointerId === ev.pointerId);

            if (cacheIndex === -1) {
                // can occur when pinch gesture initiated with one pointer outside
                // the overlay and then moved inside (particularly in Safari).
                return;
            } else {
                pEventCache[cacheIndex] = ev; // update cached event
            }

            if (pEventCache.length === 2) {
                let touch1 = pEventCache[0];
                let touch2 = pEventCache[1];
                let dist = Math.sqrt((touch1.pageX - touch2.pageX) * (touch1.pageX - touch2.pageX) + (touch1.pageY - touch2.pageY) * (touch1.pageY - touch2.pageY));

                if (origPinchDistance === 0) {
                    origPinchDistance = dist / this.#scale;
                }

                this.setZoom(dist / origPinchDistance);
                return;
            } else if (origPinchDistance !== 0) {
                return; // ignore single pointer movement after pinch zoom
            }

            this.#assignTransformCoordinates(ev.pageX - originalX, ev.pageY - originalY);
            originalX = ev.pageX;
            originalY = ev.pageY;
        };

        let pointerUp = (ev: PointerEvent) => {
            const cacheIndex = pEventCache.findIndex((cEv) => cEv.pointerId === ev.pointerId);

            if (cacheIndex !== -1) {
                pEventCache.splice(cacheIndex, 1);
            }

            if (pEventCache.length === 0) {
                this.elements.overlay.removeEventListener('pointermove', pointerMove);
                this.elements.overlay.removeEventListener('pointerup', pointerUp);
                this.elements.overlay.removeEventListener('pointerout', pointerUp);

                this.#setDragState(false, this.elements.preview);
                origPinchDistance = 0;
            }
        };

        let pointerDown = (ev: PointerEvent) => {
            if (ev.button) {
                return; // non-left mouse button press
            }

            ev.preventDefault();
            pEventCache.push(ev);
            this.elements.overlay.setPointerCapture(ev.pointerId);

            if (pEventCache.length > 1) {
                return; // ignore additional pointers
            }

            originalX = ev.pageX;
            originalY = ev.pageY;
            this.#setDragState(true, this.elements.preview);

            this.elements.overlay.addEventListener('pointermove', pointerMove);
            this.elements.overlay.addEventListener('pointerup', pointerUp);
            this.elements.overlay.addEventListener('pointerout', pointerUp);
        };

        let keyDown = (ev: KeyboardEvent) => {
            if (document.activeElement !== this.elements.viewport) {
                return;
            }

            if (ev.shiftKey && (ev.key === "ArrowUp" || ev.key === "ArrowDown")) {
                ev.preventDefault();
                let zoomVal = parseFloat(this.elements.zoomer.value);
                let stepVal = (ev.key === "ArrowUp") ? 0.01 : -0.01;
                this.setZoom(zoomVal + stepVal);
            } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(ev.key)) {
                ev.preventDefault();
                let [deltaX, deltaY] = getArrowKeyDeltas(ev.key);
                this.#assignTransformCoordinates(deltaX, deltaY);
            }
        };

        this.elements.overlay.addEventListener('pointerdown', pointerDown);
        document.addEventListener('keydown', keyDown);
        this.#keyDownHandler = keyDown;
    }

    #initializeZoom() {
        let change = () => {
            this.#onZoom();
        };

        let scroll = (ev: WheelEvent) => {
            const optionVal = this.options.mouseWheelZoom;
            let delta = 0;

            if (optionVal === 'off' || optionVal === 'ctrl' && !ev.ctrlKey) {
                return;
            } else if (ev.deltaY) {
                delta = ev.deltaY * -1 / 2000;
            }

            ev.preventDefault();
            this.setZoom(this.#scale + (delta * this.#scale));
        };

        this.elements.zoomer.addEventListener('input', change);
        this.elements.boundary.addEventListener('wheel', scroll);
    }

    #onZoom() {
        const transform = Transform.parse(this.elements.preview);
        const origin = new TransformOrigin(this.elements.preview);

        let applyCss = () => {
            this.elements.preview.style.transform = transform.toString();
            this.elements.preview.style.transformOrigin = origin.toString();
        };

        this.#scale = parseFloat(this.elements.zoomer.value);
        transform.scale = this.#scale;
        applyCss();

        var boundaries = this.#getVirtualBoundaries(),
            transBoundaries = boundaries.translate,
            oBoundaries = boundaries.origin;

        if (transform.x >= transBoundaries.maxX) {
            origin.x = oBoundaries.minX;
            transform.x = transBoundaries.maxX;
        }

        if (transform.x <= transBoundaries.minX) {
            origin.x = oBoundaries.maxX;
            transform.x = transBoundaries.minX;
        }

        if (transform.y >= transBoundaries.maxY) {
            origin.y = oBoundaries.minY;
            transform.y = transBoundaries.maxY;
        }

        if (transform.y <= transBoundaries.minY) {
            origin.y = oBoundaries.maxY;
            transform.y = transBoundaries.minY;
        }

        applyCss();
        this.#updateOverlayDebounced();
    }

    #replaceImage(img: HTMLImageElement) {
        this.#setPreviewAttributes(img);
        if (this.elements.preview.parentNode) {
            this.elements.preview.parentNode.replaceChild(img, this.elements.preview);
        }
        this.elements.preview = img;
    }

    #setPreviewAttributes(preview: HTMLImageElement) {
        preview.classList.add('cr-image');
        preview.setAttribute('alt', 'preview');
        this.#setDragState(false, preview);
    }

    #setDragState(isDragging: boolean, preview: HTMLImageElement) {
        preview.setAttribute('aria-grabbed', isDragging.toString());
        this.elements.boundary.setAttribute('aria-dropeffect', isDragging ? 'move': 'none');
    }

    #isVisible() {
        return this.elements.preview.offsetParent !== null;
    }

    #updateOverlay() {
        const boundRect = this.elements.boundary.getBoundingClientRect();
        const imgData = this.elements.preview.getBoundingClientRect();
        const overlay = this.elements.overlay;

        overlay.style.width = imgData.width + 'px';
        overlay.style.height = imgData.height + 'px';
        overlay.style.top = (imgData.top - boundRect.top) + 'px';
        overlay.style.left = (imgData.left - boundRect.left) + 'px';
    }

    #updatePropertiesFromImage() {
        if (!this.#isVisible()) {
            return;
        }

        const preview = this.elements.preview;
        const transformReset = new Transform(0, 0, 1);
        preview.style.transform = transformReset.toString();
        preview.style.transformOrigin = new TransformOrigin().toString();

        this.#updateZoomLimits();
        transformReset.scale = this.#scale;
        preview.style.transform = transformReset.toString();
        preview.style.transformOrigin = new TransformOrigin().toString();

        this.#centerImage();
        this.#updateOverlay();
    }

    #updateCenterPoint(transform: Transform) {
        var scale = this.#scale,
            data = this.elements.preview.getBoundingClientRect(),
            vpData = this.elements.viewport.getBoundingClientRect(),
            pc = new TransformOrigin(this.elements.preview),
            top = (vpData.top - data.top) + (vpData.height / 2),
            left = (vpData.left - data.left) + (vpData.width / 2);

        var center = { x: left / scale, y: top / scale };
        var adj = {
            x: (center.x - pc.x) * (1 - scale),
            y: (center.y - pc.y) * (1 - scale),
        };

        transform.x -= adj.x;
        transform.y -= adj.y;

        this.elements.preview.style.transform = transform.toString();
        this.elements.preview.style.transformOrigin = center.x + 'px ' + center.y + 'px';
    }

    #updateZoomLimits() {
        var maxZoom = 0.85,
            bData = this.elements.boundary.getBoundingClientRect(),
            img = this.elements.preview,
            vpData = this.elements.viewport.getBoundingClientRect(),
            minW = vpData.width / img.naturalWidth,
            minH = vpData.height / img.naturalHeight,
            minZoom = Math.max(minW, minH);

        if (minZoom >= maxZoom) {
            maxZoom += minZoom;
        }

        this.elements.zoomer.min = fix(minZoom, 3);
        this.elements.zoomer.max = fix(maxZoom, 3);

        var defaultZoom = Math.max((bData.width / img.naturalWidth), (bData.height / img.naturalHeight));
        this.setZoom(this.#boundZoom !== null ? this.#boundZoom : defaultZoom);
    }

    #centerImage() {
        var imgDim = this.elements.preview.getBoundingClientRect(),
            vpDim = this.elements.viewport.getBoundingClientRect(),
            boundDim = this.elements.boundary.getBoundingClientRect(),
            vpLeft = vpDim.left - boundDim.left,
            vpTop = vpDim.top - boundDim.top,
            w = vpLeft - ((imgDim.width - vpDim.width) / 2),
            h = vpTop - ((imgDim.height - vpDim.height) / 2),
            transform = new Transform(w, h, this.#scale);

        this.#updateCenterPoint(transform);
    }
}
