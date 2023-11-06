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

function debounce(func, wait, immediate) {
    var timeout;
    return function () {
        var context = this, args = arguments;
        var later = function () {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

function dispatchChange(element) {
    var event = new Event('change');
    element.dispatchEvent(event);
}

function css(el, styles, val) {
    if (typeof (styles) === 'string') {
        var tmp = styles;
        styles = {};
        styles[tmp] = val;
    }

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

function loadImage(src) {
    if (!src) { throw 'Source image missing'; }

    var img = new Image();

    return new Promise(function (resolve, reject) {
        img.onload = () => {
            resolve(img);
        };
        img.onerror = reject;
        img.src = src;
    });
}

function naturalImageDimensions(img) {
    return {
        width: img.naturalWidth,
        height: img.naturalHeight,
    };
}

export class Croppie {
    static defaults = {
        viewport: {
            width: 100,
            height: 100,
            type: 'square'
        },
        boundary: { },
        resizeControls: {
            width: true,
            height: true
        },
        customClass: '',
        showZoomer: true,
        zoomerInputClass: 'cr-slider',
        enableZoom: true,
        enableResize: false,
        mouseWheelZoom: true,
        enableKeyMovement: true,
    };

    constructor(element, opts) {
        if (element.className.indexOf('croppie-container') > -1) {
            throw new Error("Croppie: Can't initialize croppie more than once");
        }
        this.element = element;
        this.options = deepExtend(clone(Croppie.defaults), opts);

        this.#create();
    }

    bind(options) {
        var url = options.url;
        var points = options.points || [];

        this.data.bound = false;
        this.data.url = url || this.data.url;
        this.data.boundZoom = typeof(options.zoom) === 'undefined' ? null : options.zoom;

        return loadImage(url).then((img) => {
            this.#replaceImage(img);

            if (!points.length) {
                var natDim = naturalImageDimensions(img);
                var rect = this.elements.viewport.getBoundingClientRect();
                var aspectRatio = rect.width / rect.height;
                var imgAspectRatio = natDim.width / natDim.height;
                var width, height;

                if (imgAspectRatio > aspectRatio) {
                    height = natDim.height;
                    width = height * aspectRatio;
                } else {
                    width = natDim.width;
                    height = natDim.height / aspectRatio;
                }

                var x0 = (natDim.width - width) / 2;
                var y0 = (natDim.height - height) / 2;
                var x1 = x0 + width;
                var y1 = y0 + height;
                this.data.points = [x0, y0, x1, y1];
            }

            this.data.points = points.map(function (p) {
                return parseFloat(p);
            });

            this.#updatePropertiesFromImage();
            this.#triggerUpdate();
        });
    }

    get() {
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

        var max = 0;
        x1 = Math.max(max, x1 / scale);
        y1 = Math.max(max, y1 / scale);
        x2 = Math.max(max, x2 / scale);
        y2 = Math.max(max, y2 / scale);

        return {
            points: [fix(x1), fix(y1), fix(x2), fix(y2)],
            zoom: scale,
        };
    }

    result(options) {
        var RESULT_DEFAULTS = {
            type: 'base64',
            format: 'webp',
            quality: 1
        };
        var RESULT_FORMATS = ['jpeg', 'webp', 'png'];

        var data = this.get(),
            opts = deepExtend(clone(RESULT_DEFAULTS), clone(options)),
            size = opts.size || 'viewport',
            format = opts.format,
            quality = opts.quality,
            vpRect = this.elements.viewport.getBoundingClientRect(),
            ratio = vpRect.width / vpRect.height;

        if (size === 'viewport') {
            data.outputWidth = vpRect.width;
            data.outputHeight = vpRect.height;
        } else if (typeof size === 'object') {
            if (size.width && size.height) {
                data.outputWidth = size.width;
                data.outputHeight = size.height;
            } else if (size.width) {
                data.outputWidth = size.width;
                data.outputHeight = size.width / ratio;
            } else if (size.height) {
                data.outputWidth = size.height * ratio;
                data.outputHeight = size.height;
            }
        }

        if (RESULT_FORMATS.indexOf(format) > -1) {
            data.format = 'image/' + format;
            data.quality = quality;
        }

        data.url = this.data.url;

        return new Promise((resolve, reject) => {
            if (opts.type === 'rawcanvas') {
                resolve(this.#getCanvas(data));
            } else if (opts.type === 'base64') {
                resolve(this.#getBase64Result(data));
            } else if (opts.type === 'blob') {
                this.#getBlobResult(data).then(resolve);
            } else {
                reject('Invalid result type: ' + opts.type);
            }
        });
    }

    refresh() {
        this.#updatePropertiesFromImage();
        this.#triggerUpdate();
    }

    setZoom(v) {
        this.#setZoomerVal(v);
        dispatchChange(this.elements.zoomer);
    }

    destroy() {
        this.element.removeChild(this.elements.boundary);
        this.element.classList.remove('croppie-container');
        if (this.options.enableZoom) {
            this.element.removeChild(this.elements.zoomerWrap);
        }
        delete this.elements;
    }

    #create() {
        var customViewportClass = this.options.viewport.type ? 'cr-vp-' + this.options.viewport.type : null,
            boundary, img, viewport, overlay, bw, bh;

        // Properties on class
        this.data = {};
        this.elements = {};

        boundary = this.elements.boundary = document.createElement('div');
        viewport = this.elements.viewport = document.createElement('div');
        img = this.elements.img = document.createElement('img');
        overlay = this.elements.overlay = document.createElement('div');
        this.elements.preview = img;

        boundary.classList.add('cr-boundary');
        boundary.setAttribute('aria-dropeffect', 'none');
        bw = this.options.boundary.width;
        bh = this.options.boundary.height;
        css(boundary, {
            width: (bw + (isNaN(bw) ? '' : 'px')),
            height: (bh + (isNaN(bh) ? '' : 'px'))
        });

        viewport.classList.add('cr-viewport');
        if (customViewportClass) {
            viewport.classList.add(customViewportClass);
        }
        css(viewport, {
            width: this.options.viewport.width + 'px',
            height: this.options.viewport.height + 'px'
        });
        viewport.setAttribute('tabindex', 0);

        this.elements.preview.classList.add('cr-image');
        this.elements.preview.setAttribute('alt', 'preview');
        this.elements.preview.setAttribute('aria-grabbed', 'false');
        overlay.classList.add('cr-overlay');

        this.element.appendChild(boundary);
        boundary.appendChild(this.elements.preview);
        boundary.appendChild(viewport);
        boundary.appendChild(overlay);

        this.element.classList.add('croppie-container');
        if (this.options.customClass) {
            this.element.classList.add(this.options.customClass);
        }

        this.#initDraggable();

        if (this.options.enableZoom) {
            this.#initializeZoom();
        }

        if (this.options.enableResize) {
            this.#initializeResize();
        }
    }

    #getBase64Result(data) {
        return this.#getCanvas(data).toDataURL(data.format, data.quality);
    }

    #getBlobResult(data) {
        return new Promise((resolve) => {
            this.#getCanvas(data).toBlob(function (blob) {
                resolve(blob);
            }, data.format, data.quality);
        });
    }

    #getUnscaledCanvas(data) {
        var points = data.points,
            sx = num(points[0]),
            sy = num(points[1]),
            right = num(points[2]),
            bottom = num(points[3]),
            sWidth = right - sx,
            sHeight = bottom - sy;

        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext("2d");
        canvas.width = sWidth;
        canvas.height = sHeight;
        ctx.drawImage(this.elements.preview, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

        return canvas;
    }

    #getCanvas(data) {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext("2d");
        canvas.width = data.outputWidth || oc.width;
        canvas.height = data.outputHeight || oc.height;

        var oc = this.#getUnscaledCanvas(data);
        var octx = oc.getContext('2d');

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
        var isDragging = false,
            originalX,
            originalY,
            originalDistance,
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
            this.elements.boundary.setAttribute('aria-dropeffect', isDragging? 'move': 'none');
        };

        let keyMove = (movement, transform) => {
            var deltaX = movement[0],
                deltaY = movement[1],
                newCss = {};

            assignTransformCoordinates(deltaX, deltaY);

            newCss.transform = transform.toString();
            css(this.elements.preview, newCss);
            this.#updateOverlay();
            document.body.style.userSelect = '';
            this.#updateCenterPoint();
            
            this.#triggerUpdate();
            originalDistance = 0;
        }

        let mouseMove = (ev) => {
            ev.preventDefault();
            var pageX = ev.pageX,
                pageY = ev.pageY;

            if (ev.touches) {
                var touches = ev.touches[0];
                pageX = touches.pageX;
                pageY = touches.pageY;
            }

            var deltaX = pageX - originalX,
                deltaY = pageY - originalY,
                newCss = {};

            if (ev.type === 'touchmove') {
                if (ev.touches.length > 1) {
                    var touch1 = ev.touches[0];
                    var touch2 = ev.touches[1];
                    var dist = Math.sqrt((touch1.pageX - touch2.pageX) * (touch1.pageX - touch2.pageX) + (touch1.pageY - touch2.pageY) * (touch1.pageY - touch2.pageY));

                    if (!originalDistance) {
                        originalDistance = dist / this._currentZoom;
                    }

                    var scale = dist / originalDistance;

                    this.#setZoomerVal(scale);
                    dispatchChange(this.elements.zoomer);
                    return;
                }
            }

            assignTransformCoordinates(deltaX, deltaY);

            newCss.transform = transform.toString();
            css(this.elements.preview, newCss);
            this.#updateOverlay();
            originalY = pageY;
            originalX = pageX;
        };

        let mouseUp = () => {
            isDragging = false;
            toggleGrabState(isDragging);
            window.removeEventListener('mousemove', mouseMove);
            window.removeEventListener('touchmove', mouseMove);
            window.removeEventListener('mouseup', mouseUp);
            window.removeEventListener('touchend', mouseUp);
            document.body.style.userSelect = '';
            this.#updateCenterPoint();
            this.#triggerUpdate();
            originalDistance = 0;
        }

        let keyDown = (ev) => {
            var LEFT_ARROW  = 37,
                UP_ARROW    = 38,
                RIGHT_ARROW = 39,
                DOWN_ARROW  = 40;

            if (ev.shiftKey && (ev.keyCode === UP_ARROW || ev.keyCode === DOWN_ARROW)) {
                var zoom;
                if (ev.keyCode === UP_ARROW) {
                    zoom = parseFloat(this.elements.zoomer.value) + parseFloat(this.elements.zoomer.step)
                }
                else {
                    zoom = parseFloat(this.elements.zoomer.value) - parseFloat(this.elements.zoomer.step)
                }
                this.setZoom(zoom);
            } else if (this.options.enableKeyMovement && (ev.keyCode >= 37 && ev.keyCode <= 40)) {
                ev.preventDefault();
                var movement = parseKeyDown(ev.keyCode);

                transform = Transform.parse(this.elements.preview);
                document.body.style.userSelect = 'none';
                vpRect = this.elements.viewport.getBoundingClientRect();

                keyMove(movement, transform);
            }

            function parseKeyDown(key) {
                switch (key) {
                    case LEFT_ARROW:
                        return [1, 0];
                    case UP_ARROW:
                        return [0, 1];
                    case RIGHT_ARROW:
                        return [-1, 0];
                    case DOWN_ARROW:
                        return [0, -1];
                }
            }
        };

        let mouseDown = (ev) => {
            if (ev.button !== undefined && ev.button !== 0) return;

            ev.preventDefault();
            if (isDragging) return;
            isDragging = true;
            originalX = ev.pageX;
            originalY = ev.pageY;

            if (ev.touches) {
                var touches = ev.touches[0];
                originalX = touches.pageX;
                originalY = touches.pageY;
            }
            toggleGrabState(isDragging);
            transform = Transform.parse(this.elements.preview);
            window.addEventListener('mousemove', mouseMove);
            window.addEventListener('touchmove', mouseMove);
            window.addEventListener('mouseup', mouseUp);
            window.addEventListener('touchend', mouseUp);
            document.body.style.userSelect = 'none';
            vpRect = this.elements.viewport.getBoundingClientRect();
        };

        this.elements.overlay.addEventListener('mousedown', mouseDown);
        this.elements.viewport.addEventListener('keydown', keyDown);
        this.elements.overlay.addEventListener('touchstart', mouseDown);
    }

    #initializeResize () {
        var wrap = document.createElement('div');
        var isDragging = false;
        var direction;
        var originalX;
        var originalY;
        var minSize = 50;
        var maxWidth;
        var maxHeight;
        var vr;
        var hr;

        wrap.classList.add('cr-resizer');
        css(wrap, {
            width: this.options.viewport.width + 'px',
            height: this.options.viewport.height + 'px'
        });

        if (this.options.resizeControls.height) {
            vr = document.createElement('div');
            vr.classList.add('cr-resizer-vertical');
            wrap.appendChild(vr);
        }

        if (this.options.resizeControls.width) {
            hr = document.createElement('div');
            hr.classList.add('cr-resizer-horizontal');
            wrap.appendChild(hr);
        }

        let mouseMove = (ev) => {
            var pageX = ev.pageX;
            var pageY = ev.pageY;

            ev.preventDefault();

            if (ev.touches) {
                var touches = ev.touches[0];
                pageX = touches.pageX;
                pageY = touches.pageY;
            }

            var deltaX = pageX - originalX;
            var deltaY = pageY - originalY;
            var newHeight = this.options.viewport.height + deltaY;
            var newWidth = this.options.viewport.width + deltaX;

            if (direction === 'v' && newHeight >= minSize && newHeight <= maxHeight) {
                css(wrap, {
                    height: newHeight + 'px'
                });

                this.options.boundary.height += deltaY;
                css(this.elements.boundary, {
                    height: this.options.boundary.height + 'px'
                });

                this.options.viewport.height += deltaY;
                css(this.elements.viewport, {
                    height: this.options.viewport.height + 'px'
                });
            } else if (direction === 'h' && newWidth >= minSize && newWidth <= maxWidth) {
                css(wrap, {
                    width: newWidth + 'px'
                });

                this.options.boundary.width += deltaX;
                css(this.elements.boundary, {
                    width: this.options.boundary.width + 'px'
                });

                this.options.viewport.width += deltaX;
                css(this.elements.viewport, {
                    width: this.options.viewport.width + 'px'
                });
            }

            this.#updateOverlay();
            this.#updateZoomLimits();
            this.#updateCenterPoint();
            this.#triggerUpdate();
            originalY = pageY;
            originalX = pageX;
        };

        let mouseDown = (ev) => {
            if (ev.button !== undefined && ev.button !== 0) return;

            ev.preventDefault();
            if (isDragging) {
                return;
            }

            var overlayRect = this.elements.overlay.getBoundingClientRect();

            isDragging = true;
            originalX = ev.pageX;
            originalY = ev.pageY;
            direction = ev.currentTarget.className.indexOf('vertical') !== -1 ? 'v' : 'h';
            maxWidth = overlayRect.width;
            maxHeight = overlayRect.height;

            if (ev.touches) {
                var touches = ev.touches[0];
                originalX = touches.pageX;
                originalY = touches.pageY;
            }

            window.addEventListener('mousemove', mouseMove);
            window.addEventListener('touchmove', mouseMove);
            window.addEventListener('mouseup', mouseUp);
            window.addEventListener('touchend', mouseUp);
            document.body.style.userSelect = 'none';
        };

        function mouseUp() {
            isDragging = false;
            window.removeEventListener('mousemove', mouseMove);
            window.removeEventListener('touchmove', mouseMove);
            window.removeEventListener('mouseup', mouseUp);
            window.removeEventListener('touchend', mouseUp);
            document.body.style.userSelect = '';
        }

        if (vr) {
            vr.addEventListener('mousedown', mouseDown);
            vr.addEventListener('touchstart', mouseDown);
        }

        if (hr) {
            hr.addEventListener('mousedown', mouseDown);
            hr.addEventListener('touchstart', mouseDown);
        }

        this.elements.boundary.appendChild(wrap);
    }

    #initializeZoom() {
        var wrap = this.elements.zoomerWrap = document.createElement('div'),
            zoomer = this.elements.zoomer = document.createElement('input');

        wrap.classList.add('cr-slider-wrap');
        wrap.style.width = this.elements.boundary.style.width;
        zoomer.classList.add(this.options.zoomerInputClass);
        zoomer.type = 'range';
        zoomer.step = '0.0001';
        zoomer.value = '1';
        zoomer.style.display = this.options.showZoomer ? '' : 'none';
        zoomer.setAttribute('aria-label', 'zoom');

        this.element.appendChild(wrap);
        wrap.appendChild(zoomer);

        this._currentZoom = 1;

        let change = () => {
            this.#onZoom({
                value: parseFloat(zoomer.value),
                origin: new TransformOrigin(this.elements.preview),
                viewportRect: this.elements.viewport.getBoundingClientRect(),
                transform: Transform.parse(this.elements.preview)
            });
        };

        let scroll = (ev) => {
            var delta, targetZoom;

            if (this.options.mouseWheelZoom === 'ctrl' && ev.ctrlKey !== true){
              return 0;
            } else if (ev.wheelDelta) {
                delta = ev.wheelDelta / 1200; //wheelDelta min: -120 max: 120 // max x 10 x 2
            } else if (ev.deltaY) {
                delta = ev.deltaY / 1060; //deltaY min: -53 max: 53 // max x 10 x 2
            } else if (ev.detail) {
                delta = ev.detail / -60; //delta min: -3 max: 3 // max x 10 x 2
            } else {
                delta = 0;
            }

            targetZoom = this._currentZoom + (delta * this._currentZoom);

            ev.preventDefault();
            this.#setZoomerVal(targetZoom);
            change();
        };

        this.elements.zoomer.addEventListener('input', change); // this is being fired twice on keypress
        this.elements.zoomer.addEventListener('change', change);

        if (this.options.mouseWheelZoom) {
            this.elements.boundary.addEventListener('mousewheel', scroll);
            this.elements.boundary.addEventListener('DOMMouseScroll', scroll);
        }
    }

    #setZoomerVal(v) {
        if (this.options.enableZoom) {
            var z = this.elements.zoomer,
                val = fix(v, 4);

            z.value = Math.max(parseFloat(z.min), Math.min(parseFloat(z.max), val)).toString();
        }
    }

    #onZoom(ui) {
        var transform = ui ? ui.transform : Transform.parse(this.elements.preview),
            vpRect = ui ? ui.viewportRect : this.elements.viewport.getBoundingClientRect(),
            origin = ui ? ui.origin : new TransformOrigin(this.elements.preview);

        let applyCss = () => {
            var transCss = {};
            transCss.transform = transform.toString();
            transCss.transformOrigin = origin.toString();
            css(this.elements.preview, transCss);
        };

        this._currentZoom = ui ? ui.value : this._currentZoom;
        transform.scale = this._currentZoom;
        this.elements.zoomer.setAttribute('aria-valuenow', this._currentZoom);
        applyCss();

        var boundaries = this.#getVirtualBoundaries(vpRect),
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

        this.#triggerUpdate();
    }

    #replaceImage(img) {
        if (this.elements.img.parentNode) {
            Array.prototype.forEach.call(this.elements.img.classList, function(c) { img.classList.add(c); });
            this.elements.img.parentNode.replaceChild(img, this.elements.img);
            this.elements.preview = img; // if the img is attached to the DOM, they're not using the canvas
        }
        this.elements.img = img;
    }

    #triggerUpdate() {
        var data = this.get();

        if (!this.#isVisible()) {
            return;
        }

        var ev = new CustomEvent('update', { detail: data });
        this.element.dispatchEvent(ev);
    }

    #isVisible() {
        return this.elements.preview.offsetHeight > 0 && this.elements.preview.offsetWidth > 0;
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
        var initialZoom = 1,
            cssReset = {},
            img = this.elements.preview,
            imgData,
            transformReset = new Transform(0, 0, initialZoom),
            originReset = new TransformOrigin();

        if (!this.#isVisible() || this.data.bound) {// if the croppie isn't visible or it doesn't need binding
            return;
        }

        this.data.bound = true;
        cssReset.transform = transformReset.toString();
        cssReset.transformOrigin = originReset.toString();
        cssReset['opacity'] = 1;
        css(img, cssReset);

        imgData = this.elements.preview.getBoundingClientRect();

        this._originalImageWidth = imgData.width;
        this._originalImageHeight = imgData.height;

        if (this.options.enableZoom) {
            this.#updateZoomLimits(true);
        } else {
            this._currentZoom = initialZoom;
        }

        transformReset.scale = this._currentZoom;
        cssReset.transform = transformReset.toString();
        css(img, cssReset);

        if (this.data.points.length) {
            this.#bindPoints(this.data.points);
        } else {
            this.#centerImage();
        }

        this.#updateCenterPoint();
        this.#updateOverlay();
    }

    #updateCenterPoint() {
        var scale = this._currentZoom,
            data = this.elements.preview.getBoundingClientRect(),
            vpData = this.elements.viewport.getBoundingClientRect(),
            transform = Transform.parse(this.elements.preview.style.transform),
            pc = new TransformOrigin(this.elements.preview),
            top = (vpData.top - data.top) + (vpData.height / 2),
            left = (vpData.left - data.left) + (vpData.width / 2),
            center = {},
            adj = {};

        center.y = top / scale;
        center.x = left / scale;

        adj.y = (center.y - pc.y) * (1 - scale);
        adj.x = (center.x - pc.x) * (1 - scale);

        transform.x -= adj.x;
        transform.y -= adj.y;

        var newCss = {};
        newCss.transformOrigin = center.x + 'px ' + center.y + 'px';
        newCss.transform = transform.toString();
        css(this.elements.preview, newCss);
    }

    #updateZoomLimits(initial) {
        var maxZoom = 1,
            initialZoom,
            defaultInitialZoom,
            zoomer = this.elements.zoomer,
            scale = parseFloat(zoomer.value),
            boundaryData = this.elements.boundary.getBoundingClientRect(),
            imgData = naturalImageDimensions(this.elements.img),
            vpData = this.elements.viewport.getBoundingClientRect(),
            minW = vpData.width / imgData.width,
            minH = vpData.height / imgData.height,
            minZoom = Math.max(minW, minH);

        if (minZoom >= maxZoom) {
            maxZoom += minZoom;
        }

        zoomer.min = fix(minZoom, 4);
        zoomer.max = fix(maxZoom, 4);

        if (!initial && (scale < zoomer.min || scale > zoomer.max)) {
            this.#setZoomerVal(scale < zoomer.min ? zoomer.min : zoomer.ma);
        } else if (initial) {
            defaultInitialZoom = Math.max((boundaryData.width / imgData.width), (boundaryData.height / imgData.height));
            initialZoom = this.data.boundZoom !== null ? this.data.boundZoom : defaultInitialZoom;
            this.#setZoomerVal(initialZoom);
        }

        dispatchChange(zoomer);
    }

    #bindPoints(points) {
        if (points.length !== 4) {
            throw "Croppie - Invalid number of points supplied: " + points;
        }

        var pointsWidth = points[2] - points[0],
            vpData = this.elements.viewport.getBoundingClientRect(),
            boundRect = this.elements.boundary.getBoundingClientRect(),
            vpOffset = {
                left: vpData.left - boundRect.left,
                top: vpData.top - boundRect.top
            },
            scale = vpData.width / pointsWidth,
            originTop = points[1],
            originLeft = points[0],
            transformTop = (-1 * points[1]) + vpOffset.top,
            transformLeft = (-1 * points[0]) + vpOffset.left,
            newCss = {};

        newCss.transformOrigin = originLeft + 'px ' + originTop + 'px';
        newCss.transform = new Transform(transformLeft, transformTop, scale).toString();
        css(this.elements.preview, newCss);

        this.#setZoomerVal(scale);
        this._currentZoom = scale;
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

        css(this.elements.preview, 'transform', transform.toString());
    }
}
