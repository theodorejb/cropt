class Transform {
    constructor(x, y, scale) {
        this.x = parseFloat(x);
        this.y = parseFloat(y);
        this.scale = parseFloat(scale);
    }

    toString() {
        return 'translate(' + this.x + 'px, ' + this.y + 'px' + ') scale(' + this.scale + ')';
    }

    static parse(v) {
        if (v.style) {
            return Transform.parse(v.style.transform);
        } else if (v.indexOf('matrix') > -1 || v.indexOf('none') > -1) {
            return Transform.fromMatrix(v);
        } else {
            return Transform.fromString(v);
        }
    }

    static fromMatrix(v) {
        var vals = v.substring(7).split(',');
        if (!vals.length || v === 'none') {
            vals = [1, 0, 0, 1, 0, 0];
        }
    
        return new Transform(num(vals[4]), num(vals[5]), parseFloat(vals[0]));
    }

    static fromString(v) {
        var values = v.split(') '),
        translate = values[0].substring("translate".length + 1).split(','),
        scale = values.length > 1 ? values[1].substring(6) : 1,
        x = translate.length > 1 ? translate[0] : 0,
        y = translate.length > 1 ? translate[1] : 0;

        return new Transform(x, y, scale);
    }
}

class TransformOrigin {
    constructor(el) {
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

// Credits to : Andrew Dupont - http://andrewdupont.net/2009/08/28/deep-extending-objects-in-javascript/
function deepExtend(destination, source) {
    destination = destination || {};
    for (var property in source) {
        if (source[property] && source[property].constructor && source[property].constructor === Object) {
            destination[property] = destination[property] || {};
            deepExtend(destination[property], source[property]);
        } else {
            destination[property] = source[property];
        }
    }
    return destination;
}

function clone(object) {
    return deepExtend({}, object);
}

function debounce(func, wait) {
    let timeoutId;

    return (...args) => {
        clearTimeout(timeoutId);

        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, wait);
    };
}

function css(el, styles) {
    for (var prop in styles) {
        el.style[prop] = styles[prop];
    }
}

function num(v) {
    return parseInt(v, 10);
}

function fix(v, decimalPoints) {
    return parseFloat(v).toFixed(decimalPoints || 0);
}

/**
 * @param {string} src 
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(src) {
    var img = new Image();

    return new Promise(function (resolve, reject) {
        img.onload = () => {
            resolve(img);
        };
        img.onerror = reject;
        img.src = src;
    });
}

export class Cropt {
    static defaults = {
        viewport: {
            width: 200,
            height: 200,
            type: 'square'
        },
        zoomerInputClass: 'cr-slider',
        mouseWheelZoom: true,
    };

    /**
     * @param {HTMLElement} element
     */
    constructor(element, options) {
        if (element.classList.contains('cropt-container')) {
            throw new Error("Cropt is already initialized on this element");
        }

        this.element = element;
        this.element.classList.add('cropt-container');
        this.options = deepExtend(clone(Cropt.defaults), options);
        this.#create();
    }

    /**
     * Bind an image from an src string. Returns a Promise which resolves when the image has been loaded and state is initialized.
     * @param {string} src 
     * @param {number | null} zoom 
     * @returns {Promise<void>}
     */
    bind(src, zoom = null) {
        if (!src) {
            throw new Error('src cannot be empty');
        }

        this.data.boundZoom = zoom;

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
            y2 = y1 + this.elements.viewport.offsetHeight + heightDiff,
            scale = this._currentZoom;

        if (scale === Infinity || isNaN(scale)) {
            scale = 1;
        }

        x1 = Math.max(0, x1 / scale);
        y1 = Math.max(0, y1 / scale);
        x2 = Math.max(0, x2 / scale);
        y2 = Math.max(0, y2 / scale);

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
     * @param {number | null} size
     * @returns {Promise<HTMLCanvasElement>}
     */
    toCanvas(size = null) {
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

    /**
     * @param {number | null} size
     * @param {string} type
     * @param {number} quality
     * @returns {Promise<Blob>}
     */
    toBlob(size = null, type = "image/webp", quality = 1) {
        return new Promise((resolve) => {
            this.toCanvas(size).then((canvas) => {
                canvas.toBlob(resolve, type, quality);
            });
        });
    }

    refresh() {
        this.#updatePropertiesFromImage();
    }

    setOptions(options) {
        const curWidth = this.options.viewport.width;
        const curHeight = this.options.viewport.height;
        
        this.options = deepExtend(this.options, options);
        this.#setOptionsCss();

        if (this.options.viewport.width !== curWidth || this.options.viewport.height !== curHeight) {
            this.refresh();
        }
    }

    /**
     * @param {number} value
     */
    setZoom(value) {
        this.#setZoomerVal(value);
        var event = new Event('input');
        this.elements.zoomer.dispatchEvent(event);
    }

    destroy() {
        document.removeEventListener("keydown", this.keyDownHandler);
        this.element.removeChild(this.elements.boundary);
        this.element.classList.remove('cropt-container');
        this.element.removeChild(this.elements.zoomerWrap);
        delete this.elements;
    }

    #create() {
        // Properties on class
        this.data = {};
        this.elements = {};

        var boundary = this.elements.boundary = document.createElement('div');
        var viewport = this.elements.viewport = document.createElement('div');
        var preview = this.elements.preview = document.createElement('img');
        var overlay = this.elements.overlay = document.createElement('div');
        var zoomerWrap = this.elements.zoomerWrap = document.createElement('div');
        var zoomer = this.elements.zoomer = document.createElement('input');

        boundary.classList.add('cr-boundary');
        boundary.setAttribute('aria-dropeffect', 'none');
        viewport.setAttribute('tabindex', 0);
        viewport.classList.add('cr-viewport');

        this.#setPreviewAttributes(preview);
        overlay.classList.add('cr-overlay');

        this.element.appendChild(boundary);
        boundary.appendChild(preview);
        boundary.appendChild(viewport);
        boundary.appendChild(overlay);

        zoomerWrap.classList.add('cr-slider-wrap');
        zoomer.type = 'range';
        zoomer.step = '0.001';
        zoomer.value = '1';
        zoomer.setAttribute('aria-label', 'zoom');

        this.element.appendChild(zoomerWrap);
        zoomerWrap.appendChild(zoomer);

        this.#setOptionsCss();
        this.#initDraggable();
        this.#initializeZoom();
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

        css(viewport, {
            width: this.options.viewport.width + 'px',
            height: this.options.viewport.height + 'px'
        });
    }

    #getUnscaledCanvas(p) {
        var sWidth = p.right - p.left;
        var sHeight = p.bottom - p.top;

        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext("2d");
        canvas.width = sWidth;
        canvas.height = sHeight;
        ctx.drawImage(this.elements.preview, p.left, p.top, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

        return canvas;
    }

    #getCanvas(points, width, height) {
        var oc = this.#getUnscaledCanvas(points);
        var octx = oc.getContext('2d');
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext("2d");
        canvas.width = width;
        canvas.height = height;

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

            octx.drawImage(oc, 0, 0, curWidth, curHeight, 0, 0, cur.width, cur.height);
        }

        ctx.drawImage(oc, 0, 0, cur.width, cur.height, 0, 0, canvas.width, canvas.height);
        return canvas;
    }

    #getVirtualBoundaries(viewport) {
        var scale = this._currentZoom,
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

    #initDraggable() {
        var originalX = 0,
            originalY = 0,
            vpRect,
            transform;

        let assignTransformCoordinates = (deltaX, deltaY) => {
            var imgRect = this.elements.preview.getBoundingClientRect(),
                top = transform.y + deltaY,
                left = transform.x + deltaX;

            if (vpRect.top > imgRect.top + deltaY && vpRect.bottom < imgRect.bottom + deltaY) {
                transform.y = top;
            }

            if (vpRect.left > imgRect.left + deltaX && vpRect.right < imgRect.right + deltaX) {
                transform.x = left;
            }
        };

        let toggleGrabState = (isDragging) => {
            this.elements.preview.setAttribute('aria-grabbed', isDragging);
            this.elements.boundary.setAttribute('aria-dropeffect', isDragging ? 'move': 'none');
        };

        /**
         * @type {PointerEvent[]}
         */
        let pEventCache = [];
        let origPinchDistance = 0;

        /**
         * @param {PointerEvent} ev
         */
        let pointerMove = (ev) => {
            ev.preventDefault();

            // update cached event
            const cacheIndex = pEventCache.findIndex((cEv) => cEv.pointerId === ev.pointerId);
            pEventCache[cacheIndex] = ev;

            if (pEventCache.length === 2) {
                let touch1 = pEventCache[0];
                let touch2 = pEventCache[1];
                let dist = Math.sqrt((touch1.pageX - touch2.pageX) * (touch1.pageX - touch2.pageX) + (touch1.pageY - touch2.pageY) * (touch1.pageY - touch2.pageY));

                if (origPinchDistance === 0) {
                    origPinchDistance = dist / this._currentZoom;
                }

                this.setZoom(dist / origPinchDistance);
                return;
            } else if (origPinchDistance !== 0) {
                return; // ignore single pointer movement after pinch zoom
            }

            let deltaX = ev.pageX - originalX;
            let deltaY = ev.pageY - originalY;
            assignTransformCoordinates(deltaX, deltaY);

            css(this.elements.preview, {
                transform: transform.toString(),
            });

            this.#updateOverlay();
            originalX = ev.pageX;
            originalY = ev.pageY;
        };

        /**
         * @param {PointerEvent} ev
         */
        let pointerUp = (ev) => {
            const cacheIndex = pEventCache.findIndex((cEv) => cEv.pointerId === ev.pointerId);
            pEventCache.splice(cacheIndex, 1);
            this.elements.overlay.releasePointerCapture(ev.pointerId);

            if (pEventCache.length === 0) {
                this.elements.overlay.removeEventListener('pointermove', pointerMove);
                this.elements.overlay.removeEventListener('pointerup', pointerUp);
                this.elements.overlay.removeEventListener('pointercancel', pointerUp);

                toggleGrabState(false);
                this.#updateCenterPoint();
                origPinchDistance = 0;
            }
        };

        /**
         * @param {PointerEvent} ev
         */
        let pointerDown = (ev) => {
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
            toggleGrabState(true);
            transform = Transform.parse(this.elements.preview);
            vpRect = this.elements.viewport.getBoundingClientRect();

            this.elements.overlay.addEventListener('pointermove', pointerMove);
            this.elements.overlay.addEventListener('pointerup', pointerUp);
            this.elements.overlay.addEventListener('pointercancel', pointerUp);
        };

        /**
         * @param {KeyboardEvent} ev
         */
        let keyDown = (ev) => {
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
                let [deltaX, deltaY] = getMovement(ev.key);

                transform = Transform.parse(this.elements.preview);
                vpRect = this.elements.viewport.getBoundingClientRect();
                assignTransformCoordinates(deltaX, deltaY);

                css(this.elements.preview, {
                    transform: transform.toString(),
                });

                this.#updateOverlay();
                this.#updateCenterPoint();
            }

            function getMovement(key) {
                if (key === "ArrowLeft") {
                    return [2, 0];
                } else if (key === "ArrowUp") {
                    return [0, 2];
                } else if (key === "ArrowRight") {
                    return [-2, 0];
                } else if (key === "ArrowDown") {
                    return [0, -2];
                }
            }
        };

        this.elements.overlay.addEventListener('pointerdown', pointerDown);
        document.addEventListener('keydown', keyDown);
        this.keyDownHandler = keyDown;
    }

    #initializeZoom() {
        this._currentZoom = 1;

        let change = () => {
            this.#onZoom({
                value: parseFloat(this.elements.zoomer.value),
                origin: new TransformOrigin(this.elements.preview),
                viewportRect: this.elements.viewport.getBoundingClientRect(),
                transform: Transform.parse(this.elements.preview)
            });
        };

        /**
         * @param {WheelEvent} ev 
         */
        let scroll = (ev) => {
            const optionVal = this.options.mouseWheelZoom;
            let delta = 0;

            if (optionVal === 'off' || optionVal === 'ctrl' && !ev.ctrlKey) {
                return;
            } else if (ev.deltaY) {
                delta = ev.deltaY * -1 / 2000;
            }

            ev.preventDefault();
            this.#setZoomerVal(this._currentZoom + (delta * this._currentZoom));
            change();
        };

        this.elements.zoomer.addEventListener('input', change);
        this.elements.boundary.addEventListener('wheel', scroll);
    }

    /**
     * @param {number} val
     */
    #setZoomerVal(val) {
        var z = this.elements.zoomer;
        var zMin = parseFloat(z.min);
        var zMax = parseFloat(z.max);

        z.value = Math.max(zMin, Math.min(zMax, fix(val, 3))).toString();
    }

    #onZoom(ui) {
        var transform = ui.transform;
        var origin = ui.origin;

        let applyCss = () => {
            css(this.elements.preview, {
                transform: transform.toString(),
                transformOrigin: origin.toString(),
            });
        };

        this._currentZoom = ui.value;
        transform.scale = this._currentZoom;
        applyCss();

        var boundaries = this.#getVirtualBoundaries(ui.viewportRect),
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

        (debounce(() => {
            this.#updateOverlay();
        }, 500))();
    }

    /**
     * @param {HTMLImageElement} img
     */
    #replaceImage(img) {
        this.#setPreviewAttributes(img);
        this.elements.preview.parentNode.replaceChild(img, this.elements.preview);
        this.elements.preview = img;
    }

    /**
     * @param {HTMLImageElement} preview
     */
    #setPreviewAttributes(preview) {
        preview.classList.add('cr-image');
        preview.setAttribute('alt', 'preview');
        preview.setAttribute('aria-grabbed', 'false');
    }

    #isVisible() {
        return this.elements.preview.offsetParent !== null;
    }

    #updateOverlay() {
        if (!this.elements) return; // since this is debounced, it can be fired after destroy

        var boundRect = this.elements.boundary.getBoundingClientRect();
        var imgData = this.elements.preview.getBoundingClientRect();

        css(this.elements.overlay, {
            width: imgData.width + 'px',
            height: imgData.height + 'px',
            top: (imgData.top - boundRect.top) + 'px',
            left: (imgData.left - boundRect.left) + 'px'
        });
    }

    #updatePropertiesFromImage() {
        if (!this.#isVisible()) {
            return;
        }

        var transformReset = new Transform(0, 0, 1);

        var cssReset = {
            transform: transformReset.toString(),
            transformOrigin: new TransformOrigin().toString(),
        };
        css(this.elements.preview, cssReset);

        this.#updateZoomLimits();
        transformReset.scale = this._currentZoom;
        cssReset.transform = transformReset.toString();
        css(this.elements.preview, cssReset);

        this.#centerImage();
        this.#updateCenterPoint();
        this.#updateOverlay();
    }

    #updateCenterPoint() {
        var scale = this._currentZoom,
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

        var transform = Transform.parse(this.elements.preview.style.transform);
        transform.x -= adj.x;
        transform.y -= adj.y;

        css(this.elements.preview, {
            transform: transform.toString(),
            transformOrigin: center.x + 'px ' + center.y + 'px',
        });
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
        this.setZoom(this.data.boundZoom !== null ? this.data.boundZoom : defaultZoom);
    }

    #centerImage() {
        var imgDim = this.elements.preview.getBoundingClientRect(),
            vpDim = this.elements.viewport.getBoundingClientRect(),
            boundDim = this.elements.boundary.getBoundingClientRect(),
            vpLeft = vpDim.left - boundDim.left,
            vpTop = vpDim.top - boundDim.top,
            w = vpLeft - ((imgDim.width - vpDim.width) / 2),
            h = vpTop - ((imgDim.height - vpDim.height) / 2),
            transform = new Transform(w, h, this._currentZoom);

        css(this.elements.preview, {
            transform: transform.toString(),
        });
    }
}
